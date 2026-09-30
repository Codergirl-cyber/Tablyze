export type AgentEvidence = {
  finding: string;
  source: string;
  value: unknown;
};

export type InvestigateResponse = {
  question: string;
  answer: string;
  evidence: AgentEvidence[];
  tools_used: string[];
};

export type AgentErrorCode =
  | "no_dataset"
  | "invalid_question"
  | "llm_unavailable"
  | "agent_failure"
  | "tool_failure"
  | "unknown";

export class InvestigateError extends Error {
  readonly code: AgentErrorCode;

  constructor(message: string, code: AgentErrorCode) {
    super(message);
    this.name = "InvestigateError";
    this.code = code;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  no_dataset:
    "No dataset is loaded on the server. Upload your CSV again, then investigate.",
  invalid_question: "Enter a question before investigating.",
  llm_unavailable:
    "The analysis assistant is unavailable. Start Ollama locally (or configure your LLM provider) and try again.",
  agent_failure: "The investigation could not be completed. Please try again.",
  tool_failure:
    "A dataset analysis step failed during investigation. Try a narrower question or re-upload your CSV.",
};

function normalizeErrorCode(raw: unknown): AgentErrorCode {
  const code = typeof raw === "string" ? raw : "unknown";
  if (
    code === "no_dataset" ||
    code === "invalid_question" ||
    code === "llm_unavailable" ||
    code === "agent_failure" ||
    code === "tool_failure"
  ) {
    return code;
  }
  return "unknown";
}

function messageForCode(code: AgentErrorCode): string {
  if (code !== "unknown" && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  return "Something went wrong while investigating the dataset. Please try again.";
}

function parseSuccessPayload(data: unknown): InvestigateResponse {
  if (!data || typeof data !== "object") {
    throw new InvestigateError("Invalid response from the server.", "unknown");
  }
  const record = data as Record<string, unknown>;
  const question = record.question;
  const answer = record.answer;
  if (typeof question !== "string" || typeof answer !== "string") {
    throw new InvestigateError("Invalid response from the server.", "unknown");
  }

  const evidenceRaw = record.evidence;
  const evidence: AgentEvidence[] = Array.isArray(evidenceRaw)
    ? evidenceRaw
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object"
        )
        .map((item) => ({
          finding: String(item.finding ?? ""),
          source: String(item.source ?? ""),
          value: item.value,
        }))
        .filter((item) => item.finding && item.source)
    : [];

  const toolsRaw = record.tools_used;
  const tools_used = Array.isArray(toolsRaw)
    ? toolsRaw.filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];

  return {
    question,
    answer,
    evidence,
    tools_used,
  };
}

export async function investigateDataset(question: string): Promise<InvestigateResponse> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new InvestigateError(ERROR_MESSAGES.invalid_question, "invalid_question");
  }

  let response: Response;
  try {
    response = await fetch("/api/agent/investigate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: trimmed }),
    });
  } catch {
    throw new InvestigateError(
      "Unable to reach the investigation service. Check your network and try again.",
      "unknown"
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new InvestigateError("Invalid response from the server.", "unknown");
  }

  if (!response.ok) {
    const record =
      data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const code = normalizeErrorCode(record.code);
    throw new InvestigateError(messageForCode(code), code);
  }

  return parseSuccessPayload(data);
}

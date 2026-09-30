import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON.", code: "invalid_question" },
        { status: 400 }
      );
    }

    const question =
      parsed &&
      typeof parsed === "object" &&
      "question" in parsed &&
      typeof (parsed as { question: unknown }).question === "string"
        ? (parsed as { question: string }).question.trim()
        : "";

    if (!question) {
      return NextResponse.json(
        { error: "Question must not be empty.", code: "invalid_question" },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8000";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(`${backendUrl}/api/agent/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const responseText = await upstreamResponse.text();

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: upstreamResponse.status });
    } catch {
      console.error(
        "[Agent Proxy] Upstream response is not valid JSON:",
        responseText.substring(0, 200)
      );
      return NextResponse.json(
        {
          error: "The investigation service returned an invalid response.",
          code: "agent_failure",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[Agent Proxy] Error:", error);
    return NextResponse.json(
      {
        error: "Unable to reach the investigation service. Please try again.",
        code: "agent_failure",
      },
      { status: 502 }
    );
  }
}

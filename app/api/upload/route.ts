import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        { error: "No CSV file was provided for upload." },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8000";

    const backendFormData = new FormData();
    backendFormData.append("file", uploadedFile, uploadedFile.name);

    const upstreamResponse = await fetch(`${backendUrl}/upload`, {
      method: "POST",
      body: backendFormData,
    });

    const responseText = await upstreamResponse.text();

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data, { status: upstreamResponse.status });
    } catch {
      return new NextResponse(responseText, {
        status: upstreamResponse.status,
        headers: {
          "content-type": "application/json",
        },
      });
    }
  } catch (error) {
    console.error("Upload proxy error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to proxy the upload request to the backend.",
      },
      { status: 502 }
    );
  }
}

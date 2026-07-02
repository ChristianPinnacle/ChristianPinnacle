import { NextRequest, NextResponse } from "next/server";
import { runAnalysis } from "@/lib/analyzers";
import type { AnalyzeRequest, InputType } from "@/lib/types";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const input = body.input?.trim();

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    if (input.length > 10000) {
      return NextResponse.json({ error: "Input exceeds 10,000 character limit" }, { status: 400 });
    }

    const type = (body.type ?? "auto") as InputType;
    const report = await runAnalysis(input, type);

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

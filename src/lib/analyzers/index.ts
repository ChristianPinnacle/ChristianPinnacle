import type { AnalysisReport, InputType } from "@/lib/types";
import { detectInputType } from "@/lib/analyzers/detect";
import { analyzeUrl } from "@/lib/analyzers/url";
import { analyzeSocial } from "@/lib/analyzers/social";
import { analyzeApp } from "@/lib/analyzers/app";
import { analyzeBusiness } from "@/lib/analyzers/business";
import { analyzeInstagramProfile } from "@/lib/analyzers/analyze-instagram-profile";

export async function runAnalysis(input: string, type: InputType = "auto"): Promise<AnalysisReport> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Input is required");
  }

  const detectedType = type === "auto" ? detectInputType(trimmed) : type;

  let report: AnalysisReport;
  switch (detectedType) {
    case "url":
      report = await analyzeUrl(trimmed);
      break;
    case "social":
      report = analyzeSocial(trimmed);
      break;
    case "app":
      report = await analyzeApp(trimmed);
      break;
    case "business":
      report = analyzeBusiness(trimmed);
      break;
    case "instagram_profile":
      report = await analyzeInstagramProfile(trimmed);
      break;
    default:
      report = analyzeBusiness(trimmed);
  }

  if (type === "auto") {
    report.detectedType = detectedType;
  }

  return report;
}

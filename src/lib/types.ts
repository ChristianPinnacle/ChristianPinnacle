export type InputType = "url" | "social" | "app" | "business" | "instagram_profile" | "auto";

export type AnalysisCategory =
  | "overview"
  | "seo"
  | "marketing"
  | "technical"
  | "content"
  | "engagement"
  | "aso"
  | "strategy"
  | "recommendations";

export interface ScoreMetric {
  label: string;
  score: number;
  maxScore?: number;
  description: string;
}

export interface AnalysisSection {
  id: string;
  title: string;
  category: AnalysisCategory;
  summary: string;
  details: string[];
  metrics?: { label: string; value: string }[];
  highlights?: { type: "positive" | "negative" | "neutral"; text: string }[];
  solutions?: CopySolution[];
}

/** Ready-to-paste copy fix tied to the analyzed product */
export interface CopySolution {
  label: string;
  priority: "high" | "medium" | "low";
  problem: string;
  placement: string;
  copy: string;
}

export interface AnalysisReport {
  id: string;
  inputType: InputType;
  detectedType: InputType;
  title: string;
  subtitle: string;
  analyzedAt: string;
  input: string;
  overallScore: number;
  scores: ScoreMetric[];
  sections: AnalysisSection[];
  actionItems: { priority: "high" | "medium" | "low"; action: string }[];
  solutions?: CopySolution[];
}

export interface AnalyzeRequest {
  input: string;
  type?: InputType;
}

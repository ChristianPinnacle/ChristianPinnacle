export type InputType = "url" | "social" | "app" | "business" | "auto";

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
}

export interface AnalyzeRequest {
  input: string;
  type?: InputType;
}

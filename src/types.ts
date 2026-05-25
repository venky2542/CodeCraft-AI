export interface Vulnerability {
  severity: "High" | "Medium" | "Low" | string;
  pattern: string;
  description: string;
  line: string;
  recommendation: string;
}

export interface Optimization {
  category: "Performance" | "Code Smell" | "Formatting" | string;
  issue: string;
  suggestion: string;
  benefit: string;
}

export interface ReviewReport {
  summary: string;
  vulnerabilities?: Vulnerability[];
  optimizations?: Optimization[];
  refactoredCode: string;
  explanation: string;
}

export interface ReviewResult {
  reviewer: string;
  watsonx_active: boolean;
  code_length: number;
  fileName: string;
  language: string;
  report: ReviewReport;
}

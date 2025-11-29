export enum AnalysisType {
  GRAMMAR = 'GRAMMAR',
  CLARITY = 'CLARITY',
  SOURCES = 'SOURCES',
  SUMMARY = 'SUMMARY',
  AI_CHECK = 'AI_CHECK'
}

export interface Suggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  explanation: string;
  type: 'Grammar' | 'Spelling' | 'Style' | 'Clarity';
  severity: 'Critical' | 'Major' | 'Minor';
}

export interface SourceMatch {
  url: string;
  title: string;
  snippet?: string;
}

export interface VerificationResult {
  id: string;
  claim: string;
  status: 'Verified' | 'Questionable' | 'False' | 'Unverifiable';
  explanation: string;
  sources: SourceMatch[];
}

export interface AiDetectionResult {
  score: number; // 0 to 100
  label: 'Likely Human' | 'Mixed Signals' | 'Likely AI-Generated';
  explanation: string;
}

export interface AnalysisState {
  isAnalyzing: boolean;
  suggestions: Suggestion[];
  sources: SourceMatch[];
  claimVerification: VerificationResult[];
  summary: string | null;
  aiDetection: AiDetectionResult | null;
  error: string | null;
}

export interface DocumentState {
  text: string;
  title: string;
}

export interface PatentAnalysis {
  title: string;
  patentNumber: string;
  inventors: string[];
  abstract: string;
  keyComponents: string[];
  structuralDescription: string;
  coreInnovation: string;
  visualPrompt: string;
}

export interface LegalAnalysis {
  protectedParts: string[];
  unprotectedParts: string[];
  riskAssessment: string;
}

export interface AppState {
  file: File | null;
  pdfImages: string[]; // All extracted pages
  figureIndices: number[]; // Indices of pages that are actually figures
  analysis: PatentAnalysis | null;
  legalAnalysis: LegalAnalysis | null; // New parallel analysis state
  videoUrl: string | null;
  isAnalyzing: boolean;
  isLegalAnalyzing: boolean; // Loading state for legal
  isVideoGenerating: boolean;
  error: string | null;
  isVeoKeySelected: boolean;
  
  // Meshy Integration
  meshyApiKey: string;
  isMeshyGenerating: boolean;
  meshyModelUrl: string | null;
}

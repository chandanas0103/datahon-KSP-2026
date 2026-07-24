export interface RelatedCase {
  id: string;
  firNumber: string;
  crimeType: string;
  stationArea: string;
  incidentDate: string;
  status: string;
  accusedName?: string | null;
  victimName?: string | null;
  similarityScore: number;
  matchReason: string;
  matchingFactors: string[];
}

export interface TacticalRecommendation {
  id: string;
  type: 'patrol' | 'assign_officer' | 'reopen_fir' | 'monitor_suspect' | 'deploy_force';
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium';
  stationArea: string;
  actionableStep: string;
}

export interface InvestigationSummary {
  summary: string;
  keyFindings: string[];
  crimeTrends: string[];
  operationalInsights: string[];
  potentialRisks: string[];
  recommendations: TacticalRecommendation[];
  relatedCases: RelatedCase[];
}

export interface ExtractedFIRDetails {
  firNumber: string;
  crimeType: string;
  stationName: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  complainantName: string;
  victimName?: string;
  accusedName?: string;
  suggestedIPCSections: string[];
  briefFacts: string;
}

export interface CatalystCircuitWorkflowState {
  circuitId: string;
  executionId: string;
  status: 'SUCCESS' | 'RUNNING' | 'FAILED';
  currentStage: string;
  outputs: Record<string, unknown>;
}

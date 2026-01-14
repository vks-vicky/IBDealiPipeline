export type DealStage =
  | 'Prospect'
  | 'UnderEvaluation'
  | 'TermSheetSubmitted'
  | 'Closed'
  | 'Lost';

export interface DealNote {
  userId: string;
  note: string;
  timestamp: string;
}

export interface Deal {
  id: string;
  clientName: string;
  dealType: string;
  sector: string;
  summary: string;
  dealValue?: number;   // ADMIN only
  currentStage: DealStage;
  notes: DealNote[];
  createdAt: string;
  updatedAt: string;
}

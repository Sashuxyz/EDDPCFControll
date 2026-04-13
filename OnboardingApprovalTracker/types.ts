export interface ApprovalStepDef {
  key: string;
  label: string;
  shortLabel: string;
  transitionType: number;
}

export type StepStatus = 'completed' | 'active' | 'upcoming';

export interface ApprovalStep extends ApprovalStepDef {
  status: StepStatus;
  approverName?: string;
  approvedOn?: Date;
  recordId?: string;
}

export interface ApprovalRound {
  roundNumber: number;
  steps: ApprovalStep[];
  sentBack?: {
    by: string;
    byRecordId: string;
    on: Date;
  };
  isCurrent: boolean;
}

export interface TimelineEvent {
  type: 'approval' | 'sentBack' | 'awaiting';
  step: ApprovalStepDef;
  approverName?: string;
  recordId?: string;
  occurredOn?: Date;
  roundNumber: number;
}

export interface ExtractedRecord {
  recordId: string;
  transitionType: number | null;
  currentStatus: number | null;
  approverName: string | null;
  approverId: string | null;
  occurredOn: Date | null;
}

export const STEP_DEFS: Record<string, ApprovalStepDef> = {
  rm:         { key: 'rm',         label: 'RM approval',  shortLabel: 'RM',     transitionType: 1 },
  sh:         { key: 'sh',         label: 'Segment Head', shortLabel: 'SH',     transitionType: 2 },
  compliance: { key: 'compliance', label: 'Compliance',   shortLabel: 'Compl.', transitionType: 3 },
  bab:        { key: 'bab',        label: 'BAB',          shortLabel: 'BAB',    transitionType: 4 },
};

export const STEP_MAP: Record<number, string[]> = {
  1: ['rm'],
  2: ['rm', 'sh'],
  3: ['rm', 'sh', 'compliance'],
  4: ['rm', 'sh', 'compliance', 'bab'],
  5: ['rm', 'sh', 'bab'],
};

export const SEND_BACK_TRANSITION_TYPE = 5;
export const SEND_BACK_STATUS_FRONT_INPUT_REQUIRED = 13;

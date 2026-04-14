// NpOnboardingChecklist/utils.ts

import { CheckResults, CheckState, AnswerValue } from './types';

/** Parse the raw JSON string from the checkResults field. Returns null on empty or invalid. */
export function parseCheckResults(raw: string | null | undefined): Partial<CheckResults> | null {
  if (!raw || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as Partial<CheckResults>;
  } catch {
    return null;
  }
}

/** Serialize current state to the CheckResults JSON structure. */
export function serializeCheckResults(
  state: Pick<CheckState, 'answers' | 'mismatches' | 'manualNotDone'>,
  summary: import('./types').CheckSummary
): string {
  const results: CheckResults = {
    answers: { ...state.answers } as Record<string, AnswerValue>,
    mismatches: { ...state.mismatches },
    manualNotDone: { ...state.manualNotDone },
    summary,
  };
  return JSON.stringify(results);
}

/** Format a D365 date string to DD.MM.YYYY (de-CH). Returns empty string on null/invalid. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-CH');
  } catch {
    return '';
  }
}

/** Resolve the Service Request record ID from PCF context with Xrm.Page fallback. */
export function resolveSrId(context: ComponentFramework.Context<any>): string | null {
  try {
    const info = (context.mode as any).contextInfo;
    if (info?.entityId && typeof info.entityId === 'string' && info.entityId.length > 10) {
      return info.entityId.replace(/[{}]/g, '');
    }
  } catch { /* ignore */ }
  try {
    const xrm = (window as any).Xrm;
    const id = xrm?.Page?.data?.entity?.getId?.();
    if (id && typeof id === 'string') return id.replace(/[{}]/g, '');
  } catch { /* ignore */ }
  return null;
}

/** Return the D365 WebAPI base URL. */
export function apiBase(): string {
  return `${window.location.origin}/api/data/v9.2`;
}

/** Build an empty default CrmValues object. */
export function emptyCrmValues(): import('./types').CrmValues {
  return {
    dateOfBirth: '',
    nationalities: '',
    relationshipManager: '',
    riskLevel: '',
    pepStatus: '',
    clientSegment: '',
    referenceCurrency: '',
    specialConditions: '',
    aiaReporting: '',
  };
}

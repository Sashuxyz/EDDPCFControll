import * as React from 'react';

export interface SubFieldConfig {
  jsonKey: string;
  targetParam: string;
  label: string;
}

export interface SectionConfig {
  jsonKey: string;
  summaryKey: string | null;
  targetParam: string;
  label: string;
  iconPath: string;
  subFields?: SubFieldConfig[];
}

export interface ParsedSection {
  text: string | null;
  subFieldValues: Record<string, string>;
}

export interface TakeoverState {
  takenOver: Set<string>;
  outputValues: Record<string, unknown>;
}

export const icons = {
  person: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z',
  wallet: 'M2 4a2 2 0 012-2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4zM2 10h20',
  people: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 3a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  badge: 'M2 3a2 2 0 012-2h16a2 2 0 012 2v18H2V3zM8 7h8M8 11h8M8 15h4',
  link: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  check: 'M20 6L9 17l-5-5',
  grid: 'M3 3h18v18H3V3zM3 9h18M9 3v18',
};

export const SECTION_CONFIGS: SectionConfig[] = [
  {
    jsonKey: 'professionalBackground',
    summaryKey: 'professionalBackgroundSummary',
    targetParam: 'professionalBackground',
    label: 'Professional Background',
    iconPath: icons.person,
  },
  {
    jsonKey: 'financialSituation',
    summaryKey: 'financialSituationSummary',
    targetParam: 'financialSituation',
    label: 'Financial Situation',
    iconPath: icons.wallet,
    subFields: [
      {
        jsonKey: 'estimatedTotalWealthCHF',
        targetParam: 'estimatedTotalWealth',
        label: 'Est. Wealth',
      },
    ],
  },
  {
    jsonKey: 'relatedParties',
    summaryKey: 'relatedPartiesSummary',
    targetParam: 'relatedParties',
    label: 'Related Parties',
    iconPath: icons.people,
  },
  {
    jsonKey: 'sanctionCheck',
    summaryKey: 'sanctionCheckSummary',
    targetParam: 'sanctionCheck',
    label: 'Sanction Check',
    iconPath: icons.shield,
  },
  {
    jsonKey: 'reputationalRisk',
    summaryKey: 'reputationalRiskSummary',
    targetParam: 'reputationalRisk',
    label: 'Reputational Risk',
    iconPath: icons.warning,
  },
  {
    jsonKey: 'pep',
    summaryKey: 'pepSummary',
    targetParam: 'pep',
    label: 'PEP Status',
    iconPath: icons.badge,
  },
  {
    jsonKey: 'sources',
    summaryKey: null,
    targetParam: 'sources',
    label: 'Sources',
    iconPath: icons.link,
  },
];

export function formatCHF(value: number): string {
  const rounded = Math.round(value);
  const str = rounded.toString();
  const parts: string[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }
  return parts.join("'");
}

export function isValidNumber(val: string): boolean {
  const cleaned = val.replace(/[',\s]/g, '');
  const num = parseFloat(cleaned);
  return isFinite(num) && num >= 0;
}

export function parseWealthValue(val: string): number {
  const cleaned = val.replace(/[',\s]/g, '');
  return parseFloat(cleaned);
}

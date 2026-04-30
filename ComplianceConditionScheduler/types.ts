export type FrequencyType = 'One-off' | 'Recurring' | null;
export type StartTypeValue = 'Fixed' | 'Relative' | 'Periodic review' | null;
export type StatusType = 'Draft' | 'Active' | 'Completed';

export const FREQUENCY_MAP: Record<number, FrequencyType> = { 1: 'One-off', 2: 'Recurring' };
export const FREQUENCY_REVERSE: Record<string, number> = { 'One-off': 1, 'Recurring': 2 };
export const START_TYPE_MAP: Record<number, StartTypeValue> = { 1: 'Fixed', 2: 'Relative', 3: 'Periodic review' };
export const START_TYPE_REVERSE: Record<string, number> = { 'Fixed': 1, 'Relative': 2, 'Periodic review': 3 };
export const STATUS_MAP: Record<number, StatusType> = { 1: 'Draft', 100000002: 'Active', 2: 'Completed' };
export const STATUS_REVERSE: Record<string, number> = { 'Draft': 1, 'Active': 100000002, 'Completed': 2 };

export interface SchedulerState {
  frequency: FrequencyType;
  startType: StartTypeValue;
  relativeDays: number | null;
  recurrenceInterval: number | null;
  leadTime: number;
  dueDate: string | null;
  anchorDate: string | null;
  status: StatusType;
}

export const icons = {
  oneOff: 'M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM8 3a5 5 0 100 10A5 5 0 008 3zm.5 2v3.3l2.1 1.25-.5.85L7.5 8.75V5h1z',
  recurring: 'M8 1.5A6.5 6.5 0 0114.5 8h-1.2A5.3 5.3 0 008 2.7 5.3 5.3 0 002.7 8 5.3 5.3 0 008 13.3a5.28 5.28 0 004.15-2.03l.93.73A6.48 6.48 0 018 14.5 6.5 6.5 0 011.5 8 6.5 6.5 0 018 1.5zm4 0v3.5h-1.2V3.56L9.1 5.27l-.7-.85 2.04-1.72H8.5V1.5H12z',
  calendar: 'M5.5 1v1.5h5V1H12v1.5h1.5A1.5 1.5 0 0115 4v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 13V4a1.5 1.5 0 011.5-1.5H4V1h1.5zM13.5 7h-11v6h11V7zm-11-2.5V6h11V4.5h-11z',
  relative: 'M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM8 3a5 5 0 100 10A5 5 0 008 3zm-.5 2h1v3h2.5v1H7.5V5z',
  pending: 'M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM8 4a4 4 0 100 8 4 4 0 000-8zm-.25 1.5h.75v2.75l2 1.19-.38.64-2.37-1.42V5.5z',
  reset: 'M2.5 8A5.5 5.5 0 018 2.5c1.58 0 3 .67 4.01 1.73L13 3v4H9l1.3-1.3A3.98 3.98 0 008 4a4 4 0 104 4h1.5A5.5 5.5 0 018 13.5 5.5 5.5 0 012.5 8z',
  periodicReview: 'M13.5 8A5.5 5.5 0 018 13.5 5.5 5.5 0 012.5 8 5.5 5.5 0 018 2.5V1L11 3.5 8 6V4a4 4 0 100 8 4 4 0 004-4h1.5z',
};

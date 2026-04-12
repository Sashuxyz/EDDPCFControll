import * as React from 'react';
import { SchedulerState, icons } from '../types';
import { formatDate, addDays, intervalLabel } from '../utils/dateUtils';
import { summaryStyles, badgeStyles, C } from '../styles/tokens';

interface ScheduleSummaryProps {
  state: SchedulerState;
  calculatedDueDate: string | null;
  nextRecurrence: string | null;
  taskStartDate: string | null;
}

export const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({
  state,
  calculatedDueDate,
  nextRecurrence,
  taskStartDate,
}) => {
  const PendingBadge: React.FC<{ text?: string }> = ({ text = 'Pending' }) => (
    <span style={badgeStyles.pending}>
      <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
        <path d={icons.pending} fill={C.amber} />
      </svg>
      {text}
    </span>
  );

  const SummaryRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
      <div style={summaryStyles.rowLabel}>{label}</div>
      <div style={summaryStyles.rowValue}>{children}</div>
    </div>
  );

  // Timeline
  const timelinePoints: Array<{ label: string; date: string; color: string; pos: number }> = [];
  if (state.anchorDate && state.startType === 'Relative') {
    timelinePoints.push({ label: 'Anchor', date: state.anchorDate, color: C.n60, pos: 5 });
  }
  if (taskStartDate) {
    timelinePoints.push({ label: 'Task visible', date: taskStartDate, color: C.brand, pos: state.anchorDate ? 30 : 10 });
  }
  if (calculatedDueDate) {
    timelinePoints.push({ label: 'Due date', date: calculatedDueDate, color: C.red, pos: state.anchorDate ? 62 : 55 });
  }
  if (nextRecurrence) {
    timelinePoints.push({ label: 'Next cycle', date: nextRecurrence, color: C.green, pos: 92 });
  }

  return (
    <div style={summaryStyles.panel}>
      <div style={summaryStyles.header}>Schedule summary</div>
      <div style={summaryStyles.grid}>
        {state.startType === 'Relative' && (
          <SummaryRow label="Anchor date">
            {state.anchorDate ? formatDate(state.anchorDate) : <PendingBadge text="Awaiting approval" />}
          </SummaryRow>
        )}
        <SummaryRow label={state.frequency === 'Recurring' ? 'First due date' : 'Due date'}>
          {calculatedDueDate ? formatDate(calculatedDueDate) : (
            state.startType === 'Relative'
              ? <span style={summaryStyles.pending}>Approval + {state.relativeDays ?? '?'} days</span>
              : <span style={summaryStyles.pending}>Set a date above</span>
          )}
        </SummaryRow>
        <SummaryRow label="Task appears">
          {taskStartDate ? formatDate(taskStartDate) : <span style={summaryStyles.pending}>{state.leadTime} days before due</span>}
        </SummaryRow>
        {state.frequency === 'Recurring' && state.recurrenceInterval && (
          <SummaryRow label="Repeats">{intervalLabel(state.recurrenceInterval)}</SummaryRow>
        )}
        {state.frequency === 'Recurring' && nextRecurrence && (
          <SummaryRow label="Next cycle due">{formatDate(nextRecurrence)}</SummaryRow>
        )}
      </div>

      {timelinePoints.length > 0 && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${C.n30}` }}>
          <svg width="100%" height="58" viewBox="0 0 500 58" preserveAspectRatio="xMidYMid meet">
            <line x1="10" y1="16" x2="490" y2="16" stroke={C.n30} strokeWidth="3" strokeLinecap="round" />
            {timelinePoints.map((p, i) => {
              const x = 10 + (480 * p.pos / 100);
              return (
                <g key={i}>
                  <circle cx={x} cy={16} r={6.5} fill={p.color} stroke={C.white} strokeWidth={2.5} />
                  <text x={x} y={36} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={C.n80} fontFamily="Segoe UI, sans-serif">{p.label}</text>
                  <text x={x} y={49} textAnchor="middle" fontSize="10" fontWeight="500" fill={C.n60} fontFamily="Segoe UI, sans-serif">{formatDate(p.date)}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
};

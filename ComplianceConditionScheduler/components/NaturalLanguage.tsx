import * as React from 'react';
import { SchedulerState } from '../types';
import { formatDate, intervalLabel } from '../utils/dateUtils';
import { explanationStyles } from '../styles/tokens';

interface NaturalLanguageProps {
  state: SchedulerState;
  calculatedDueDate: string | null;
}

export const NaturalLanguage: React.FC<NaturalLanguageProps> = ({ state, calculatedDueDate }) => {
  let content: React.ReactNode = null;

  if (state.frequency === 'One-off' && state.startType === 'Fixed' && calculatedDueDate) {
    content = (
      <>The RM will receive this task <strong>{state.leadTime} days</strong> before the due date of <strong>{formatDate(calculatedDueDate)}</strong>. Once completed, the condition closes automatically.</>
    );
  } else if (state.frequency === 'One-off' && state.startType === 'Relative') {
    content = (
      <>The RM will receive this task <strong>{state.leadTime} days</strong> before the due date, which is <strong>{state.relativeDays} days</strong> after {state.anchorDate ? `the ${formatDate(state.anchorDate)} approval` : 'approval'}. Once completed, the condition closes automatically.</>
    );
  } else if (state.frequency === 'Recurring' && state.startType === 'Fixed' && calculatedDueDate && state.recurrenceInterval) {
    content = (
      <>The RM will receive a task <strong>{intervalLabel(state.recurrenceInterval)}</strong>, starting <strong>{state.leadTime} days</strong> before <strong>{formatDate(calculatedDueDate)}</strong>. A new task is created automatically after each completion.</>
    );
  } else if (state.frequency === 'Recurring' && state.startType === 'Relative' && state.recurrenceInterval) {
    content = (
      <>The RM will receive a task <strong>{intervalLabel(state.recurrenceInterval)}</strong>, beginning <strong>{state.relativeDays} days</strong> after approval. Tasks appear <strong>{state.leadTime} days</strong> before each deadline. All dates are anchored to the approval date{state.anchorDate ? ` (${formatDate(state.anchorDate)})` : ''} &mdash; late completions do not shift future deadlines.</>
    );
  } else if (state.frequency === 'One-off' && state.startType === 'Periodic review') {
    content = calculatedDueDate
      ? <>The RM will receive this task <strong>{state.leadTime} days</strong> before the periodic review due date of <strong>{formatDate(calculatedDueDate)}</strong>. Once completed, the condition closes automatically.</>
      : <>The RM will receive this task <strong>{state.leadTime} days</strong> before the due date, which will be set automatically by the periodic review cycle.</>;
  } else if (state.frequency === 'Recurring' && state.startType === 'Periodic review' && state.recurrenceInterval) {
    content = calculatedDueDate
      ? <>The RM will receive a task <strong>{intervalLabel(state.recurrenceInterval)}</strong>, starting <strong>{state.leadTime} days</strong> before the periodic review due date of <strong>{formatDate(calculatedDueDate)}</strong>. A new task is created automatically after each completion.</>
      : <>The RM will receive a task <strong>{intervalLabel(state.recurrenceInterval)}</strong>, starting <strong>{state.leadTime} days</strong> before each periodic review due date. Dates are set automatically by the review cycle.</>;
  } else if (state.frequency === 'One-off' && state.startType === 'Fixed' && !calculatedDueDate) {
    content = <>Set a due date above to see the full schedule.</>;
  }

  if (!content) return null;

  return <div style={explanationStyles.panel}>{content}</div>;
};

import * as React from 'react';
import { SchedulerState, icons } from '../types';
import { OptionCard } from './OptionCard';
import { ChipRow } from './ChipRow';
import { ScheduleSummary } from './ScheduleSummary';
import { NaturalLanguage } from './NaturalLanguage';
import {
  containerStyles,
  headerStyles,
  badgeStyles,
  sectionStyles,
  inputStyles,
  activationStyles,
  C,
} from '../styles/tokens';
import { addDays } from '../utils/dateUtils';

interface SchedulerContainerProps {
  state: SchedulerState;
  disabled: boolean;
  onChange: (field: string, value: unknown) => void;
}

export const SchedulerContainer: React.FC<SchedulerContainerProps> = ({
  state,
  disabled,
  onChange,
}) => {
  const calculatedDueDate =
    state.startType === 'Relative' && state.anchorDate
      ? addDays(state.anchorDate, state.relativeDays ?? 0)
      : state.startType === 'Fixed'
        ? state.dueDate
        : null;

  const nextRecurrence =
    state.frequency === 'Recurring' && calculatedDueDate && state.recurrenceInterval
      ? addDays(calculatedDueDate, state.recurrenceInterval)
      : null;

  const taskStartDate = calculatedDueDate
    ? (() => {
        const sd = addDays(calculatedDueDate, -(state.leadTime));
        const today = new Date().toISOString().split('T')[0];
        return sd && sd < today ? today : sd;
      })()
    : null;

  const isConfigured = state.frequency !== null && state.startType !== null;

  const [relDayCustom, setRelDayCustom] = React.useState(false);
  const [intervalCustom, setIntervalCustom] = React.useState(false);
  const [leadTimeCustom, setLeadTimeCustom] = React.useState(false);
  const [dateFocused, setDateFocused] = React.useState(false);
  const [activateBtnHovered, setActivateBtnHovered] = React.useState(false);

  // Activation logic
  const isDraft = state.status === 'Draft';
  const isRelative = state.startType === 'Relative';

  // Validation: are all required fields for this combination filled?
  const isValid = React.useMemo(() => {
    if (!isConfigured) return false;
    if (state.leadTime <= 0) return false;
    if (state.startType === 'Fixed' && !state.dueDate) return false;
    if (state.startType === 'Relative' && (!state.relativeDays || state.relativeDays <= 0)) return false;
    if (state.frequency === 'Recurring' && (!state.recurrenceInterval || state.recurrenceInterval <= 0)) return false;
    return true;
  }, [isConfigured, state]);

  // What validation hint to show
  const validationHint = React.useMemo(() => {
    if (!isConfigured) return null;
    if (state.startType === 'Fixed' && !state.dueDate) return 'Set a due date to activate.';
    if (state.startType === 'Relative' && (!state.relativeDays || state.relativeDays <= 0)) return 'Set days after approval to activate.';
    if (state.frequency === 'Recurring' && (!state.recurrenceInterval || state.recurrenceInterval <= 0)) return 'Set a recurrence interval to activate.';
    if (state.leadTime <= 0) return 'Set a lead time to activate.';
    return null;
  }, [isConfigured, state]);

  // Show activate button only for Fixed + Draft + valid
  const showActivateButton = isDraft && isConfigured && isValid && !isRelative;
  // Show auto-activate message for Relative + Draft
  const showAutoActivateMsg = isDraft && isConfigured && isRelative;
  // Show validation hint for Draft + configured but not valid
  const showHint = isDraft && isConfigured && !isValid && validationHint;

  const isActive = state.status === 'Active';
  const isCompleted = state.status === 'Completed';
  const structureLocked = isActive || isCompleted;

  const handleActivate = React.useCallback(() => {
    onChange('status', 'Active');
  }, [onChange]);

  const handleDeactivate = React.useCallback(() => {
    onChange('status', 'Draft');
  }, [onChange]);

  const badgeKey = state.status.toLowerCase() as 'draft' | 'active' | 'completed';

  const handleReset = () => {
    if (structureLocked) return;
    onChange('frequency', null);
    onChange('startType', null);
    onChange('dueDate', null);
    onChange('relativeDays', null);
    onChange('recurrenceInterval', null);
    onChange('leadTime', 14);
    setRelDayCustom(false);
    setIntervalCustom(false);
    setLeadTimeCustom(false);
  };

  // --- Read-only mode ---
  if (disabled) {
    return (
      <div style={containerStyles.root}>
        <div style={headerStyles.row}>
          <span style={headerStyles.title}>Compliance Schedule</span>
          <div style={headerStyles.right}>
            <span style={badgeStyles[badgeKey]}>{state.status}</span>
          </div>
        </div>
        <ScheduleSummary
          state={state}
          calculatedDueDate={calculatedDueDate}
          nextRecurrence={nextRecurrence}
          taskStartDate={taskStartDate}
        />
        <NaturalLanguage state={state} calculatedDueDate={calculatedDueDate} />
      </div>
    );
  }

  // --- Edit mode ---
  return (
    <div style={containerStyles.root}>
      {/* Header */}
      <div style={headerStyles.row}>
        <span style={headerStyles.title}>Compliance Schedule</span>
        <div style={headerStyles.right}>
          {isDraft && state.frequency !== null && (
            <button
              type="button"
              style={headerStyles.resetLink}
              onClick={handleReset}
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 16 16"
                fill="none"
                style={{ marginRight: '4px', verticalAlign: 'middle' }}
              >
                <path d={icons.reset} fill={C.n80} />
              </svg>
              Reset
            </button>
          )}
          {isActive && (
            <button
              type="button"
              style={headerStyles.resetLink}
              onClick={handleDeactivate}
            >
              Deactivate
            </button>
          )}
          <span style={badgeStyles[badgeKey]}>{state.status}</span>
        </div>
      </div>

      {/* Section: Frequency */}
      <div style={sectionStyles.section}>
        <div style={sectionStyles.label}>Frequency</div>
        <div style={sectionStyles.cardsRow}>
          <OptionCard
            selected={state.frequency === 'One-off'}
            onClick={() => onChange('frequency', 'One-off')}
            iconPath={icons.oneOff}
            label="One-off"
            description="Single deadline"
            locked={structureLocked}
          />
          <OptionCard
            selected={state.frequency === 'Recurring'}
            onClick={() => onChange('frequency', 'Recurring')}
            iconPath={icons.recurring}
            label="Recurring"
            description="Repeating cycle"
            locked={structureLocked}
          />
        </div>
      </div>

      {/* Section: Deadline (visible when frequency set) */}
      {state.frequency !== null && (
        <div style={sectionStyles.section}>
          <div style={sectionStyles.label}>Deadline</div>
          <div style={sectionStyles.cardsRow}>
            <OptionCard
              selected={state.startType === 'Fixed'}
              onClick={() => onChange('startType', 'Fixed')}
              iconPath={icons.calendar}
              label="Fixed date"
              description="Specific calendar date"
              locked={structureLocked}
            />
            <OptionCard
              selected={state.startType === 'Relative'}
              onClick={() => onChange('startType', 'Relative')}
              iconPath={icons.relative}
              label="Relative to approval"
              description="Days after approval"
              locked={structureLocked}
            />
          </div>
        </div>
      )}

      {/* Section: Details (visible when fully configured) */}
      {isConfigured && (
        <div style={sectionStyles.section}>
          {/* Fixed date input */}
          {state.startType === 'Fixed' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={sectionStyles.fieldLabel}>Due date</div>
              <input
                type="date"
                value={state.dueDate ?? ''}
                disabled={structureLocked}
                onChange={(e) => onChange('dueDate', e.target.value || null)}
                onFocus={() => setDateFocused(true)}
                onBlur={() => setDateFocused(false)}
                style={{
                  ...inputStyles.dateField,
                  ...(dateFocused && !structureLocked ? inputStyles.dateFieldFocused : {}),
                  ...(structureLocked ? inputStyles.dateFieldDisabled : {}),
                }}
              />
              <div style={sectionStyles.helperText}>
                {state.frequency === 'Recurring'
                  ? 'First due date for the recurring cycle.'
                  : 'The deadline for this condition.'}
              </div>
            </div>
          )}

          {/* Relative days */}
          {state.startType === 'Relative' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={sectionStyles.fieldLabel}>Days after approval</div>
              <ChipRow
                presets={[
                  { label: '30 days', days: 30 },
                  { label: '60 days', days: 60 },
                  { label: '90 days', days: 90 },
                  { label: 'Custom', days: null },
                ]}
                value={state.relativeDays ?? 30}
                onChange={(days) => onChange('relativeDays', days)}
                isCustom={relDayCustom}
                setIsCustom={setRelDayCustom}
                disabled={structureLocked}
              />
              <div style={sectionStyles.helperText}>
                {state.anchorDate
                  ? 'Days counted from the approval date.'
                  : (
                    <span>
                      <span style={badgeStyles.pending}>
                        <svg width={12} height={12} viewBox="0 0 16 16" fill="none">
                          <path d={icons.pending} fill={C.amber} />
                        </svg>
                        Awaiting approval
                      </span>
                      {' '}-- date will be calculated once approved.
                    </span>
                  )}
              </div>
            </div>
          )}

          {/* Recurrence interval (Recurring only) */}
          {state.frequency === 'Recurring' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={sectionStyles.fieldLabel}>Recurrence interval</div>
              <ChipRow
                presets={[
                  { label: 'Monthly', days: 30 },
                  { label: 'Quarterly', days: 90 },
                  { label: 'Semi-annual', days: 180 },
                  { label: 'Annual', days: 365 },
                  { label: 'Custom', days: null },
                ]}
                value={state.recurrenceInterval ?? 90}
                onChange={(days) => onChange('recurrenceInterval', days)}
                isCustom={intervalCustom}
                setIsCustom={setIntervalCustom}
                disabled={structureLocked}
              />
            </div>
          )}

          {/* Lead time */}
          <div style={{ marginBottom: '16px' }}>
            <div style={sectionStyles.fieldLabel}>Lead time</div>
            <ChipRow
              presets={[
                { label: '1 week', days: 7 },
                { label: '2 weeks', days: 14 },
                { label: '1 month', days: 30 },
                { label: 'Custom', days: null },
              ]}
              value={state.leadTime}
              onChange={(days) => onChange('leadTime', days)}
              isCustom={leadTimeCustom}
              setIsCustom={setLeadTimeCustom}
              disabled={structureLocked}
            />
          </div>
        </div>
      )}

      {/* Schedule Summary */}
      {isConfigured && (
        <ScheduleSummary
          state={state}
          calculatedDueDate={calculatedDueDate}
          nextRecurrence={nextRecurrence}
          taskStartDate={taskStartDate}
        />
      )}

      {/* Natural Language explanation */}
      {isConfigured && (
        <NaturalLanguage state={state} calculatedDueDate={calculatedDueDate} />
      )}

      {/* Activate button (Fixed + Draft + valid) */}
      {showActivateButton && (
        <button
          type="button"
          style={{
            ...activationStyles.button,
            ...(activateBtnHovered ? activationStyles.buttonHover : {}),
          }}
          onClick={handleActivate}
          onMouseEnter={() => setActivateBtnHovered(true)}
          onMouseLeave={() => setActivateBtnHovered(false)}
        >
          Activate condition
        </button>
      )}

      {/* Validation hint (Draft + configured but incomplete) */}
      {showHint && (
        <div style={activationStyles.hint}>{validationHint}</div>
      )}

      {/* Auto-activate message (Relative + Draft) */}
      {showAutoActivateMsg && (
        <div style={activationStyles.autoActivateMsg}>
          This condition will activate automatically when the onboarding or periodic review is approved.
        </div>
      )}
    </div>
  );
};

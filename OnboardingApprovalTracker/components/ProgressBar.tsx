import * as React from 'react';
import { ApprovalStep } from '../types';
import { progressBarStyles } from '../styles/tokens';

const CHECK_PATH = 'M5 12l5 5L20 7';

interface ProgressBarProps {
  steps: ApprovalStep[];
}

function CompletedCircle(): React.ReactElement {
  return (
    <div style={{ ...progressBarStyles.circleBase, ...progressBarStyles.circleCompleted }}>
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
        <path d={CHECK_PATH} />
      </svg>
    </div>
  );
}

function ActiveCircle(): React.ReactElement {
  return (
    <div style={{ ...progressBarStyles.circleBase, ...progressBarStyles.circleActive }}>
      <div style={progressBarStyles.activeDot} />
    </div>
  );
}

function UpcomingCircle(): React.ReactElement {
  return (
    <div style={{ ...progressBarStyles.circleBase, ...progressBarStyles.circleUpcoming }}>
      <div style={progressBarStyles.upcomingDot} />
    </div>
  );
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ steps }) => {
  const segmentCount = Math.max(0, steps.length - 1);

  return (
    <div>
      <div style={progressBarStyles.wrapper}>
        <div style={progressBarStyles.bar}>
          {Array.from({ length: segmentCount }, (_, i) => {
            const leftStep = steps[i];
            const completed = leftStep.status === 'completed';
            return (
              <div
                key={i}
                style={completed ? progressBarStyles.segmentCompleted : progressBarStyles.segmentUpcoming}
              />
            );
          })}
        </div>
        <div style={progressBarStyles.circlesRow}>
          {steps.map((step) => {
            if (step.status === 'completed') return <CompletedCircle key={step.key} />;
            if (step.status === 'active') return <ActiveCircle key={step.key} />;
            return <UpcomingCircle key={step.key} />;
          })}
        </div>
      </div>
      <div style={progressBarStyles.labelsRow}>
        {steps.map((step) => (
          <span key={step.key} style={progressBarStyles.label}>
            {step.shortLabel === 'SH' ? 'Segment Head' : step.shortLabel === 'Compl.' ? 'Compliance' : step.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
};

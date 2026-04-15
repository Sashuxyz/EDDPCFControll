import * as React from 'react';
import { ApprovalRound, TimelineEvent } from '../types';
import { containerStyles, headerStyles } from '../styles/tokens';
import { ProgressBar } from './ProgressBar';
import { DetailCards } from './DetailCards';
import { Timeline } from './Timeline';
import { openTransitionLog } from '../utils/navigation';
import { formatDate } from '../utils/dateFormat';

interface ApprovalTrackerProps {
  rounds: ApprovalRound[];
  events: TimelineEvent[];
  context: ComponentFramework.Context<unknown>;
  tzOffsetMinutes: number;
}

function findFinalApprovalDate(currentRound: ApprovalRound | undefined): Date | null {
  if (!currentRound) return null;
  const allCompleted = currentRound.steps.every((s) => s.status === 'completed');
  if (!allCompleted) return null;
  let latest: Date | null = null;
  for (const s of currentRound.steps) {
    if (s.approvedOn && (latest === null || s.approvedOn > latest)) {
      latest = s.approvedOn;
    }
  }
  return latest;
}

export const ApprovalTracker: React.FC<ApprovalTrackerProps> = ({ rounds, events, context, tzOffsetMinutes }) => {
  const currentRound = rounds.find((r) => r.isCurrent);

  const onApproverClick = React.useCallback(
    (recordId: string) => {
      openTransitionLog(context, recordId);
    },
    [context]
  );

  if (!currentRound) {
    return (
      <div style={containerStyles.root}>
        <div style={headerStyles.row}>
          <span style={headerStyles.title}>Approval progress</span>
        </div>
      </div>
    );
  }

  const totalRounds = rounds.length;
  const finalApprovalDate = findFinalApprovalDate(currentRound);

  return (
    <div style={containerStyles.root}>
      <div style={headerStyles.row}>
        <span style={headerStyles.title}>Approval progress</span>
        {finalApprovalDate ? (
          <span style={headerStyles.approvedIndicator}>Approved on {formatDate(finalApprovalDate, tzOffsetMinutes)}</span>
        ) : totalRounds > 1 ? (
          <span style={headerStyles.roundIndicator}>Round {currentRound.roundNumber} of {totalRounds}</span>
        ) : (
          <span style={headerStyles.roundIndicator}>Round 1</span>
        )}
      </div>

      <ProgressBar steps={currentRound.steps} />
      <DetailCards steps={currentRound.steps} onApproverClick={onApproverClick} tzOffsetMinutes={tzOffsetMinutes} />
      <Timeline events={events} onApproverClick={onApproverClick} tzOffsetMinutes={tzOffsetMinutes} />
    </div>
  );
};

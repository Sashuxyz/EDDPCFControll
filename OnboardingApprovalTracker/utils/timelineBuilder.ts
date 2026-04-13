import { ApprovalRound, TimelineEvent, STEP_DEFS } from '../types';

export function buildTimelineEvents(rounds: ApprovalRound[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const round of rounds) {
    for (const step of round.steps) {
      if (step.status === 'completed' && step.approvedOn) {
        events.push({
          type: 'approval',
          step: STEP_DEFS[step.key],
          approverName: step.approverName,
          recordId: step.recordId,
          occurredOn: step.approvedOn,
          roundNumber: round.roundNumber,
        });
      }
    }

    if (round.sentBack) {
      events.push({
        type: 'sentBack',
        step: STEP_DEFS.rm,
        approverName: round.sentBack.by,
        recordId: round.sentBack.byRecordId,
        occurredOn: round.sentBack.on,
        roundNumber: round.roundNumber,
      });
    }

    if (round.isCurrent && !round.sentBack) {
      const activeStep = round.steps.find((s) => s.status === 'active');
      if (activeStep) {
        events.push({
          type: 'awaiting',
          step: STEP_DEFS[activeStep.key],
          roundNumber: round.roundNumber,
        });
      }
    }
  }

  events.sort((a, b) => {
    if (a.type === 'awaiting' && b.type !== 'awaiting') return -1;
    if (b.type === 'awaiting' && a.type !== 'awaiting') return 1;
    const aT = a.occurredOn?.getTime() ?? 0;
    const bT = b.occurredOn?.getTime() ?? 0;
    return bT - aT;
  });

  return events;
}

import { ExtractedRecord, ApprovalRound, ApprovalStep, STEP_DEFS, STEP_MAP, SEND_BACK_TRANSITION_TYPE, SEND_BACK_STATUS_FRONT_INPUT_REQUIRED } from '../types';

interface RoundBucket {
  approvalEvents: ExtractedRecord[];
  sentBack?: { record: ExtractedRecord };
}

export function groupIntoRounds(records: ExtractedRecord[], approvalFlow: number): ApprovalRound[] {
  const stepKeys = STEP_MAP[approvalFlow];
  if (!stepKeys) return [];

  const sorted = [...records].sort((a, b) => {
    const aT = a.occurredOn?.getTime() ?? 0;
    const bT = b.occurredOn?.getTime() ?? 0;
    return aT - bT;
  });

  const buckets: RoundBucket[] = [{ approvalEvents: [] }];
  let currentBucket = buckets[0];

  for (const rec of sorted) {
    const isApproval = rec.transitionType !== null && rec.transitionType >= 1 && rec.transitionType <= 4;
    const isSendBack = rec.transitionType === SEND_BACK_TRANSITION_TYPE && rec.currentStatus === SEND_BACK_STATUS_FRONT_INPUT_REQUIRED;

    if (isApproval) {
      currentBucket.approvalEvents.push(rec);
    } else if (isSendBack) {
      currentBucket.sentBack = { record: rec };
      currentBucket = { approvalEvents: [] };
      buckets.push(currentBucket);
    }
  }

  return buckets.map((bucket, idx) => {
    const roundNumber = idx + 1;
    const isCurrent = idx === buckets.length - 1;

    const stepsByType: Map<number, ExtractedRecord> = new Map();
    for (const ev of bucket.approvalEvents) {
      if (ev.transitionType === null) continue;
      const existing = stepsByType.get(ev.transitionType);
      if (!existing || (ev.occurredOn?.getTime() ?? 0) > (existing.occurredOn?.getTime() ?? 0)) {
        stepsByType.set(ev.transitionType, ev);
      }
    }

    // Build steps in order. A step is only "completed" if the matching
    // approval log exists AND all prior steps in the ordered chain are
    // also completed. Enforces the business rule that approvals happen
    // sequentially (RM -> SH -> Compliance -> BAB).
    let priorStepCompleted = true;
    const steps: ApprovalStep[] = stepKeys.map((key) => {
      const def = STEP_DEFS[key];
      const matched = stepsByType.get(def.transitionType);
      if (matched && priorStepCompleted) {
        return {
          ...def,
          status: 'completed',
          approverName: matched.approverName ?? '(Unknown)',
          approvedOn: matched.occurredOn ?? undefined,
          recordId: matched.recordId,
        };
      }
      // Once a step is not completed, all subsequent steps are not completed either.
      priorStepCompleted = false;
      return { ...def, status: 'upcoming' };
    });

    if (isCurrent && !bucket.sentBack) {
      const firstUpcomingIdx = steps.findIndex((s) => s.status === 'upcoming');
      if (firstUpcomingIdx >= 0) {
        steps[firstUpcomingIdx] = { ...steps[firstUpcomingIdx], status: 'active' };
      }
    }

    const round: ApprovalRound = {
      roundNumber,
      steps,
      isCurrent,
    };
    if (bucket.sentBack) {
      const sb = bucket.sentBack.record;
      round.sentBack = {
        by: sb.approverName ?? '(Unknown)',
        byRecordId: sb.recordId,
        on: sb.occurredOn ?? new Date(0),
      };
    }
    return round;
  });
}

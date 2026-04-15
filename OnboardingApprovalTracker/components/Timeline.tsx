import * as React from 'react';
import { TimelineEvent } from '../types';
import { timelineStyles } from '../styles/tokens';
import { formatDateTime } from '../utils/dateFormat';

interface TimelineProps {
  events: TimelineEvent[];
  onApproverClick: (recordId: string) => void;
  tzOffsetMinutes: number;
}

function dotStyle(event: TimelineEvent): React.CSSProperties {
  const base = timelineStyles.dotBase;
  if (event.type === 'approval') return { ...base, ...timelineStyles.dotApproval };
  if (event.type === 'sentBack') return { ...base, ...timelineStyles.dotSendBack };
  return { ...base, ...timelineStyles.dotAwaiting };
}

function ApproverLink({ name, recordId, onClick }: { name?: string; recordId?: string; onClick: (id: string) => void }): React.ReactElement | null {
  if (!name) return null;
  if (!recordId || name === '(Unknown)') {
    return <span>{name}</span>;
  }
  return (
    <span
      style={timelineStyles.approverLink}
      role="link"
      tabIndex={0}
      onClick={() => onClick(recordId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(recordId);
        }
      }}
    >
      {name}
    </span>
  );
}

function EventDescription({ event, onApproverClick }: { event: TimelineEvent; onApproverClick: (id: string) => void }): React.ReactElement {
  if (event.type === 'awaiting') {
    return (
      <div style={timelineStyles.description}>
        <strong>Awaiting {event.step.label} review</strong>
      </div>
    );
  }
  if (event.type === 'sentBack') {
    return (
      <div style={timelineStyles.descriptionSendBack}>
        <span style={{ color: '#A4262C' }}>Sent back to RM</span>{' '}
        <span style={{ fontWeight: 'normal', color: '#323130' }}>by{' '}
          <ApproverLink name={event.approverName} recordId={event.recordId} onClick={onApproverClick} />
        </span>
      </div>
    );
  }
  return (
    <div style={timelineStyles.description}>
      {event.step.label.replace(' approval', '')} approved by{' '}
      <ApproverLink name={event.approverName} recordId={event.recordId} onClick={onApproverClick} />
    </div>
  );
}

function MetaLine({ event, tzOffsetMinutes }: { event: TimelineEvent; tzOffsetMinutes: number }): React.ReactElement {
  if (event.type === 'awaiting') {
    return <div style={timelineStyles.meta}>Round {event.roundNumber} -- In progress</div>;
  }
  const dt = event.occurredOn ? formatDateTime(event.occurredOn, tzOffsetMinutes) : '';
  return <div style={timelineStyles.meta}>{dt} -- Round {event.roundNumber}</div>;
}

export const Timeline: React.FC<TimelineProps> = ({ events, onApproverClick, tzOffsetMinutes }) => {
  if (events.length === 0) return null;
  return (
    <div style={timelineStyles.section}>
      <div style={timelineStyles.sectionLabel}>Activity timeline</div>
      <div style={timelineStyles.list}>
        <div style={timelineStyles.rail} />
        {events.map((event, idx) => {
          const isLast = idx === events.length - 1;
          return (
            <div key={idx} style={isLast ? timelineStyles.itemLast : timelineStyles.item}>
              <div style={dotStyle(event)} />
              <EventDescription event={event} onApproverClick={onApproverClick} />
              <MetaLine event={event} tzOffsetMinutes={tzOffsetMinutes} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

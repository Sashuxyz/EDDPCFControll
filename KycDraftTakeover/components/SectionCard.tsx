import * as React from 'react';
import { SectionConfig, icons } from '../types';
import { SectionContent } from './SectionContent';
import { cardStyles, cardHeaderStyles, contentStyles, buttonStyles } from '../styles/tokens';

interface SubFieldDisplay {
  label: string;
  value: string;
  isNumeric: boolean;
}

interface SectionCardProps {
  config: SectionConfig;
  text: string | null;
  subFields: SubFieldDisplay[];
  isTakenOver: boolean;
  isExpanded: boolean;
  disabled: boolean;
  onToggle: () => void;
  onTakeOver: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  config,
  text,
  subFields,
  isTakenOver,
  isExpanded,
  disabled,
  onToggle,
  onTakeOver,
}) => {
  const [hovered, setHovered] = React.useState(false);
  const [btnHovered, setBtnHovered] = React.useState(false);

  if (text === null) return null;

  // Taken over state
  if (isTakenOver) {
    return (
      <div style={cardStyles.takenOver}>
        <div style={cardHeaderStyles.row} onClick={onToggle}>
          <div style={cardHeaderStyles.left}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#107C10" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={icons.check} />
            </svg>
            <span style={cardHeaderStyles.label}>{config.label}</span>
            <span style={cardHeaderStyles.takenOverBadge}>Taken over</span>
          </div>
          <span style={cardHeaderStyles.chevron}>{isExpanded ? '\u25BE' : '\u25B8'}</span>
        </div>
        {isExpanded && (
          <div style={contentStyles.fadeMask}>
            <SectionContent text={text} isSourcesSection={config.summaryKey === null} subFields={subFields} />
          </div>
        )}
        {isExpanded && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <span style={buttonStyles.takenOverText}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#107C10" strokeWidth={2} strokeLinecap="round">
                <path d={icons.check} />
              </svg>
              Draft Taken Over
            </span>
          </div>
        )}
      </div>
    );
  }

  // Collapsed state
  if (!isExpanded) {
    const collapsedStyle: React.CSSProperties = {
      ...cardStyles.collapsed,
      ...(hovered ? cardStyles.collapsedHover : {}),
    };
    return (
      <div
        style={collapsedStyle}
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={cardHeaderStyles.row}>
          <div style={cardHeaderStyles.left}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#605E5C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={config.iconPath} />
            </svg>
            <span style={cardHeaderStyles.label}>{config.label}</span>
          </div>
          <span style={cardHeaderStyles.chevron}>{'\u25B8'}</span>
        </div>
      </div>
    );
  }

  // Expanded pending state
  const takeOverBtnStyle: React.CSSProperties = {
    ...buttonStyles.takeOver,
    ...(btnHovered ? buttonStyles.takeOverHover : {}),
  };

  return (
    <div style={cardStyles.pending}>
      <div style={cardHeaderStyles.row} onClick={onToggle}>
        <div style={cardHeaderStyles.left}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#0078D4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d={config.iconPath} />
          </svg>
          <span style={cardHeaderStyles.label}>{config.label}</span>
        </div>
        <span style={cardHeaderStyles.chevron}>{'\u25BE'}</span>
      </div>
      <SectionContent text={text} isSourcesSection={config.summaryKey === null} subFields={subFields} />
      {!disabled && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            type="button"
            style={takeOverBtnStyle}
            onClick={(e) => { e.stopPropagation(); onTakeOver(); }}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#0078D4" strokeWidth={2.5} strokeLinecap="round">
              <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
            </svg>
            Take over
          </button>
        </div>
      )}
    </div>
  );
};

import * as React from 'react';
import { cardStyles } from '../styles/tokens';

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  iconPath: string;
  iconColor?: string;
  label: string;
  description: string;
  locked?: boolean;
}

export const OptionCard: React.FC<OptionCardProps> = ({ selected, onClick, iconPath, iconColor, label, description, locked = false }) => {
  const [hovered, setHovered] = React.useState(false);

  const style: React.CSSProperties = {
    ...cardStyles.card,
    ...(selected ? cardStyles.cardSelected : {}),
    ...(hovered && !selected && !locked ? { borderColor: '#A19F9D', background: '#FAF9F8' } : {}),
    ...(locked ? { opacity: 0.6, cursor: 'default' } : {}),
  };

  const color = selected ? '#0078D4' : '#605E5C';

  const handleClick = () => {
    if (!locked) onClick();
  };

  return (
    <div
      style={style}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d={iconPath} fill={iconColor ?? color} />
      </svg>
      <div>
        <div style={cardStyles.cardLabel}>
          {label}
          {locked && <span style={{ fontSize: '11px', color: '#A19F9D', marginLeft: '6px', fontWeight: 400 }}>locked</span>}
        </div>
        <div style={cardStyles.cardDescription}>{description}</div>
      </div>
    </div>
  );
};

import * as React from 'react';
import { chipStyles } from '../styles/tokens';

interface ChipItemProps {
  name: string;
  onRemove: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

export const ChipItem: React.FC<ChipItemProps> = ({ name, onRemove, onMouseEnter, onMouseLeave }) => {
  const [hovered, setHovered] = React.useState(false);
  const [iconHovered, setIconHovered] = React.useState(false);

  const chipStyle: React.CSSProperties = hovered
    ? { ...chipStyles.chip, ...chipStyles.chipHover }
    : chipStyles.chip;

  const handleRemoveClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  }, [onRemove]);

  return (
    <span
      style={chipStyle}
      onMouseEnter={(e) => { setHovered(true); onMouseEnter(e); }}
      onMouseLeave={() => { setHovered(false); onMouseLeave(); }}
    >
      {name}
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconHovered ? '#A4262C' : '#A19F9D'}
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{ cursor: 'pointer', flexShrink: 0 }}
        onClick={handleRemoveClick}
        onMouseEnter={() => setIconHovered(true)}
        onMouseLeave={() => setIconHovered(false)}
      >
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
      </svg>
    </span>
  );
};

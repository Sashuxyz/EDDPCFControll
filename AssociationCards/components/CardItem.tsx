import * as React from 'react';
import { cardStyles } from '../styles/tokens';

interface CardItemProps {
  name: string;
  fields: Array<{ label: string; value: string }>;
  onRemove: () => void;
}

export const CardItem: React.FC<CardItemProps> = ({ name, fields, onRemove }) => {
  const [hovered, setHovered] = React.useState(false);
  const [iconHovered, setIconHovered] = React.useState(false);

  const baseStyle = cardStyles.card;
  const hoverStyle = cardStyles.cardHover;
  const style: React.CSSProperties = {
    ...baseStyle,
    boxShadow: hovered
      ? (hoverStyle.boxShadow as string)
      : (baseStyle.boxShadow as string),
  };

  const handleRemoveClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  }, [onRemove]);

  return (
    <div
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={cardStyles.cardName}>{name}</div>
      {fields.map((f) => (
        <div key={f.label} style={cardStyles.cardField}>
          <span style={cardStyles.cardFieldLabel}>{f.label}: </span>
          {f.value}
        </div>
      ))}
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconHovered ? '#A4262C' : '#A19F9D'}
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{ ...cardStyles.removeIcon as React.CSSProperties, flexShrink: 0 }}
        onClick={handleRemoveClick}
        onMouseEnter={() => setIconHovered(true)}
        onMouseLeave={() => setIconHovered(false)}
      >
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
      </svg>
    </div>
  );
};

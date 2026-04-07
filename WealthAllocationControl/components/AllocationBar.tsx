import * as React from 'react';
import { ASSET_CLASSES } from '../types';
import { formatCHF, totalAllocated } from '../utils/allocationLogic';
import { barStyles } from '../styles/tokens';

interface AllocationBarProps {
  vals: number[];
  totalWealth: number;
}

let shakeInjected = false;
function injectShakeStyle(): void {
  if (shakeInjected) return;
  const style = document.createElement('style');
  style.textContent = '@keyframes wac-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}';
  document.head.appendChild(style);
  shakeInjected = true;
}

export const AllocationBar: React.FC<AllocationBarProps> = ({ vals, totalWealth }) => {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [shaking, setShaking] = React.useState(false);
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { injectShakeStyle(); }, []);

  const total = totalAllocated(vals);
  const unallocated = Math.max(0, 100 - total);

  // Trigger shake when total hits 100
  const prevTotalRef = React.useRef(total);
  React.useEffect(() => {
    if (total >= 100 && prevTotalRef.current < 100) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
    }
    prevTotalRef.current = total;
  }, [total]);

  const handleSegmentMouseEnter = React.useCallback((e: React.MouseEvent, idx: number) => {
    if (vals[idx] < 3) return; // too narrow
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const barRect = barRef.current?.getBoundingClientRect();
    setHoveredIdx(idx);
    setTooltipPos({
      x: rect.left - (barRect?.left ?? 0) + rect.width / 2,
      y: (barRect?.height ?? 24) + 6,
    });
  }, [vals]);

  const handleSegmentMouseLeave = React.useCallback(() => {
    setHoveredIdx(null);
  }, []);

  // Status text
  let statusRight: React.ReactNode;
  if (total > 100) {
    statusRight = <span style={barStyles.statusOver}>Over-allocated!</span>;
  } else if (total === 100) {
    statusRight = <span style={barStyles.statusFull}>Fully allocated</span>;
  } else {
    statusRight = (
      <span>
        Unallocated: <span style={barStyles.statusUnallocated}>{(100 - total).toFixed(2)}%</span> — CHF {formatCHF((unallocated / 100) * totalWealth)}
      </span>
    );
  }

  const barWrapperStyle: React.CSSProperties = {
    ...barStyles.wrapper,
    position: 'relative',
    ...(shaking ? { animation: 'wac-shake 0.3s ease' } : {}),
  };

  return (
    <div>
      <div ref={barRef} style={barWrapperStyle}>
        <div style={barStyles.bar}>
          {ASSET_CLASSES.map((ac, idx) => {
            const pct = vals[idx];
            if (pct <= 0) return null;
            const isHovered = hoveredIdx === idx;
            const segStyle: React.CSSProperties = {
              ...barStyles.segment,
              width: `${pct}%`,
              background: ac.color,
              ...(isHovered ? barStyles.segmentHover : {}),
            };
            return (
              <div
                key={ac.key}
                style={segStyle}
                onMouseEnter={(e) => handleSegmentMouseEnter(e, idx)}
                onMouseLeave={handleSegmentMouseLeave}
              />
            );
          })}
        </div>
        {hoveredIdx !== null && (
          <div style={{ ...barStyles.tooltip, left: tooltipPos.x, top: tooltipPos.y, transform: 'translateX(-50%)' }}>
            <div style={{ ...barStyles.tooltipName, color: ASSET_CLASSES[hoveredIdx].color }}>
              {ASSET_CLASSES[hoveredIdx].label}
            </div>
            <div style={barStyles.tooltipValue}>
              {vals[hoveredIdx].toFixed(2)}% — CHF {formatCHF((vals[hoveredIdx] / 100) * totalWealth)}
            </div>
          </div>
        )}
      </div>
      <div style={barStyles.statusLine}>
        <span>
          Allocated: <span style={barStyles.statusAllocated}>{total.toFixed(2)}%</span> — CHF {formatCHF((total / 100) * totalWealth)}
        </span>
        {statusRight}
      </div>
    </div>
  );
};

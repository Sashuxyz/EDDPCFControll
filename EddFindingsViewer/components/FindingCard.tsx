import * as React from 'react';
import { FindingRecord } from '../utils/datasetHelpers';
import { getRiskColors, getStatusColors } from '../utils/optionSetColors';
import { stripHtml, sanitizeHtml } from '../utils/htmlHelpers';
import { MetadataField } from '../utils/metadataHelpers';
import { cardStyles } from '../styles/tokens';
import { RICH_TEXT_CLASS, injectRichTextStyles } from '../styles/richText';

interface FindingCardProps {
  finding: FindingRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenFinding: (entityId: string) => void;
  onOpenCondition: (entityId: string) => void;
  conditionNameOverride?: string;
  additionalColumns: MetadataField[];
  getAdditionalValue: (recordId: string, columnName: string) => string;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  isExpanded,
  onToggle,
  onOpenFinding,
  onOpenCondition,
  conditionNameOverride,
  additionalColumns,
  getAdditionalValue,
}) => {
  const contentId = `finding-content-${finding.id}`;

  // Inject rich text scoped styles once
  React.useEffect(() => {
    injectRichTextStyles();
  }, []);

  const riskColors = getRiskColors(finding.riskSeverityValue);
  const statusColors = getStatusColors(finding.statusValue);
  const conditionName = conditionNameOverride ?? finding.linkedConditionName;

  const plainText = React.useMemo(
    () => stripHtml(finding.rawDescription),
    [finding.rawDescription]
  );

  // Content is sanitized via DOMPurify in sanitizeHtml() — see utils/htmlHelpers.ts
  const sanitizedHtml = React.useMemo(
    () => sanitizeHtml(finding.rawDescription),
    [finding.rawDescription]
  );

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenFinding(finding.id);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      e.preventDefault();
      onOpenFinding(finding.id);
    }
  };

  const handleShowMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  const handleConditionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (finding.linkedConditionId) {
      onOpenCondition(finding.linkedConditionId);
    }
  };

  const cardStyle: React.CSSProperties = isExpanded
    ? { ...cardStyles.card, ...cardStyles.cardExpanded }
    : cardStyles.card;

  const chevronStyle: React.CSSProperties = isExpanded
    ? { ...cardStyles.chevron, ...cardStyles.chevronExpanded }
    : cardStyles.chevron;

  return (
    <div style={cardStyle}>
      {/* Header area — click to toggle */}
      <div
        style={cardStyles.headerArea}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleHeaderKeyDown}
      >
        {/* Top row: severity badge (left), status badge + chevron (right) */}
        <div style={cardStyles.topRow}>
          <span
            style={{ ...cardStyles.badge, backgroundColor: riskColors.bg, color: riskColors.text }}
          >
            {finding.riskSeverityLabel || 'Unknown'}
          </span>
          <div style={cardStyles.rightGroup}>
            <span
              style={{ ...cardStyles.badge, backgroundColor: statusColors.bg, color: statusColors.text }}
            >
              {finding.statusLabel || 'Unknown'}
            </span>
            <span
              style={chevronStyle}
              aria-hidden="true"
            >
              &#9662;
            </span>
          </div>
        </div>

        {/* Title row */}
        <div style={cardStyles.titleRow}>
          <button
            style={cardStyles.titleLink}
            onClick={handleTitleClick}
            onKeyDown={handleTitleKeyDown}
            type="button"
          >
            {finding.name || 'Untitled Finding'}
          </button>
        </div>
      </div>

      {/* Collapsed: plain text preview + show more */}
      {!isExpanded && plainText && (
        <>
          <div style={cardStyles.previewArea}>
            <div style={cardStyles.previewText}>{plainText}</div>
          </div>
          <div style={cardStyles.showMoreLink}>
            <button
              style={cardStyles.showMoreButton}
              onClick={handleShowMore}
              type="button"
            >
              Show more
            </button>
          </div>
        </>
      )}

      {/* Expanded: rich HTML content + metadata footer */}
      {isExpanded && (
        <div
          id={contentId}
          role="region"
          aria-label={`Details for ${finding.name}`}
        >
          {sanitizedHtml && (
            <div
              className={RICH_TEXT_CLASS}
              style={cardStyles.expandedDescription}
              // Safe: content is sanitized via DOMPurify in sanitizeHtml()
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          )}

          <div style={cardStyles.showMoreLink}>
            <button
              style={cardStyles.showMoreButton}
              onClick={handleShowMore}
              type="button"
            >
              Show less
            </button>
          </div>

          {/* Metadata footer */}
          <div style={cardStyles.metadataFooter}>
            {/* Tier 1: curated fields */}
            <div style={cardStyles.metadataRow}>
              {finding.categoryLabel && (
                <span>
                  <span style={cardStyles.metadataLabel}>Category: </span>
                  {finding.categoryLabel}
                </span>
              )}
              {finding.createdByName && (
                <span>
                  <span style={cardStyles.metadataLabel}>Created by: </span>
                  {finding.createdByName}
                </span>
              )}
              {finding.linkedConditionId && (
                <span>
                  <span style={cardStyles.metadataLabel}>Condition: </span>
                  <button
                    style={cardStyles.conditionLink}
                    onClick={handleConditionClick}
                    type="button"
                    title={conditionName ? `Open ${conditionName}` : 'Open linked condition'}
                  >
                    {conditionName || 'Open Record'}
                  </button>
                </span>
              )}
              {finding.modifiedOn && (
                <span>
                  <span style={cardStyles.metadataLabel}>Last updated: </span>
                  {finding.modifiedOn}
                </span>
              )}
            </div>

            {/* Tier 2: auto-discovered additional columns */}
            {additionalColumns.length > 0 && (
              <div style={{ ...cardStyles.metadataRow, marginTop: '8px' }}>
                {additionalColumns.map((col) => {
                  const value = getAdditionalValue(finding.id, col.name);
                  if (!value) return null;
                  return (
                    <span key={col.name}>
                      <span style={cardStyles.metadataLabel}>{col.displayName}: </span>
                      {value}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

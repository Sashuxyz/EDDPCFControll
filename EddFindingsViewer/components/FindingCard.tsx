import * as React from 'react';
import { mergeClasses } from '@fluentui/react-components';
import { ChevronDown20Regular } from '@fluentui/react-icons';
import { FindingRecord } from '../utils/datasetHelpers';
import { getRiskColors, getStatusColors } from '../utils/optionSetColors';
import { stripHtml, sanitizeHtml } from '../utils/htmlHelpers';
import { MetadataField } from '../utils/metadataHelpers';
import { useCardStyles } from '../styles/tokens';
import { useRichTextStyles } from '../styles/richText';

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
  const styles = useCardStyles();
  const richTextStyles = useRichTextStyles();
  const contentId = `finding-content-${finding.id}`;

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

  return (
    <div className={mergeClasses(styles.card, isExpanded && styles.cardExpanded)}>
      {/* Header area — click to toggle */}
      <div
        className={styles.headerArea}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleHeaderKeyDown}
      >
        {/* Top row: severity badge (left), status badge + chevron (right) */}
        <div className={styles.topRow}>
          <span
            className={styles.badge}
            style={{ backgroundColor: riskColors.bg, color: riskColors.text }}
          >
            {finding.riskSeverityLabel || 'Unknown'}
          </span>
          <div className={styles.rightGroup}>
            <span
              className={styles.badge}
              style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
            >
              {finding.statusLabel || 'Unknown'}
            </span>
            <span
              className={mergeClasses(
                styles.chevron,
                isExpanded && styles.chevronExpanded
              )}
              aria-hidden="true"
            >
              <ChevronDown20Regular />
            </span>
          </div>
        </div>

        {/* Title row */}
        <div className={styles.titleRow}>
          <button
            className={styles.titleLink}
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
          <div className={styles.previewArea}>
            <div className={styles.previewText}>{plainText}</div>
          </div>
          <div className={styles.showMoreLink}>
            <button
              className={styles.showMoreButton}
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
              className={mergeClasses(
                styles.expandedDescription,
                richTextStyles.richTextContainer
              )}
              // Safe: content is sanitized via DOMPurify in sanitizeHtml()
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          )}

          <div className={styles.showMoreLink}>
            <button
              className={styles.showMoreButton}
              onClick={handleShowMore}
              type="button"
            >
              Show less
            </button>
          </div>

          {/* Metadata footer */}
          <div className={styles.metadataFooter}>
            {/* Tier 1: curated fields */}
            <div className={styles.metadataRow}>
              {finding.categoryLabel && (
                <span>
                  <span className={styles.metadataLabel}>Category: </span>
                  {finding.categoryLabel}
                </span>
              )}
              {finding.createdByName && (
                <span>
                  <span className={styles.metadataLabel}>Created by: </span>
                  {finding.createdByName}
                </span>
              )}
              {finding.linkedConditionId && (
                <span>
                  <span className={styles.metadataLabel}>Condition: </span>
                  <button
                    className={styles.conditionLink}
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
                  <span className={styles.metadataLabel}>Last updated: </span>
                  {finding.modifiedOn}
                </span>
              )}
            </div>

            {/* Tier 2: auto-discovered additional columns */}
            {additionalColumns.length > 0 && (
              <div className={styles.metadataRow} style={{ marginTop: '8px' }}>
                {additionalColumns.map((col) => {
                  const value = getAdditionalValue(finding.id, col.name);
                  if (!value) return null;
                  return (
                    <span key={col.name}>
                      <span className={styles.metadataLabel}>{col.displayName}: </span>
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

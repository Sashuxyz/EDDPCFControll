import * as React from 'react';
import { SECTION_CONFIGS, SectionConfig, icons, isValidNumber, parseWealthValue } from '../types';
import { extractSectionText, extractSubFieldValue } from '../utils/parseAgentOutput';
import { isAlreadyTakenOver } from '../utils/matchDraft';
import { containerStyles, headerStyles, disclaimerStyles } from '../styles/tokens';
import { SectionCard } from './SectionCard';
import { OverwriteConfirm } from './OverwriteConfirm';

interface SubFieldDisplay {
  label: string;
  value: string;
  isNumeric: boolean;
}

interface SectionData {
  config: SectionConfig;
  text: string | null;
  subFields: SubFieldDisplay[];
}

interface ConfirmTarget {
  paramNames: string[];
  values: Record<string, unknown>;
  fieldLabels: string[];
}

interface TakeoverContainerProps {
  parsedSections: Record<string, unknown>;
  currentFieldValues: Record<string, string | null>;
  disabled: boolean;
  onTakeOver: (paramNames: string[], values: Record<string, unknown>) => void;
}

export const TakeoverContainer: React.FC<TakeoverContainerProps> = ({
  parsedSections,
  currentFieldValues,
  disabled,
  onTakeOver,
}) => {
  // Compute "already taken over" set by matching current field values against AI drafts.
  // This is stateless — no persistence needed. Works across sessions.
  const detectedTakenOver = React.useMemo(() => {
    const detected = new Set<string>();
    for (const config of SECTION_CONFIGS) {
      const draftText = extractSectionText(parsedSections, config.jsonKey, config.summaryKey);
      const currentValue = currentFieldValues[config.targetParam];
      if (isAlreadyTakenOver(draftText, currentValue)) {
        detected.add(config.targetParam);
      }
    }
    return detected;
  }, [parsedSections, currentFieldValues]);

  const [manuallyTakenOver, setManuallyTakenOver] = React.useState<Set<string>>(() => new Set());
  const [confirmTarget, setConfirmTarget] = React.useState<ConfirmTarget | null>(null);

  // Union of detected + manually taken over (this session)
  const takenOverSet = React.useMemo(() => {
    const combined = new Set<string>(detectedTakenOver);
    for (const p of manuallyTakenOver) combined.add(p);
    return combined;
  }, [detectedTakenOver, manuallyTakenOver]);

  const setTakenOverSet = (updater: (prev: Set<string>) => Set<string>) => {
    setManuallyTakenOver((prev) => {
      const next = updater(new Set([...detectedTakenOver, ...prev]));
      // Only keep entries that weren't already detected (to avoid duplication)
      const manualOnly = new Set<string>();
      for (const p of next) {
        if (!detectedTakenOver.has(p)) manualOnly.add(p);
      }
      return manualOnly;
    });
  };

  // Build section data
  const sectionDataList: SectionData[] = SECTION_CONFIGS.map((config) => {
    const text = extractSectionText(parsedSections, config.jsonKey, config.summaryKey);
    const subFields: SubFieldDisplay[] = (config.subFields ?? []).map((sf) => {
      const rawVal = extractSubFieldValue(parsedSections, config.jsonKey, sf.jsonKey);
      return {
        label: sf.label,
        value: rawVal ?? '',
        isNumeric: rawVal != null && isValidNumber(rawVal),
      };
    });
    return { config, text, subFields };
  });

  // Sections that have text content
  const availableSections = sectionDataList.filter((s) => s.text !== null);
  const totalAvailable = availableSections.length;
  const takenOverCount = availableSections.filter((s) =>
    takenOverSet.has(s.config.targetParam)
  ).length;
  const allTakenOver = totalAvailable > 0 && takenOverCount === totalAvailable;

  // Expanded set: default expand pending sections only; collapse ones
  // that are already taken over so the user focuses on what still needs review
  const [expandedSet, setExpandedSet] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const config of SECTION_CONFIGS) {
      const text = extractSectionText(parsedSections, config.jsonKey, config.summaryKey);
      if (text !== null && !detectedTakenOver.has(config.targetParam)) {
        initial.add(config.targetParam);
      }
    }
    return initial;
  });

  const toggleExpanded = (paramName: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(paramName)) {
        next.delete(paramName);
      } else {
        next.add(paramName);
      }
      return next;
    });
  };

  const buildValuesForSection = (data: SectionData): { paramNames: string[]; values: Record<string, unknown> } => {
    const paramNames: string[] = [data.config.targetParam];
    const values: Record<string, unknown> = { [data.config.targetParam]: data.text };

    for (const sf of data.subFields) {
      if (sf.isNumeric) {
        const numVal = parseWealthValue(sf.value);
        const sfConfig = data.config.subFields?.find((c) => c.label === sf.label);
        if (sfConfig) {
          paramNames.push(sfConfig.targetParam);
          values[sfConfig.targetParam] = numVal;
        }
      }
    }

    return { paramNames, values };
  };

  const handleSectionTakeOver = (data: SectionData) => {
    const { paramNames, values } = buildValuesForSection(data);

    // Check if any target fields have existing content
    const conflictLabels: string[] = [];
    for (const name of paramNames) {
      const current = currentFieldValues[name];
      if (current != null && current.trim() !== '') {
        const cfg = SECTION_CONFIGS.find((c) => c.targetParam === name);
        const sfCfg = SECTION_CONFIGS.flatMap((c) => c.subFields ?? []).find((sf) => sf.targetParam === name);
        conflictLabels.push(cfg?.label ?? sfCfg?.label ?? name);
      }
    }

    if (conflictLabels.length > 0) {
      setConfirmTarget({ paramNames, values, fieldLabels: conflictLabels });
    } else {
      onTakeOver(paramNames, values);
      setTakenOverSet((prev) => {
        const next = new Set(prev);
        for (const n of paramNames) next.add(n);
        return next;
      });
    }
  };

  const handleTakeOverAll = () => {
    const allParamNames: string[] = [];
    const allValues: Record<string, unknown> = {};
    const conflictLabels: string[] = [];

    for (const data of availableSections) {
      if (takenOverSet.has(data.config.targetParam)) continue;
      const { paramNames, values } = buildValuesForSection(data);
      for (const name of paramNames) {
        allParamNames.push(name);
        allValues[name] = values[name];

        const current = currentFieldValues[name];
        if (current != null && current.trim() !== '') {
          const cfg = SECTION_CONFIGS.find((c) => c.targetParam === name);
          const sfCfg = SECTION_CONFIGS.flatMap((c) => c.subFields ?? []).find((sf) => sf.targetParam === name);
          conflictLabels.push(cfg?.label ?? sfCfg?.label ?? name);
        }
      }
    }

    if (allParamNames.length === 0) return;

    if (conflictLabels.length > 0) {
      setConfirmTarget({ paramNames: allParamNames, values: allValues, fieldLabels: conflictLabels });
    } else {
      onTakeOver(allParamNames, allValues);
      setTakenOverSet((prev) => {
        const next = new Set(prev);
        for (const n of allParamNames) next.add(n);
        return next;
      });
    }
  };

  const handleConfirm = () => {
    if (!confirmTarget) return;
    onTakeOver(confirmTarget.paramNames, confirmTarget.values);
    setTakenOverSet((prev) => {
      const next = new Set(prev);
      for (const n of confirmTarget.paramNames) next.add(n);
      return next;
    });
    setConfirmTarget(null);
  };

  const handleCancelConfirm = () => {
    setConfirmTarget(null);
  };

  // Check if confirmTarget is a bulk operation (more than one section)
  const isBulkConfirm = confirmTarget != null && confirmTarget.paramNames.length > 1 &&
    SECTION_CONFIGS.filter((c) => confirmTarget.paramNames.includes(c.targetParam)).length > 1;

  return (
    <div style={containerStyles.root}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={headerStyles.title}>Agent Research Output</div>
          <div style={headerStyles.subtitle}>
            Review and take over AI-generated draft content into the KYC form.
          </div>
        </div>
        {!disabled && !allTakenOver && totalAvailable > 0 && (
          <button
            type="button"
            style={headerStyles.takeOverAllLink}
            onClick={handleTakeOverAll}
          >
            Take over all
          </button>
        )}
      </div>

      {/* Progress bar */}
      {!disabled && totalAvailable > 0 && (
        <div style={{ padding: '0 16px' }}>
          <div style={headerStyles.progressBar}>
            {availableSections.map((s, i) => (
              <div
                key={i}
                style={
                  takenOverSet.has(s.config.targetParam)
                    ? headerStyles.progressSegmentDone
                    : headerStyles.progressSegmentPending
                }
              />
            ))}
          </div>
          <div style={headerStyles.progressText}>
            {takenOverCount} of {totalAvailable} taken over
          </div>
        </div>
      )}

      {/* Pilot disclaimer */}
      <div style={disclaimerStyles.panel}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#8A7400" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={disclaimerStyles.icon}>
          <path d={icons.warning} />
        </svg>
        <div style={disclaimerStyles.text}>
          <span style={disclaimerStyles.strong}>Pilot feature.</span> The AI-based KYC draft generation is in a pilot stage and might produce incomplete or incorrect results. Please validate all information before taking it over.
        </div>
      </div>

      {/* Divider */}
      <div style={headerStyles.divider} />

      {/* Bulk confirm at top */}
      {confirmTarget && isBulkConfirm && (
        <OverwriteConfirm
          fields={confirmTarget.fieldLabels}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}

      {/* Section cards */}
      {sectionDataList.map((data) => {
        const isConfirmForThis = confirmTarget != null && !isBulkConfirm &&
          confirmTarget.paramNames.includes(data.config.targetParam);

        return (
          <React.Fragment key={data.config.targetParam}>
            <SectionCard
              config={data.config}
              text={data.text}
              subFields={data.subFields}
              isTakenOver={takenOverSet.has(data.config.targetParam)}
              isExpanded={expandedSet.has(data.config.targetParam)}
              disabled={disabled}
              onToggle={() => toggleExpanded(data.config.targetParam)}
              onTakeOver={() => handleSectionTakeOver(data)}
            />
            {isConfirmForThis && (
              <OverwriteConfirm
                fields={confirmTarget.fieldLabels}
                onConfirm={handleConfirm}
                onCancel={handleCancelConfirm}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

import * as React from 'react';
import { CardBar } from './CardBar';
import { ChipItem } from './ChipItem';
import { CardItem } from './CardItem';
import { Tooltip } from './Tooltip';
import { getCellValue } from '../utils/cellRenderer';
import { disassociateRecord, associateRecords, openLookupPicker } from '../utils/recordActions';
import { containerStyles, chipStyles, cardStyles } from '../styles/tokens';

interface RecordData {
  id: string;
  name: string;
  fields: Array<{ label: string; value: string }>;
}

interface TooltipState {
  recordId: string;
  x: number;
  y: number;
}

interface CardsContainerProps {
  dataset: ComponentFramework.PropertyTypes.DataSet;
  context: ComponentFramework.Context<unknown>;
  relationshipName: string;
}

export const CardsContainer: React.FC<CardsContainerProps> = ({
  dataset,
  context,
  relationshipName,
}) => {
  const [tooltipTarget, setTooltipTarget] = React.useState<TooltipState | null>(null);
  const tooltipTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-load all pages so every associated record is visible
  React.useEffect(() => {
    if (!dataset.loading && dataset.paging?.hasNextPage) {
      try {
        dataset.paging.loadNextPage();
      } catch { /* paging not supported */ }
    }
  }, [dataset.loading, dataset.paging]);

  // Classify columns
  const columns = React.useMemo(() => {
    return dataset.columns.filter((col) => col.displayName && col.name !== 'statecode');
  }, [dataset.columns]);

  const primaryColumn = React.useMemo(() => {
    return columns.find((col) => col.isPrimary) ?? columns[0] ?? null;
  }, [columns]);

  const nonNameColumns = React.useMemo(() => {
    if (!primaryColumn) return columns;
    return columns.filter((col) => col.name !== primaryColumn.name);
  }, [columns, primaryColumn]);

  const isCardMode = nonNameColumns.length > 0;

  // Extract record data
  const records: RecordData[] = React.useMemo(() => {
    return dataset.sortedRecordIds.map((id) => {
      const record = dataset.records[id];
      const name = primaryColumn
        ? getCellValue(record, primaryColumn) || 'Untitled'
        : 'Untitled';
      const fields: Array<{ label: string; value: string }> = [];
      for (const col of nonNameColumns) {
        const value = getCellValue(record, col);
        if (value) {
          fields.push({ label: col.displayName, value });
        }
      }
      return { id, name, fields };
    });
  }, [dataset.sortedRecordIds, dataset.records, primaryColumn, nonNameColumns]);

  // Title: try dataset title / view name, then form designer label, then fallback
  const title = React.useMemo(() => {
    // Source 1: dataset.getTitle() — returns the subgrid label from the form
    const dsAny = dataset as unknown as { getTitle?: () => string; title?: string };
    if (typeof dsAny.getTitle === 'function') {
      const t = dsAny.getTitle();
      if (t) return t;
    }
    if (dsAny.title) return dsAny.title;

    // Source 2: dataset view display name
    const viewAny = dataset as unknown as {
      getViewId?: () => string;
      columns?: Array<{ displayName?: string }>;
    };
    const viewId = viewAny.getViewId?.();
    if (viewId) {
      // View name is not directly exposed, but the dataset display-name-key
      // from the form configuration may be available via context
    }

    // Source 3: context.mode.label — control label from form designer
    const modeLabel = (context.mode as unknown as { label?: string }).label;
    if (modeLabel) return modeLabel;

    return 'Records';
  }, [context, dataset]);

  // Parent context — try multiple sources
  const parentInfo = React.useMemo(() => {
    // Source 1: context.mode.contextInfo (PCF standard)
    const info = (context.mode as unknown as {
      contextInfo?: { entityId?: string; entityTypeName?: string };
    }).contextInfo;
    if (info?.entityId && info?.entityTypeName) {
      return { entityName: info.entityTypeName, entityId: info.entityId };
    }

    // Source 2: Xrm.Page.data.entity (D365 classic)
    const xrm = (window as unknown as {
      Xrm?: {
        Page?: {
          data?: {
            entity?: {
              getEntityName?: () => string;
              getId?: () => string;
            };
          };
        };
      };
    }).Xrm;
    const xrmEntity = xrm?.Page?.data?.entity;
    if (xrmEntity?.getEntityName && xrmEntity?.getId) {
      const eName = xrmEntity.getEntityName();
      const eId = xrmEntity.getId();
      if (eName && eId) {
        return { entityName: eName, entityId: eId.replace(/[{}]/g, '') };
      }
    }

    return { entityName: '', entityId: '' };
  }, [context]);

  // Entity name from dataset
  const entityName = React.useMemo(() => {
    const dsAny = dataset as unknown as {
      getTargetEntityType?: () => string;
      entityName?: string;
    };
    if (typeof dsAny.getTargetEntityType === 'function') {
      const target = dsAny.getTargetEntityType();
      if (target) return target;
    }
    if (dataset.sortedRecordIds.length > 0) {
      const firstRecord = dataset.records[dataset.sortedRecordIds[0]];
      const ref = (firstRecord as unknown as { getNamedReference?: () => { etn?: string } }).getNamedReference?.();
      if (ref?.etn) return ref.etn;
    }
    return dsAny.entityName ?? '';
  }, [dataset]);

  // Tooltip handlers (chip mode only)
  const handleChipMouseEnter = React.useCallback((e: React.MouseEvent, recordId: string) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const x = rect.left - (containerRect?.left ?? 0);
    const y = rect.bottom - (containerRect?.top ?? 0) + 4;
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipTarget({ recordId, x, y });
    }, 300);
  }, []);

  const handleChipMouseLeave = React.useCallback(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    setTooltipTarget(null);
  }, []);

  const refreshDataset = React.useCallback(() => {
    // Reset paging to force full reload, then refresh
    try { dataset.paging?.reset?.(); } catch { /* not supported */ }
    dataset.refresh();
    // Secondary refresh after short delay to catch Dataverse propagation
    setTimeout(() => { dataset.refresh(); }, 500);
  }, [dataset]);

  // Add handler
  const handleAddClick = React.useCallback(async () => {
    if (!parentInfo.entityName || !parentInfo.entityId || !relationshipName || !entityName) return;
    const picked = await openLookupPicker(context, entityName);
    if (!picked || picked.length === 0) return;
    await associateRecords(
      parentInfo.entityName,
      parentInfo.entityId,
      relationshipName,
      entityName,
      picked.map((p) => p.id),
      refreshDataset
    );
  }, [parentInfo, relationshipName, entityName, context, refreshDataset]);

  // Remove handler
  const handleRemove = React.useCallback((recordId: string) => {
    if (!parentInfo.entityName || !parentInfo.entityId || !relationshipName) return;
    disassociateRecord(
      parentInfo.entityName,
      parentInfo.entityId,
      relationshipName,
      recordId,
      refreshDataset
    );
  }, [parentInfo, relationshipName, refreshDataset]);

  // Loading
  if (dataset.loading) {
    return (
      <div ref={containerRef} style={containerStyles.root}>
        <CardBar title={title} count={0} isLoading={true} onAddClick={handleAddClick} />
      </div>
    );
  }

  // Find tooltip record data
  const tooltipRecord = tooltipTarget
    ? records.find((r) => r.id === tooltipTarget.recordId) ?? null
    : null;

  // All fields for tooltip (including those that might be empty for this record)
  const tooltipFields = React.useMemo(() => {
    if (!tooltipTarget) return [];
    const record = dataset.records[tooltipTarget.recordId];
    if (!record) return [];
    const fields: Array<{ label: string; value: string }> = [];
    for (const col of nonNameColumns) {
      const value = getCellValue(record, col);
      if (value) {
        fields.push({ label: col.displayName, value });
      }
    }
    return fields;
  }, [tooltipTarget, dataset.records, nonNameColumns]);

  return (
    <div ref={containerRef} style={{ ...containerStyles.root, position: 'relative' as const }}>
      <CardBar
        title={title}
        count={records.length}
        isLoading={false}
        onAddClick={handleAddClick}
      />

      {records.length > 0 && (
        isCardMode ? (
          <div style={cardStyles.container}>
            {records.map((r) => (
              <CardItem
                key={r.id}
                name={r.name}
                fields={r.fields}
                onRemove={() => handleRemove(r.id)}
              />
            ))}
          </div>
        ) : (
          <div style={chipStyles.container}>
            {records.map((r) => (
              <ChipItem
                key={r.id}
                name={r.name}
                onRemove={() => handleRemove(r.id)}
                onMouseEnter={(e) => handleChipMouseEnter(e, r.id)}
                onMouseLeave={handleChipMouseLeave}
              />
            ))}
            {tooltipTarget && tooltipRecord && tooltipFields.length > 0 && (
              <Tooltip
                name={tooltipRecord.name}
                fields={tooltipFields}
                style={{ left: tooltipTarget.x, top: tooltipTarget.y }}
              />
            )}
          </div>
        )
      )}
    </div>
  );
};

import * as React from 'react';
import { CommandBar } from './CommandBar';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { EmptyState } from './EmptyState';
import { classifyColumns, rowHasDetailData } from '../utils/columnClassifier';
import { navigateToRecord, openNewRecordForm } from '../utils/navigationHelpers';
import {
  deleteRecords,
  disassociateRecords,
  associateRecords,
  openLookupPicker,
} from '../utils/recordActions';
import { containerStyles, paginationStyles } from '../styles/tokens';

interface SubgridContainerProps {
  dataset: ComponentFramework.PropertyTypes.DataSet;
  context: ComponentFramework.Context<unknown>;
  conditionalFieldsOverride?: string;
  isManyToMany?: boolean;
  relationshipName?: string;
}

export const SubgridContainer: React.FC<SubgridContainerProps> = ({
  dataset,
  context,
  conditionalFieldsOverride,
  isManyToMany = false,
  relationshipName = '',
}) => {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<0 | 1 | null>(null);
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => setContainerWidth(el.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { gridColumns, detailColumns } = React.useMemo(
    () => classifyColumns(dataset, conditionalFieldsOverride),
    [dataset, conditionalFieldsOverride]
  );

  const recordIds = dataset.sortedRecordIds;
  const primaryColumn = gridColumns.find((col) => col.isPrimary) ?? gridColumns[0];

  const rowDetailMap = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const id of recordIds) {
      map[id] = rowHasDetailData(dataset.records[id], detailColumns);
    }
    return map;
  }, [recordIds, dataset.records, detailColumns]);

  const hasExpandableRows = Object.values(rowDetailMap).some(Boolean);

  const entityName = React.useMemo(() => {
    // Prefer dataset.getTargetEntityType() — works even when grid is empty
    const dsAny = dataset as unknown as {
      getTargetEntityType?: () => string;
      entityName?: string;
    };
    if (typeof dsAny.getTargetEntityType === 'function') {
      const target = dsAny.getTargetEntityType();
      if (target) return target;
    }
    // Fallback: read from first record's named reference
    if (recordIds.length > 0) {
      const firstRecord = dataset.records[recordIds[0]];
      const ref = firstRecord.getNamedReference?.();
      if (ref?.etn) return ref.etn;
    }
    return dsAny.entityName ?? '';
  }, [recordIds, dataset]);

  const isNtoN = isManyToMany && !!relationshipName;

  // Parent entity info (from the form hosting the subgrid)
  const parentInfo = React.useMemo(() => {
    const info = (context.mode as unknown as {
      contextInfo?: { entityId?: string; entityTypeName?: string };
    }).contextInfo;
    return {
      entityName: info?.entityTypeName ?? '',
      entityId: info?.entityId ?? '',
    };
  }, [context]);

  const gridTemplateColumns = React.useMemo(() => {
    const dataCols = gridColumns.map((col) => {
      const overrideWidth = columnWidths[col.name];
      if (overrideWidth != null) {
        return `${overrideWidth}px`;
      }
      const factor = col.visualSizeFactor ?? 100;
      return `${factor}fr`;
    });
    return `32px 28px ${dataCols.join(' ')}`;
  }, [gridColumns, columnWidths]);

  // Compute current width in px for a column (used by header drag handle)
  const getColumnWidthPx = React.useCallback(
    (columnName: string): number => {
      if (columnWidths[columnName] != null) return columnWidths[columnName];
      // Fallback: estimate from container width and fr factors
      const fixedWidth = 32 + 28; // checkbox + chevron
      const totalFactor = gridColumns.reduce((sum, col) => {
        if (columnWidths[col.name] != null) return sum;
        return sum + (col.visualSizeFactor ?? 100);
      }, 0);
      const overrideSum = gridColumns.reduce((sum, col) => {
        return sum + (columnWidths[col.name] ?? 0);
      }, 0);
      const available = Math.max(0, containerWidth - fixedWidth - overrideSum);
      const col = gridColumns.find((c) => c.name === columnName);
      const factor = col?.visualSizeFactor ?? 100;
      return totalFactor > 0 ? (available * factor) / totalFactor : 100;
    },
    [columnWidths, gridColumns, containerWidth]
  );

  const handleColumnResize = React.useCallback((columnName: string, newWidthPx: number) => {
    setColumnWidths((prev) => ({ ...prev, [columnName]: newWidthPx }));
  }, []);

  const title = React.useMemo(() => {
    // Try dataset title (subgrid label from form), then context.mode.label
    const dsAny = dataset as unknown as { getTitle?: () => string; title?: string };
    if (typeof dsAny.getTitle === 'function') {
      const t = dsAny.getTitle();
      if (t) return t;
    }
    if (dsAny.title) return dsAny.title;
    const modeLabel = (context.mode as unknown as { label?: string }).label;
    if (modeLabel) return modeLabel;
    return 'Records';
  }, [context, dataset]);

  const expandableIds = React.useMemo(
    () => recordIds.filter((id) => rowDetailMap[id]),
    [recordIds, rowDetailMap]
  );
  const allExpanded = expandableIds.length > 0 && expandableIds.every((id) => expandedIds.has(id));

  const handleExpandAll = React.useCallback(() => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(expandableIds));
    }
  }, [allExpanded, expandableIds]);

  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = recordIds.length > 0 && recordIds.every((id) => selectedIds.has(id));

  const handleSelectAll = React.useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recordIds));
    }
  }, [allSelected, recordIds]);

  const handleToggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSort = React.useCallback(
    (columnName: string) => {
      // dataset.sorting is a live array — must be mutated in place, not reassigned
      while (dataset.sorting.length > 0) {
        dataset.sorting.pop();
      }

      if (sortColumn === columnName) {
        if (sortDirection === 0) {
          setSortDirection(1);
          dataset.sorting.push({ name: columnName, sortDirection: 1 });
        } else {
          setSortColumn(null);
          setSortDirection(null);
          // cleared already
        }
      } else {
        setSortColumn(columnName);
        setSortDirection(0);
        dataset.sorting.push({ name: columnName, sortDirection: 0 });
      }

      dataset.paging?.reset?.();
      dataset.refresh();
    },
    [sortColumn, sortDirection, dataset]
  );

  const handleNavigate = React.useCallback(
    (entName: string, entId: string) => {
      navigateToRecord(context, entName, entId);
    },
    [context]
  );

  const handleNewClick = React.useCallback(() => {
    openNewRecordForm(context, entityName);
  }, [context, entityName]);

  const handleAddExistingClick = React.useCallback(async () => {
    if (!isNtoN || !parentInfo.entityName || !parentInfo.entityId || !relationshipName || !entityName) {
      return;
    }
    const picked = await openLookupPicker(context, entityName);
    if (!picked || picked.length === 0) return;

    await associateRecords(
      parentInfo.entityName,
      parentInfo.entityId,
      relationshipName,
      entityName,
      picked.map((p) => p.id),
      () => {
        dataset.refresh();
      }
    );
  }, [isNtoN, parentInfo, relationshipName, entityName, context, dataset]);

  const handleDeleteClick = React.useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const onComplete = () => {
      setSelectedIds(new Set());
      dataset.refresh();
    };

    if (isNtoN) {
      disassociateRecords(
        parentInfo.entityName,
        parentInfo.entityId,
        relationshipName,
        ids,
        onComplete
      );
    } else {
      deleteRecords(context, entityName, ids, onComplete);
    }
  }, [selectedIds, isNtoN, parentInfo, relationshipName, context, entityName, dataset]);

  const handleLoadMore = React.useCallback(() => {
    try {
      dataset.paging.loadNextPage();
    } catch { /* Pagination failed */ }
  }, [dataset]);

  if (dataset.loading) {
    return (
      <div ref={containerRef} style={containerStyles.root}>
        <CommandBar title={title} recordCount={0} selectedCount={0} hasExpandableRows={false} allExpanded={false} isNtoN={isNtoN} onExpandAll={handleExpandAll} onNewClick={handleNewClick} onAddExistingClick={handleAddExistingClick} onDeleteClick={handleDeleteClick} onClearSelection={handleClearSelection} />
        <EmptyState type="loading" />
      </div>
    );
  }

  if ((dataset as unknown as { error?: boolean }).error) {
    return (
      <div ref={containerRef} style={containerStyles.root}>
        <CommandBar title={title} recordCount={0} selectedCount={0} hasExpandableRows={false} allExpanded={false} isNtoN={isNtoN} onExpandAll={handleExpandAll} onNewClick={handleNewClick} onAddExistingClick={handleAddExistingClick} onDeleteClick={handleDeleteClick} onClearSelection={handleClearSelection} />
        <EmptyState type="error" />
      </div>
    );
  }

  return (
    <div style={containerStyles.root}>
      <CommandBar title={title} recordCount={recordIds.length} selectedCount={selectedIds.size} hasExpandableRows={hasExpandableRows} allExpanded={allExpanded} isNtoN={isNtoN} onExpandAll={handleExpandAll} onNewClick={handleNewClick} onAddExistingClick={handleAddExistingClick} onDeleteClick={handleDeleteClick} onClearSelection={handleClearSelection} />

      {recordIds.length === 0 ? (
        <EmptyState type="empty" />
      ) : (
        <>
          <GridHeader gridColumns={gridColumns} gridTemplateColumns={gridTemplateColumns} sortColumn={sortColumn} sortDirection={sortDirection} allSelected={allSelected} onSort={handleSort} onSelectAll={handleSelectAll} onResize={handleColumnResize} getColumnWidthPx={getColumnWidthPx} />

          {recordIds.map((id) => (
            <GridRow key={id} record={dataset.records[id]} recordId={id} gridColumns={gridColumns} detailColumns={detailColumns} gridTemplateColumns={gridTemplateColumns} isExpanded={expandedIds.has(id)} isSelected={selectedIds.has(id)} hasDetail={rowDetailMap[id]} primaryColumnName={primaryColumn?.name ?? ''} entityName={entityName} context={context} onToggleExpand={handleToggleExpand} onToggleSelect={handleToggleSelect} onNavigate={handleNavigate} />
          ))}

          {dataset.paging?.hasNextPage && (
            <div style={paginationStyles.root}>
              <button style={paginationStyles.button} type="button" onClick={handleLoadMore}>
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

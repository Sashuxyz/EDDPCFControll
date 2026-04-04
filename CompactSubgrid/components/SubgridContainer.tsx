import * as React from 'react';
import { CommandBar } from './CommandBar';
import { GridHeader } from './GridHeader';
import { GridRow } from './GridRow';
import { EmptyState } from './EmptyState';
import { classifyColumns, rowHasDetailData } from '../utils/columnClassifier';
import { navigateToRecord, openNewRecordForm } from '../utils/navigationHelpers';
import { deleteRecords, disassociateRecords } from '../utils/recordActions';
import { containerStyles, paginationStyles } from '../styles/tokens';

interface SubgridContainerProps {
  dataset: ComponentFramework.PropertyTypes.DataSet;
  context: ComponentFramework.Context<unknown>;
  conditionalFieldsOverride?: string;
}

export const SubgridContainer: React.FC<SubgridContainerProps> = ({
  dataset,
  context,
  conditionalFieldsOverride,
}) => {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<0 | 1 | null>(null);

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
    if (recordIds.length === 0) return '';
    const firstRecord = dataset.records[recordIds[0]];
    const ref = firstRecord.getNamedReference?.();
    return ref?.etn ?? (dataset as unknown as { entityName?: string }).entityName ?? '';
  }, [recordIds, dataset]);

  const isNtoN = React.useMemo(() => {
    const dsAny = dataset as unknown as Record<string, unknown>;
    const linking = dsAny.linking;
    if (linking && typeof linking === 'object') {
      const linkObj = linking as Record<string, unknown>;
      return linkObj.linkEntityName != null;
    }
    return false;
  }, [dataset]);

  const gridTemplateColumns = React.useMemo(() => {
    const dataCols = gridColumns.map((col) => {
      const factor = col.visualSizeFactor ?? 100;
      return `${factor}fr`;
    });
    return `32px 28px ${dataCols.join(' ')}`;
  }, [gridColumns]);

  const title = React.useMemo(() => {
    const dsAny = dataset as unknown as Record<string, unknown>;
    if (typeof dsAny.getTitle === 'function') {
      return (dsAny.getTitle as () => string)() || 'Records';
    }
    return 'Records';
  }, [dataset]);

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
      if (sortColumn === columnName) {
        if (sortDirection === 0) {
          setSortDirection(1);
          dataset.sorting = [{ name: columnName, sortDirection: 1 }];
        } else {
          setSortColumn(null);
          setSortDirection(null);
          dataset.sorting = [];
        }
      } else {
        setSortColumn(columnName);
        setSortDirection(0);
        dataset.sorting = [{ name: columnName, sortDirection: 0 }];
      }
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

  const handleDeleteClick = React.useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const onComplete = () => {
      setSelectedIds(new Set());
      dataset.refresh();
    };

    if (isNtoN) {
      disassociateRecords(context, ids, onComplete);
    } else {
      deleteRecords(context, entityName, ids, onComplete);
    }
  }, [selectedIds, isNtoN, context, entityName, dataset]);

  const handleLoadMore = React.useCallback(() => {
    try {
      dataset.paging.loadNextPage();
    } catch { /* Pagination failed */ }
  }, [dataset]);

  if (dataset.loading) {
    return (
      <div style={containerStyles.root}>
        <CommandBar title={title} recordCount={0} selectedCount={0} hasExpandableRows={false} allExpanded={false} isNtoN={false} onExpandAll={handleExpandAll} onNewClick={handleNewClick} onDeleteClick={handleDeleteClick} onClearSelection={handleClearSelection} />
        <EmptyState type="loading" />
      </div>
    );
  }

  if ((dataset as unknown as { error?: boolean }).error) {
    return (
      <div style={containerStyles.root}>
        <CommandBar title={title} recordCount={0} selectedCount={0} hasExpandableRows={false} allExpanded={false} isNtoN={false} onExpandAll={handleExpandAll} onNewClick={handleNewClick} onDeleteClick={handleDeleteClick} onClearSelection={handleClearSelection} />
        <EmptyState type="error" />
      </div>
    );
  }

  return (
    <div style={containerStyles.root}>
      <CommandBar title={title} recordCount={recordIds.length} selectedCount={selectedIds.size} hasExpandableRows={hasExpandableRows} allExpanded={allExpanded} isNtoN={isNtoN} onExpandAll={handleExpandAll} onNewClick={handleNewClick} onDeleteClick={handleDeleteClick} onClearSelection={handleClearSelection} />

      {recordIds.length === 0 ? (
        <EmptyState type="empty" />
      ) : (
        <>
          <GridHeader gridColumns={gridColumns} gridTemplateColumns={gridTemplateColumns} sortColumn={sortColumn} sortDirection={sortDirection} allSelected={allSelected} onSort={handleSort} onSelectAll={handleSelectAll} />

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

// React context that provides the PCF host's lookupObjects function to any
// editable LookupEdit component nested inside the takeover tree. index.ts
// captures context.utils.lookupObjects (bound to context.utils) and passes
// it down so we don't have to drill it through every section.

import * as React from 'react';

export type LookupObjectsFn = (
  options: ComponentFramework.UtilityApi.LookupOptions,
) => Promise<ComponentFramework.LookupValue[]>;

export const LookupObjectsContext = React.createContext<LookupObjectsFn | null>(null);

export const useLookupObjects = (): LookupObjectsFn | null =>
  React.useContext(LookupObjectsContext);

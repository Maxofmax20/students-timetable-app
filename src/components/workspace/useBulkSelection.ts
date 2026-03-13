import { useCallback, useMemo, useState } from 'react';

export function useBulkSelection(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visibleSet = useMemo(() => new Set(ids), [ids]);
  const selectedVisibleCount = useMemo(() => {
    let count = 0;
    for (const id of selected) {
      if (visibleSet.has(id)) count += 1;
    }
    return count;
  }, [selected, visibleSet]);

  const allVisibleSelected = ids.length > 0 && selectedVisibleCount === ids.length;

  const toggleOne = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleVisible = useCallback(() => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }, [allVisibleSelected, ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const pruneTo = useCallback((allowedIds: string[]) => {
    const allowed = new Set(allowedIds);
    setSelected((current) => {
      const next = new Set<string>();
      for (const id of current) {
        if (allowed.has(id)) next.add(id);
      }
      return next;
    });
  }, []);

  return {
    selected,
    selectedCount: selected.size,
    selectedVisibleCount,
    allVisibleSelected,
    isSelected: (id: string) => selected.has(id),
    toggleOne,
    toggleVisible,
    clear,
    pruneTo
  };
}

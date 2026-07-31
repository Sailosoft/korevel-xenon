// BunnyTable.Column.Mapping.ts
//
// Data-record field mapping helpers for BunnyColumn.
//
// A column can declare a `mapping` that resolves a foreign-key style field
// (e.g. `patternId`) against a related record set fetched from the database,
// then display a selected property from the matched record (e.g. `name`).

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BunnyColumn, BunnyColumnMapping } from "./BunnyTable.Interface";

/**
 * A lookup of resolved related records, keyed by the column mapping object.
 */
export type ColumnRecordsMap = ReadonlyMap<
  BunnyColumnMapping<unknown>,
  ReadonlyArray<Record<string, unknown>>
>;

/**
 * Safely reads a property (or dot-path such as "owner.name") from an object.
 */
export function getByPath(source: unknown, path: string): unknown {
  if (source === null || source === undefined || !path) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

/**
 * Collects the unique column mappings and loads their related records once.
 * Records are cached by the mapping object reference, so re-renders do not
 * trigger redundant fetches.
 */
export function useBunnyColumnMappings<TRow>(
  columns: BunnyColumn<TRow>[],
): ColumnRecordsMap {
  const mappings = useMemo(() => {
    const seen = new Set<BunnyColumnMapping<unknown>>();
    const list: BunnyColumnMapping<unknown>[] = [];
    for (const col of columns) {
      const mapping = col.mapping as BunnyColumnMapping<unknown> | undefined;
      if (mapping && !seen.has(mapping)) {
        seen.add(mapping);
        list.push(mapping);
      }
    }
    return list;
  }, [columns]);

  const [recordsMap, setRecordsMap] = useState<ColumnRecordsMap>(new Map());

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      mappings.map(async (mapping) => {
        try {
          const records = await mapping.getRecords();
          return [
            mapping,
            records as ReadonlyArray<Record<string, unknown>>,
          ] as const;
        } catch (error) {
          console.error("Bunny column mapping failed to load records:", error);
          return [mapping, []] as const;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setRecordsMap(new Map(results));
    });

    return () => {
      cancelled = true;
    };
  }, [mappings]);

  return recordsMap;
}

/**
 * Resolves the display content for a single column cell, honoring
 * `render` → `mapping` → `format` precedence.
 */
export function resolveColumnContent<TRow>(
  column: BunnyColumn<TRow>,
  row: TRow,
  recordsMap: ColumnRecordsMap,
): { render?: ReactNode; value?: unknown } {
  // Custom renderer always wins.
  if (column.render) {
    return { render: column.render(row, column) };
  }

  // Foreign-key style mapping: field value → related record → label property.
  if (column.mapping) {
    const rowRecord = row as Record<string, unknown>;
    const rawValue = rowRecord[column.field];
    const key = column.mapping.key ?? "id";
    const match = (
      recordsMap.get(column.mapping as BunnyColumnMapping<unknown>) ?? []
    ).find((record) => String(record[key]) === String(rawValue));

    if (column.mapping.render) {
      return { render: column.mapping.render(match, row, column) };
    }

    if (match) {
      const label = column.mapping.label ?? "name";
      return { value: getByPath(match, label) };
    }

    return { value: column.mapping.fallback ?? rawValue };
  }

  const rowRecord = row as Record<string, unknown>;
  const rawValue = rowRecord[column.field];
  const formattedValue = column.format
    ? column.format(rawValue, row, column)
    : rawValue;
  return { value: formattedValue };
}

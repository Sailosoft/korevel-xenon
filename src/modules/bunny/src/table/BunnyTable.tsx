"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Checkbox,
  cn,
  type Selection,
  type SortDescriptor,
  Virtualizer,
  TableLayout,
} from "@heroui/react";
import { ChevronUp } from "lucide-react";

import { useBunnyConfig } from "../context/BunnyContext";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import BunnyTableEmpty from "./BunnyTable.Empty";
import BunnyTableLoading from "./BunnyTable.Loading";
import { useBunnyRowActionCallback } from "../rows/BunnyRow.Action.Callback";
import { BunnyHasId } from "../Bunny.Interface";
import { BunnyRowAction } from "./BunnyTable.Interface";

function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: React.ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center justify-between w-full">
      {children}
      {!!sortDirection && (
        <ChevronUp
          size={12}
          className={cn(
            "transform transition-transform duration-100 ease-out",
            sortDirection === "descending" ? "rotate-180" : "",
          )}
        />
      )}
    </span>
  );
}

type BunnyTableProps = {
  className?: string;
};

export function BunnyTable<TRow extends Record<string, unknown>>({
  className,
}: BunnyTableProps) {
  const {
    columns,
    rowActions: actions,
    rowKey,
    tableHeight,
    rowActionsColLength,
  } = useBunnyConfig();
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [sortDescriptor, setSortDescriptor] = useState<
    SortDescriptor | undefined
  >();

  const { table } = useAdminPanelContext<TRow, unknown>();
  const { rows, setSelection, selectionMode, isLoading } = table;
  const { callAction } = useBunnyRowActionCallback();

  const actionColumnLength = useMemo(
    () => rowActionsColLength ?? 120,
    [rowActionsColLength],
  );

  const sortedItems = useMemo(() => {
    if (!sortDescriptor) return rows;

    return [...rows].sort((a, b) => {
      const col = sortDescriptor.column as keyof TRow;
      const first = String(a[col] ?? "");
      const second = String(b[col] ?? "");
      const cmp = first.localeCompare(second);
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [rows, sortDescriptor]);

  // Sync selection
  useEffect(() => {
    let selectedArray: string[] = [];

    if (selectedKeys === "all") {
      selectedArray = rows.map((row) => String(row[rowKey]));
    } else {
      selectedArray = Array.from(selectedKeys as Set<string | number>).map(
        String,
      );
    }

    setSelection(selectedArray);
  }, [selectedKeys, rows, rowKey, setSelection]);

  const defaultHeight = "700px";
  const internalTableHeight = tableHeight
    ? typeof tableHeight === "number"
      ? `${tableHeight}px`
      : tableHeight
    : defaultHeight;

  return (
    <Virtualizer
      layout={TableLayout}
      layoutOptions={{
        headingHeight: 42,
        rowHeight: 49, // Adjust if your rows are taller
      }}
    >
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Bunny Virtualized Table"
            className={cn("min-w-[800px] overflow-auto", className)}
            style={{ height: internalTableHeight }} // Critical for virtualization
            selectedKeys={selectedKeys}
            selectionMode={selectionMode}
            sortDescriptor={sortDescriptor}
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
          >
            <Table.Header className="h-full w-full">
              {/* Selection Column */}
              {selectionMode !== "none" && (
                <Table.Column className="pr-0" width={40}>
                  <Checkbox aria-label="Select all" slot="selection">
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox>
                </Table.Column>
              )}

              {/* Dynamic Columns */}
              {columns.map((col, index) => (
                <Table.Column
                  key={`col-${String(col.field)}-${index}`}
                  id={String(col.field)}
                  allowsSorting={col.sortable}
                  isRowHeader={col.isRowHeader}
                >
                  {({ sortDirection }) =>
                    col.sortable ? (
                      <SortableColumnHeader sortDirection={sortDirection}>
                        {col.header}
                      </SortableColumnHeader>
                    ) : (
                      col.header
                    )
                  }
                </Table.Column>
              ))}

              {/* Actions Column */}
              {actions && actions.length > 0 && (
                <Table.Column className="text-end" width={actionColumnLength}>
                  Actions
                </Table.Column>
              )}
            </Table.Header>

            <Table.Body
              renderEmptyState={() =>
                isLoading ? <BunnyTableLoading /> : <BunnyTableEmpty />
              }
            >
              {isLoading
                ? undefined
                : sortedItems.map((row) => (
                    <Table.Row
                      key={String(row[rowKey])}
                      id={String(row[rowKey])}
                    >
                      {/* Selection Cell */}
                      {selectionMode !== "none" && (
                        <Table.Cell className="pr-0">
                          <Checkbox
                            aria-label="Select row"
                            slot="selection"
                            variant="secondary"
                          >
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox>
                        </Table.Cell>
                      )}

                      {/* Data Cells */}
                      {columns.map((col, index) => (
                        <Table.Cell key={`cell-${String(col.field)}-${index}`}>
                          {col.render
                            ? col.render(row, col)
                            : (row[col.field] as React.ReactNode)}
                        </Table.Cell>
                      ))}

                      {/* Actions Cell */}
                      {actions && (
                        <Table.Cell>
                          <div className="flex items-center justify-end gap-1">
                            {actions.map((action, idx) => (
                              <Button
                                key={idx}
                                isIconOnly
                                size="sm"
                                variant={action.variant}
                                onClick={() =>
                                  callAction(
                                    action as BunnyRowAction<BunnyHasId>,
                                    row as unknown as BunnyHasId,
                                  )
                                }
                              >
                                {action.icon}
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </Table.Cell>
                      )}
                    </Table.Row>
                  ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </Virtualizer>
  );
}

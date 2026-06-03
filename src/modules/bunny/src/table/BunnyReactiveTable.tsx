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

// Custom hook to determine screen size matches responsive layout shifts (< 768px)
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < breakpoint);
    checkSize(); // Initial setup on client mount
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, [breakpoint]);

  return isMobile;
}

type BunnyTableProps = {
  className?: string;
};

export function BunnyReactiveTable<TRow extends Record<string, unknown>>({
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

  const isMobile = useIsMobile();

  const actionColumnLength = useMemo(
    () => rowActionsColLength ?? 150,
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

  // Sync selection state back to context hooks
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
        headingHeight: isMobile ? 0 : 42, // Shrinks layout header space on mobile viewports
        rowHeight: isMobile ? 200 : 49, // Taller row constraints for card layout stacks
      }}
    >
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="Bunny Virtualized Table"
            className={cn(
              "w-full overflow-auto",
              !isMobile && "min-w-[800px]",
              className,
            )}
            style={{ height: internalTableHeight }}
            selectedKeys={selectedKeys}
            selectionMode={selectionMode}
            sortDescriptor={sortDescriptor}
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
          >
            {/* Dynamic key configuration forces layout unmount, bypassing collection node tracking issues */}
            <Table.Header
              key={isMobile ? "mobile-view-header" : "desktop-view-header"}
              className="h-full w-full"
            >
              {isMobile ? (
                <Table.Column id="mobile-list-col" isRowHeader>
                  Items
                </Table.Column>
              ) : (
                <>
                  {selectionMode !== "none" && (
                    <Table.Column
                      id="selection-col"
                      className="pr-0"
                      width={40}
                    >
                      <Checkbox aria-label="Select all" slot="selection">
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox>
                    </Table.Column>
                  )}

                  {columns.map((col) => (
                    <Table.Column
                      key={String(col.field)}
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

                  {actions && actions.length > 0 && (
                    <Table.Column
                      id="actions-col"
                      className="text-end"
                      width={actionColumnLength}
                    >
                      Actions
                    </Table.Column>
                  )}
                </>
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
                      {isMobile ? (
                        /* MOBILE CARD UI */
                        <Table.Cell>
                          <div className="flex flex-col p-3 border border-default-200 rounded-xl gap-3 w-full bg-content1 shadow-sm text-left">
                            {/* Top row controls */}
                            <div className="flex items-center justify-between border-b border-default-100 pb-2">
                              <div className="flex items-center gap-2">
                                {selectionMode !== "none" && (
                                  <Checkbox
                                    aria-label="Select row"
                                    slot="selection"
                                    variant="secondary"
                                  >
                                    <Checkbox.Control>
                                      <Checkbox.Indicator />
                                    </Checkbox.Control>
                                  </Checkbox>
                                )}
                                <span className="font-semibold text-sm">
                                  {String(
                                    row[columns[0]?.field as keyof TRow] ?? "",
                                  ).slice(0, 50)}
                                </span>
                              </div>

                              {/* Row Actions pinned top right */}
                              {actions && (
                                <div className="flex items-center gap-1">
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
                              )}
                            </div>

                            {/* Value Grid mapping */}
                            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                              {columns.map((col) => (
                                <div
                                  key={String(col.field)}
                                  className="contents"
                                >
                                  <span className="text-default-500 font-medium">
                                    {String(col.header)}:
                                  </span>
                                  <span className="text-default-800 text-right truncate">
                                    {col.render
                                      ? col.render(row, col)
                                      : String(
                                          row[col.field as keyof TRow] ?? "",
                                        )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </Table.Cell>
                      ) : (
                        /* DESKTOP ROW UI */
                        <>
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

                          {columns.map((col) => (
                            <Table.Cell key={String(col.field)}>
                              {col.render
                                ? col.render(row, col)
                                : String(
                                    row[col.field as keyof TRow] ?? "",
                                  ).slice(0, 50)}
                            </Table.Cell>
                          ))}

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
                        </>
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

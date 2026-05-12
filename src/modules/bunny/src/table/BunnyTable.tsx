"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Checkbox,
  cn,
  type Selection,
  type SortDescriptor,
} from "@heroui/react";
import { ChevronUp } from "lucide-react";
import { useBunnyConfig } from "../context/BunnyContext";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import BunnyTableEmpty from "./BunnyTable.Empty";
import BunnyTableLoading from "./BunnyTable.Loading";

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
          size={12} // Equivalent to size-3 (12px)
          className={cn(
            "transform transition-transform duration-100 ease-out",
            sortDirection === "descending" ? "rotate-180" : "",
          )}
        />
      )}
    </span>
  );
}

export function BunnyTable<TRow extends Record<string, any>>() {
  const { columns, rowActions: actions, rowKey } = useBunnyConfig();
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  // const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
  //   column: String(columns[0]?.field),
  //   direction: "ascending",
  // });
  const [sortDescriptor, setSortDescriptor] = useState<
    SortDescriptor | undefined
  >();

  const { table } = useAdminPanelContext<TRow>();
  const { rows, setSelection, selectionMode, isLoading } = table;

  const sortedItems = useMemo(() => {
    if (!sortDescriptor) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const col = sortDescriptor?.column as keyof TRow;
      const first = String(a[col] ?? "");
      const second = String(b[col] ?? "");
      let cmp = first.localeCompare(second);

      return sortDescriptor?.direction === "descending" ? -cmp : cmp;
    });
  }, [rows, sortDescriptor]);

  useEffect(() => {
    setSelection(selectedKeys as any);
  }, [selectedKeys]);

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Reusable Bunny Table"
          className="min-w-[800px]"
          selectedKeys={selectedKeys}
          selectionMode={selectionMode}
          sortDescriptor={sortDescriptor}
          onSelectionChange={setSelectedKeys}
          onSortChange={setSortDescriptor}
        >
          <Table.Header>
            {/* Selection Checkbox Column */}
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
            {columns.map((col) => (
              <Table.Column
                key={String(col.field)}
                id={String(col.field)}
                allowsSorting={col.sortable}
                isRowHeader={col.isRowHeader}
                // width={col.width}
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
              <Table.Column className="text-end" width={120}>
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
                  <Table.Row key={row[rowKey as any]} id={row[rowKey as any]}>
                    {/* Row Selection Cell */}
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
                    {columns.map((col) => (
                      <Table.Cell key={String(col.field)}>
                        {col.render
                          ? col.render(row, col)
                          : row[col.field as keyof TRow]}
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
                              variant={action.variant as any}
                              onClick={() => action.onClick(row)}
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
  );
}

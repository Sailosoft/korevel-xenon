"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Checkbox,
  cn,
  Tooltip,
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
import {
  BunnyColumn,
  BunnyRowAction,
  BunnyTableMobileView,
} from "./BunnyTable.Interface";

// ============================================================================
// SUB-COMPONENTS & HOOKS
// ============================================================================

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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < breakpoint);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, [breakpoint]);

  return isMobile;
}

interface TableHeadingsProps<TRow> {
  isMobile: boolean;
  selectionMode: string;
  columns: BunnyColumn<TRow>[];
  actions: BunnyRowAction<TRow>[] | undefined;
  actionColumnLength: number;
}

function TableHeadings<TRow>({
  isMobile,
  selectionMode,
  columns,
  actions,
  actionColumnLength,
}: TableHeadingsProps<TRow>) {
  if (isMobile) {
    return (
      <Table.Column id="mobile-list-col" isRowHeader>
        Items
      </Table.Column>
    );
  }

  return (
    <>
      {selectionMode !== "none" && (
        <Table.Column id="selection-col" className="pr-0" width={40}>
          <Checkbox aria-label="Select all" slot="selection">
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox>
        </Table.Column>
      )}

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
  );
}

interface RowUiProps<TRow> {
  row: TRow;
  columns: BunnyColumn<TRow>[];
  selectionMode: string;
  actions: BunnyRowAction<TRow>[] | undefined;
  tableMobileView?: BunnyTableMobileView<TRow>;
  callAction: (action: BunnyRowAction<BunnyHasId>, row: BunnyHasId) => void;
}

function MobileCardCell<TRow>({
  row,
  columns,
  selectionMode,
  actions,
  tableMobileView,
  callAction,
}: RowUiProps<TRow>) {
  return (
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
              {String(row[columns[0]?.field as keyof TRow] ?? "").slice(0, 50)}
            </span>
          </div>

          {/* Row Actions pinned top right */}
          {actions && (
            <div className="flex items-center gap-1">
              {actions.map((action, idx) =>
                action.icon && action.label ? (
                  <Tooltip key={idx}>
                    <Button
                      isIconOnly
                      size="sm"
                      variant={action.variant}
                      onClick={() =>
                        callAction(
                          action as unknown as BunnyRowAction<BunnyHasId>,
                          row as unknown as BunnyHasId,
                        )
                      }
                    >
                      {action.icon}
                    </Button>
                    <Tooltip.Content>{action.label}</Tooltip.Content>
                  </Tooltip>
                ) : (
                  <Button
                    key={idx}
                    isIconOnly
                    size="sm"
                    variant={action.variant}
                    onClick={() =>
                      callAction(
                        action as unknown as BunnyRowAction<BunnyHasId>,
                        row as unknown as BunnyHasId,
                      )
                    }
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ),
              )}
            </div>
          )}
        </div>

        {tableMobileView ? (
          tableMobileView(row, columns)
        ) : (
          /* Default Value Grid mapping fallback */
          <div className="grid grid-cols-2 gap-y-1.5 text-xs">
            {columns.map((col, index) => (
              <div
                key={`cell-${String(col.field)}-${index}`}
                className="contents"
              >
                <span className="text-default-500 font-medium">
                  {String(col.header)}:
                </span>
                <span className="text-default-800 text-right truncate">
                  {col.render
                    ? col.render(row, col)
                    : String(row[col.field as keyof TRow] ?? "")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Table.Cell>
  );
}

function DesktopRowCells<TRow>({
  row,
  columns,
  selectionMode,
  actions,
  callAction,
}: RowUiProps<TRow>) {
  return (
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

      {columns.map((col, index) => (
        <Table.Cell key={`cell-${String(col.field)}-${index}`}>
          {col.render
            ? col.render(row, col)
            : String(row[col.field as keyof TRow] ?? "").slice(0, 50)}
        </Table.Cell>
      ))}

      {actions && (
        <Table.Cell>
          <div className="flex items-center justify-end gap-1">
            {actions.map((action, idx) =>
              action.icon && action.label ? (
                <Tooltip key={idx}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant={action.variant}
                    onClick={() =>
                      callAction(
                        action as unknown as BunnyRowAction<BunnyHasId>,
                        row as unknown as BunnyHasId,
                      )
                    }
                  >
                    {action.icon}
                  </Button>
                  <Tooltip.Content>{action.label}</Tooltip.Content>
                </Tooltip>
              ) : (
                <Button
                  key={idx}
                  isIconOnly
                  size="sm"
                  variant={action.variant}
                  onClick={() =>
                    callAction(
                      action as unknown as BunnyRowAction<BunnyHasId>,
                      row as unknown as BunnyHasId,
                    )
                  }
                >
                  {action.icon}
                  {action.label}
                </Button>
              ),
            )}
          </div>
        </Table.Cell>
      )}
    </>
  );
}

// ============================================================================
// MAIN REACTIVE TABLE COMPONENT
// ============================================================================

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
    tableMode,
    tableMobileView,
  } = useBunnyConfig();
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [sortDescriptor, setSortDescriptor] = useState<
    SortDescriptor | undefined
  >();

  const { table } = useAdminPanelContext<TRow, unknown>();
  const { rows, setSelection, selectionMode, isLoading } = table;
  const { callAction } = useBunnyRowActionCallback();

  const isMobileRaw = useIsMobile();

  const isMobile = useMemo(() => {
    if (tableMode === "mobile") return true;
    if (tableMode === "desktop") return false;
    return isMobileRaw;
  }, [tableMode, isMobileRaw]);

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
        headingHeight: isMobile ? 0 : 42,
        rowHeight: isMobile ? 200 : 49,
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
            <Table.Header
              key={isMobile ? "mobile-view-header" : "desktop-view-header"}
              className="h-full w-full"
            >
              <TableHeadings
                isMobile={isMobile}
                selectionMode={selectionMode}
                columns={columns}
                actions={actions}
                actionColumnLength={actionColumnLength}
              />
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
                        <MobileCardCell
                          row={row}
                          columns={columns}
                          selectionMode={selectionMode}
                          actions={actions}
                          callAction={callAction}
                          tableMobileView={tableMobileView}
                        />
                      ) : (
                        <DesktopRowCells
                          row={row}
                          columns={columns}
                          selectionMode={selectionMode}
                          actions={actions}
                          callAction={callAction}
                        />
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

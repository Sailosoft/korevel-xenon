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
import {
  ColumnRecordsMap,
  resolveColumnContent,
  useBunnyColumnMappings,
} from "./BunnyTable.Column.Mapping";

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

interface RowActionTooltipProps<TRow> {
  action: BunnyRowAction<TRow>;
  row: TRow;
  callAction: (action: BunnyRowAction<BunnyHasId>, row: BunnyHasId) => void;
  children: React.ReactNode;
}

/**
 * Renders a single row-action button wrapped in a HeroUI Tooltip.
 *
 * The open state is fully controlled here rather than relying on react-aria's
 * `TooltipTrigger` hover handlers, which gate opening on the interaction
 * modality being `"pointer"`. After a programmatic focus (common inside the
 * virtualized table) the modality is `"virtual"`, so the first hover is
 * silently dropped and the tooltip only appears after hovering another icon.
 * `trigger="focus"` disables that hover path; explicit `onMouseEnter` /
 * `onMouseLeave` handlers drive `isOpen` deterministically, and `delay={0}` /
 * `closeDelay={0}` skip the global warm-up/cooldown timers.
 */
function RowActionTooltip<TRow>({
  action,
  row,
  callAction,
  children,
}: RowActionTooltipProps<TRow>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Tooltip
      trigger="focus"
      delay={0}
      closeDelay={0}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <Button
        isIconOnly
        size="sm"
        variant={action.variant}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() =>
          callAction(
            action as unknown as BunnyRowAction<BunnyHasId>,
            row as unknown as BunnyHasId,
          )
        }
      >
        {children}
      </Button>
      <Tooltip.Content>{action.label}</Tooltip.Content>
    </Tooltip>
  );
}

interface RowUiProps<TRow> {
  row: TRow;
  columns: BunnyColumn<TRow>[];
  selectionMode: string;
  actions: BunnyRowAction<TRow>[] | undefined;
  tableMobileView?: BunnyTableMobileView<TRow>;
  callAction: (action: BunnyRowAction<BunnyHasId>, row: BunnyHasId) => void;
  recordsMap: ColumnRecordsMap;
}

function MobileCardCell<TRow>({
  row,
  columns,
  selectionMode,
  actions,
  tableMobileView,
  callAction,
  recordsMap,
}: RowUiProps<TRow>) {
  return (
    <Table.Cell>
      <div className="flex flex-col p-3 border border-default-200 rounded-xl gap-2 w-full bg-content1 shadow-sm text-left">
        {/* Top row controls — wraps actions below on narrow screens */}
        <div className="flex items-start gap-2 border-b border-default-100 pb-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
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
              {(() => {
                const firstCol = columns[0];
                if (!firstCol) return "";
                const content = resolveColumnContent(
                  firstCol,
                  row,
                  recordsMap,
                );
                return (
                  content.render ?? String(content.value ?? "").slice(0, 50)
                );
              })()}
            </span>
          </div>

          {/* Row Actions — wraps below title when space is tight */}
          {actions && (
            <div className="flex items-center gap-1 flex-shrink-0 self-center ml-auto">
              {actions.map((action, idx) =>
                action.label ? (
                  <RowActionTooltip
                    key={idx}
                    action={action}
                    row={row}
                    callAction={callAction}
                  >
                    {action.icon}
                  </RowActionTooltip>
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
            {columns.map((col, index) => {
              const content = resolveColumnContent(col, row, recordsMap);
              return (
                <div
                  key={`cell-${String(col.field)}-${index}`}
                  className="contents"
                >
                  <span className="text-default-500 font-medium">
                    {String(col.header)}:
                  </span>
                  <span className="text-default-800 text-right truncate">
                    {content.render ?? String(content.value ?? "")}
                  </span>
                </div>
              );
            })}
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
  recordsMap,
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

      {columns.map((col, index) => {
        const content = resolveColumnContent(col, row, recordsMap);
        return (
          <Table.Cell key={`cell-${String(col.field)}-${index}`}>
            {content.render ?? String(content.value ?? "").slice(0, 50)}
          </Table.Cell>
        );
      })}

      {actions && (
        <Table.Cell>
          <div className="flex items-center justify-end gap-1">
            {actions.map((action, idx) =>
              action.label ? (
                <RowActionTooltip
                  key={idx}
                  action={action}
                  row={row}
                  callAction={callAction}
                >
                  {action.icon}
                </RowActionTooltip>
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

  const recordsMap = useBunnyColumnMappings(columns);

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
              {isMobile ? (
                <Table.Column id="mobile-list-col" isRowHeader>
                  Items
                </Table.Column>
              ) : (
                <>
                  {selectionMode !== "none" && (
                    <Table.Column className="pr-0" width={40}>
                      {/*
                       * HeroUI Checkbox renders CheckboxField (no <input>).
                       * Click interaction for row checkboxes comes from the
                       * Table.Row press handler — the header row has none.
                       * We keep slot="selection" for visual state from the
                       * slot provider, and add an onPointerDown wrapper to
                       * make the checkbox interactive.
                       */}
                      <div
                        role="presentation"
                        onPointerDown={(e) => {
                          // Prevent the column header's sort handler
                          e.stopPropagation();
                          setSelectedKeys((prev) =>
                            prev === "all" ? new Set() : "all",
                          );
                        }}
                      >
                        <Checkbox
                          aria-label="Select all"
                          slot="selection"
                        >
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox>
                      </div>
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
                        <MobileCardCell
                          row={row}
                          columns={columns}
                          selectionMode={selectionMode}
                          actions={actions}
                          callAction={callAction}
                          tableMobileView={tableMobileView}
                          recordsMap={recordsMap}
                        />
                      ) : (
                        <DesktopRowCells
                          row={row}
                          columns={columns}
                          selectionMode={selectionMode}
                          actions={actions}
                          callAction={callAction}
                          recordsMap={recordsMap}
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

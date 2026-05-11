"use client";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Pagination,
} from "@heroui/react";
import { ElvenColumn } from "../interfaces/elven.interface";
import { useMemo, useState, ChangeEvent } from "react";
import { Search } from "lucide-react";

interface ElvenDataGridProps<T> {
  columns: ElvenColumn<T>[];
  data: T[];
  label: string;
}

export function ElvenDataGrid<
  T extends { id?: string | number; [key: string]: any },
>({ columns, data, label }: ElvenDataGridProps<T>) {
  // --- States ---
  const [filterValue, setFilterValue] = useState("");
  const [rowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState<{
    column: string;
    direction: "ascending" | "descending";
  }>({
    column: "id",
    direction: "ascending",
  });

  // --- Logic: Filtering ---
  const filteredItems = useMemo(() => {
    let filteredData = [...data];
    if (filterValue) {
      filteredData = filteredData.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(filterValue.toLowerCase()),
        ),
      );
    }
    return filteredData;
  }, [data, filterValue]);

  // --- Logic: Sorting ---
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const first = a[sortDescriptor.column];
      const second = b[sortDescriptor.column];
      const cmp = first < second ? -1 : first > second ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, filteredItems]);

  // --- Logic: Pagination ---
  const totalPages = Math.ceil(sortedItems.length / rowsPerPage);
  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedItems.slice(start, start + rowsPerPage);
  }, [page, sortedItems, rowsPerPage]);

  return (
    <div className="w-full text-foreground space-y-4">
      {/* Search Filter */}
      <div className="flex flex-col gap-4">
        <div className="relative flex items-center w-full sm:max-w-[44%]">
          <div className="absolute left-3 text-muted-foreground pointer-events-none">
            <Search size={18} />
          </div>
          <Input
            className="pl-10 w-full"
            placeholder="Search items..."
            value={filterValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setFilterValue(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Table aria-label={label} className="w-full shadow-sm border-none">
        <Table.ScrollContainer>
          <Table.Content aria-label={`${label} content`}>
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  isRowHeader={column.key === "id"}
                  className="cursor-pointer select-none"
                  onClick={() => {
                    if (column.key === "actions") return;
                    setSortDescriptor({
                      column: column.key as string,
                      direction:
                        sortDescriptor.column === column.key &&
                        sortDescriptor.direction === "ascending"
                          ? "descending"
                          : "ascending",
                    });
                  }}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {sortDescriptor.column === column.key && (
                      <span className="text-primary text-[10px]">
                        {sortDescriptor.direction === "ascending" ? " ▲" : " ▼"}
                      </span>
                    )}
                  </div>
                </TableColumn>
              )}
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-divider last:border-none"
                  >
                    {columns.map((col) => (
                      <TableCell key={`${item.id}-${col.key}`}>
                        {col.render ? col.render(item) : item[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No data found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {/* Applied Custom Compound Pagination */}
      <div className="py-2 px-2 flex justify-between items-center">
        <span className="text-small text-muted-foreground">
          Showing {items.length} of {sortedItems.length} items
        </span>

        {totalPages > 1 && (
          <Pagination className="justify-center">
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={page === 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Pagination.PreviousIcon />
                  <span>Previous</span>
                </Pagination.Previous>
              </Pagination.Item>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Pagination.Item key={p}>
                  <Pagination.Link
                    isActive={p === page}
                    onPress={() => setPage(p)}
                  >
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ))}

              <Pagination.Item>
                <Pagination.Next
                  isDisabled={page === totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span>Next</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        )}
      </div>
    </div>
  );
}

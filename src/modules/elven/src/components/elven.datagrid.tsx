"use client";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { ElvenColumn } from "../interfaces/elven.interface";
interface ElvenDataGridProps<T> {
  columns: ElvenColumn<T>[];
  data: T[];
}
export function ElvenDataGrid<T extends { id: string | number }>({
  columns,
  data,
}: ElvenDataGridProps<T>) {
  return (
    <Table aria-label="Elven Data Grid" className="w-full">
      <TableHeader columns={columns}>
        {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            {columns.map((col) => (
              <TableCell key={`${item.id}-${col.key}`}>
                {col.render ? col.render(item) : (item as any)[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

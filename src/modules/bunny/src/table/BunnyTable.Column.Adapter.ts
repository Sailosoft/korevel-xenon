import { BunnyColumn } from "./BunnyTable.Interface";

export const BunnyColumnAdapter = {
  toHeroUI: (columns: BunnyColumn[]) => {
    return columns.map((col) => ({
      accessorKey: col.field,
      header: col.header,
      sortable: col.sortable ?? false,
      width: col.width,
      cell: col.render,
    }));
  },
};

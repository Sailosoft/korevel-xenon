import { GetAllResponse } from "./admin-panel-query.interface";

export function adminPanelQueryResponseAll<TRow>({
  data,
  total,
  page,
  pageSize,
}: {
  data: TRow[];
  total?: number;
  page?: number;
  pageSize?: number;
}): GetAllResponse<TRow> {
  const totalPages = total && pageSize ? Math.ceil(total / pageSize) : 0;
  return {
    data,
    pagination: {
      page: page || 1,
      pageSize: pageSize || 1,
      total: total || data.length,
      totalPages,
    },
  };
}

type ErrorPayload = { code: number; message: string };

export type BuiRepositoryResult<T = undefined, E = ErrorPayload> =
  | { isSuccess: true; value: T }
  | { isSuccess: false; value?: unknown; error: E };

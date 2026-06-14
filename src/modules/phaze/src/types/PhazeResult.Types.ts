
type PhazeErrorPayload = { code: number; message: string };

export type PhazeRepositoryResult<T = undefined, E = PhazeErrorPayload> =
  | { isSuccess: true; value: T }
  | { isSuccess: false; value?: unknown; error: E };

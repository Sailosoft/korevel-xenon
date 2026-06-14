import { PhazeRepositoryResult } from "./types/PhazeResult.Types";

export class PhazeRepositoryResultManager<T> {
  successType<B>(data: B): PhazeRepositoryResult<B> {
    return { isSuccess: true, value: data };
  }

  success(data: T): PhazeRepositoryResult<T> {
    return { isSuccess: true, value: data };
  }

  successList(data: T[]): PhazeRepositoryResult<T[]> {
    return { isSuccess: true, value: data };
  }

  error(code: number, message: string): PhazeRepositoryResult<T> {
    return { isSuccess: false, error: { code, message } };
  }

  errorList(code: number, message: string): PhazeRepositoryResult<T[]> {
    return { isSuccess: false, error: { code, message } };
  }
}
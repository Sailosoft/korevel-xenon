// bc.repository.result-manager.ts
//
// Small helper that shapes repository results into a discriminated union
// so callers can pattern-match on `isSuccess`.

import { BCRepositoryResult } from "./bc.repository.interface";

export class BCRepositoryResultManager<T> {
  successType<B>(data: B): BCRepositoryResult<B> {
    return {
      isSuccess: true,
      value: data,
    };
  }

  success(data: T): BCRepositoryResult<T> {
    return {
      isSuccess: true,
      value: data,
    };
  }

  successList(data: T[]): BCRepositoryResult<T[]> {
    return {
      isSuccess: true,
      value: data,
    };
  }

  error(code: number, message: string): BCRepositoryResult<T> {
    return {
      isSuccess: false,
      error: {
        code: code,
        message: message,
      },
    };
  }

  errorList(code: number, message: string): BCRepositoryResult<T[]> {
    return {
      isSuccess: false,
      error: {
        code: code,
        message: message,
      },
    };
  }
}

import { BuiRepositoryResult } from "./bui.repository.interface";

export class BUIRepositoryResultManager<T> {
  successType<B>(data: B): BuiRepositoryResult<B> {
    return {
      isSuccess: true,
      value: data,
    };
  }

  success(data: T): BuiRepositoryResult<T> {
    return {
      isSuccess: true,
      value: data,
    };
  }

  successList(data: T[]): BuiRepositoryResult<T[]> {
    return {
      isSuccess: true,
      value: data,
    };
  }

  error(code: number, message: string): BuiRepositoryResult<T> {
    return {
      isSuccess: false,
      error: {
        code: code,
        message: message,
      },
    };
  }

  errorList(code: number, message: string): BuiRepositoryResult<T[]> {
    return {
      isSuccess: false,
      error: {
        code: code,
        message: message,
      },
    };
  }
}

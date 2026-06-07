export type AdminPanelResultStatus =
  | "success"
  | "error"
  | "neutral"
  | "validation-error";

// Discriminated Union for better type narrowing
export type AdminPanelResult<T = void, TError = unknown> =
  | { status: "success"; data?: T; message?: string }
  | { status: "error"; error: TError; message?: string }
  | { status: "validation-error"; error: TError; message?: string }
  | { status: "neutral"; message?: string };

export function adminPanelResultSuccess<T>(
  data: T,
  message?: string,
): AdminPanelResult<T, never> {
  return { status: "success", data, message };
}

export function adminPanelResultError<TError>(
  error: TError,
  message?: string,
): AdminPanelResult<never, TError> {
  return { status: "error", error, message };
}

export function adminPanelResultNeutral(
  message?: string,
): AdminPanelResult<never, never> {
  return { status: "neutral", message };
}

export function adminPanelResultValidationError<TError>(
  error: TError,
  message?: string,
): AdminPanelResult<never, TError> {
  return { status: "validation-error", error, message };
}

// // Discriminated Union for better type narrowing
// export type AdminPanelResult<T = void, TError = unknown> =
//   | {
//       status: "success";
//       isSuccess: true;
//       // If T is void, data is optional/omitted. Otherwise, it's required.
//       data: T extends void ? never : T;
//       message?: string;
//     }
//   | {
//       status: "error";
//       isSuccess: false;
//       error: TError;
//       message?: string;
//     }
//   | {
//       status: "validation-error";
//       isSuccess: false;
//       error: TError; // Usually a Record<string, string[]> for validation
//       message?: string;
//     }
//   | {
//       status: "neutral";
//       isSuccess: false;
//       message?: string;
//     }
//   | {
//       status: "loading";
//       isSuccess: false;
//       message?: string;
//     };

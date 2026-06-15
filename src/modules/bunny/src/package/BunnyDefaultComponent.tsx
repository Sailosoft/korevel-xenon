"use client";

import { ReactNode } from "react";
import { BunnyConfig } from "../Bunny.Interface";
import Bunny from "../Bunny";
import BunnyForm from "../form/BunnyForm";

/**
 * Default renderer used by `BunnyPackage` when no explicit Component is provided.
 *
 * Wraps the full `<Bunny>` shell with `<BunnyForm />` as children so that every
 * feature module gets a working CRUD UI out of the box — table, header, modal,
 * form — without any boilerplate.
 *
 * @example
 * ```tsx
 * // BunnyPackage uses this automatically:
 * new BunnyPackage(config);
 * // Equivalent to:
 * new BunnyPackage(config, BunnyDefaultComponent);
 * ```
 */
export function BunnyDefaultComponent<TRow, TForm>({
  config,
  children,
}: {
  config: BunnyConfig<TRow, TForm>;
  children?: ReactNode;
}) {
  return (
    <Bunny config={config}>{children ?? <BunnyForm<TRow, TForm> />}</Bunny>
  );
}

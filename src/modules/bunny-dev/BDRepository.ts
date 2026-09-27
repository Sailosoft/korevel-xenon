// BDRepository.ts
//
// Generic CRUD + query repository for a single Dexie table.
//
// BunnyDev uses raw Dexie (locked decision #4). Every feature repository is a
// thin, typed wrapper around this generic class: `new BDRepository<TRow>(table)`.
// Primary keys are UUIDv7 strings generated on create.

import type { Table } from "dexie";
import { v7 as uuidv7 } from "uuid";
import type { BDEntity } from "./BDDomain.Types";

/** Create input: everything except `id` (optional), `createdAt`, `updatedAt`. */
export type BDCreateInput<TRow extends BDEntity> = Omit<
  TRow,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export class BDRepository<TRow extends BDEntity> {
  constructor(public readonly table: Table<TRow, string>) {}

  /** Return every row in the table. */
  async list(): Promise<TRow[]> {
    return this.table.toArray();
  }

  /** Return one row by primary key, or `undefined`. */
  async get(id: string): Promise<TRow | undefined> {
    return this.table.get(id);
  }

  /** Insert a new row, generating a UUIDv7 id and timestamps. */
  async create(input: BDCreateInput<TRow>): Promise<TRow> {
    const now = new Date().toISOString();
    const row = {
      createdAt: now,
      updatedAt: now,
      ...input,
      id: input.id ?? uuidv7(),
    } as unknown as TRow;
    await this.table.add(row);
    return row;
  }

  /** Merge a patch into an existing row (preserving its id). */
  async update(id: string, patch: Partial<TRow>): Promise<TRow | undefined> {
    const existing = await this.table.get(id);
    if (!existing) return undefined;
    const next = {
      ...existing,
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    } as TRow;
    await this.table.put(next);
    return next;
  }

  /** Insert or replace a complete row as-is (used by generation apply). */
  async put(row: TRow): Promise<void> {
    await this.table.put(row);
  }

  /** Insert or replace many complete rows (batch apply). */
  async bulkPut(rows: TRow[]): Promise<void> {
    if (rows.length === 0) return;
    await this.table.bulkPut(rows);
  }

  /** Delete one row by primary key. */
  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }

  /** Delete every row matching an indexed field. */
  async deleteWhere(index: string, value: string): Promise<number> {
    return this.table.where(index).equals(value).delete();
  }

  /** List every row matching an indexed field. */
  async listWhere(index: string, value: string): Promise<TRow[]> {
    return this.table.where(index).equals(value).toArray();
  }

  /** Count rows matching an indexed field, or the whole table when omitted. */
  async count(index?: string, value?: string): Promise<number> {
    if (index && value !== undefined) {
      return this.table.where(index).equals(value).count();
    }
    return this.table.count();
  }

  /** Remove every row in the table. */
  async clear(): Promise<void> {
    await this.table.clear();
  }
}

// BDApp.Repository.ts — repositories for generated apps and their rendered rows.

import { bdDB } from "../../BDDatabase";
import type { BDApp, BDAppRecord } from "../../BDDomain.Types";
import { BDRepository, type BDCreateInput } from "../../BDRepository";
import {
  collectConnectionReferences,
  type BDAppConnectionReference,
} from "./BDApp.Types";

export class BDAppRepository extends BDRepository<BDApp> {
  constructor() {
    super(bdDB.apps);
  }

  async listByProject(projectId: string): Promise<BDApp[]> {
    return this.listWhere("projectId", projectId);
  }
}

export class BDAppRecordRepository extends BDRepository<BDAppRecord> {
  constructor() {
    super(bdDB.appRecords);
  }

  /** Rows for one resource of one app. */
  async listRows(appId: string, resourceSlug: string): Promise<BDAppRecord[]> {
    const rows = await this.listWhere("appId", appId);
    return rows.filter((row) => row.resourceSlug === resourceSlug);
  }

  async createRow(
    input: Omit<BDCreateInput<BDAppRecord>, "resourceSlug"> & {
      resourceSlug: string;
    },
  ): Promise<BDAppRecord> {
    return this.create(input);
  }

  /** Remove every row for a resource (used when a resource is deleted). */
  async deleteByResource(appId: string, resourceSlug: string): Promise<void> {
    const rows = await this.listRows(appId, resourceSlug);
    await Promise.all(rows.map((row) => this.delete(row.id)));
  }

  /**
   * Remove every link pointing at `targetId` from the app's rows, using the
   * reference locations derived from the app's connection graph.
   */
  async scrubReferences(
    appId: string,
    references: BDAppConnectionReference[],
    targetId: string,
  ): Promise<void> {
    if (references.length === 0) return;
    const rows = await this.listWhere("appId", appId);
    const writes: Promise<unknown>[] = [];
    for (const reference of references) {
      for (const row of rows) {
        if (row.resourceSlug !== reference.resourceSlug) continue;
        const value = row.data?.[reference.key];
        if (reference.array) {
          if (Array.isArray(value) && value.includes(targetId)) {
            writes.push(
              this.update(row.id, {
                data: {
                  ...row.data,
                  [reference.key]: value.filter((v) => v !== targetId),
                },
              }),
            );
          }
        } else if (value === targetId) {
          const data = { ...row.data };
          delete data[reference.key];
          writes.push(this.update(row.id, { data }));
        }
      }
    }
    await Promise.all(writes);
  }

  /** Delete a row after scrubbing every link that points at it. */
  async deleteRowWithLinks(app: BDApp, row: BDAppRecord): Promise<void> {
    const references = collectConnectionReferences(app, row.resourceSlug);
    await this.scrubReferences(app.id, references, row.id);
    await this.delete(row.id);
  }

  /** Delete a whole resource's rows after scrubbing inbound links. */
  async deleteResourceWithLinks(
    app: BDApp,
    resourceSlug: string,
  ): Promise<void> {
    const rows = await this.listRows(app.id, resourceSlug);
    const references = collectConnectionReferences(app, resourceSlug);
    await Promise.all(
      rows.map(async (row) => {
        await this.scrubReferences(app.id, references, row.id);
        await this.delete(row.id);
      }),
    );
  }
}

export const bdAppRepository = new BDAppRepository();
export const bdAppRecordRepository = new BDAppRecordRepository();

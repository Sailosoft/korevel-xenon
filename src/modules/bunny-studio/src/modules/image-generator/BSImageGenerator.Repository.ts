// BSImageGenerator.Repository — Repository for the Bunny AI Studio image library.
//
// Thin typed wrapper over PhazeRepository for the `imageLibrary` table. Keeps
// the CRUD surface explicit and gives a natural home for future image-specific
// query helpers (e.g. latest-first ordering lives in the component via
// useLiveQuery). The form type omits `id` — PhazeRepository injects a UUID v7
// on create.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type {
  BSImageAsset,
  BSImageAssetForm,
} from "./BSImageGenerator.Types";

export class BSImageRepository extends PhazeRepository<
  BSImageAsset,
  BSImageAssetForm
> {
  constructor(table: Table<BSImageAsset>) {
    super(table);
  }

  /** All library images, newest first. */
  public async getAllNewestFirst(): Promise<BSImageAsset[]> {
    const rows = await this.set.toArray();
    return [...rows].sort((a, b) =>
      b.createdDate.localeCompare(a.createdDate),
    );
  }
}

// BSVideoGenerator.Repository — Repository for the Bunny AI Studio video library.
//
// Thin typed wrapper over PhazeRepository for the `videoLibrary` table. Keeps
// the CRUD surface explicit and gives a natural home for future video-specific
// query helpers (e.g. latest-first ordering lives in the component via
// useLiveQuery). The form type omits `id` — PhazeRepository injects a UUID v7
// on create.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type {
  BSVideoAsset,
  BSVideoAssetForm,
} from "./BSVideoGenerator.Types";

export class BSVideoRepository extends PhazeRepository<
  BSVideoAsset,
  BSVideoAssetForm
> {
  constructor(table: Table<BSVideoAsset>) {
    super(table);
  }

  /** All library videos, newest first. */
  public async getAllNewestFirst(): Promise<BSVideoAsset[]> {
    const rows = await this.set.toArray();
    return [...rows].sort((a, b) =>
      b.createdDate.localeCompare(a.createdDate),
    );
  }
}

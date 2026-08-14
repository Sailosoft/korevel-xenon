// BSSpeechGenerator.Repository — Repository for the Bunny AI Studio speech library.
//
// Thin typed wrapper over PhazeRepository for the `speechLibrary` table. Keeps
// the CRUD surface explicit and gives a natural home for future speech-specific
// query helpers (e.g. latest-first ordering lives in the component via
// load + sort). The form type omits `id` — PhazeRepository injects a UUID v7
// on create.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type {
  BSSpeechAsset,
  BSSpeechAssetForm,
} from "./BSSpeechGenerator.Types";

export class BSSpeechRepository extends PhazeRepository<
  BSSpeechAsset,
  BSSpeechAssetForm
> {
  constructor(table: Table<BSSpeechAsset>) {
    super(table);
  }

  /** All library speech, newest first. */
  public async getAllNewestFirst(): Promise<BSSpeechAsset[]> {
    const rows = await this.set.toArray();
    return [...rows].sort((a, b) =>
      b.createdDate.localeCompare(a.createdDate),
    );
  }
}

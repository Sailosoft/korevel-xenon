// BSTranscription.Repository — Repository for the Bunny AI Studio transcription library.
//
// Thin typed wrapper over PhazeRepository for the `transcriptionLibrary` table.
// The form type omits `id` — PhazeRepository injects a UUID v7 on create.

import { Table } from "dexie";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import type {
  BSTranscriptionAsset,
  BSTranscriptionAssetForm,
} from "./BSTranscription.Types";

export class BSTranscriptionRepository extends PhazeRepository<
  BSTranscriptionAsset,
  BSTranscriptionAssetForm
> {
  constructor(table: Table<BSTranscriptionAsset>) {
    super(table);
  }

  /** All library transcriptions, newest first. */
  public async getAllNewestFirst(): Promise<BSTranscriptionAsset[]> {
    const rows = await this.set.toArray();
    return [...rows].sort((a, b) =>
      b.createdDate.localeCompare(a.createdDate),
    );
  }
}

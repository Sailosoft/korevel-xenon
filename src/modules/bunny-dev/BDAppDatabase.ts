// BDAppDatabase.ts
//
// BDAppDatabase — the separate IndexedDB persistence layer for records rendered
// by generated apps. App *definitions* stay in `BunnyDevDB`; the data their CRUD
// engine produces lives here, isolated per application database.
//
// Cross-database integrity cannot use Dexie delete hooks (they are scoped to a
// single database), so project/app/resource deletes call the explicit cleanup
// helpers exported below.

import Dexie, { type Table } from "dexie";
import type { BDAppRecord } from "./BDDomain.Types";
import { bdDB } from "./BDDatabase";
import { BDRepository } from "./BDRepository";

/** Register every schema version for the app-records database. */
function configureBDAppMigrations(db: Dexie): void {
  db.version(1).stores({
    appRecords: "id, appId, projectId, resourceSlug",
  });
}

export class BDAppDatabase extends Dexie {
  public appRecords!: Table<BDAppRecord, string>;
  public appRecordsRepo!: BDRepository<BDAppRecord>;

  constructor() {
    super("BunnyDevAppDB");
    configureBDAppMigrations(this);
    this.appRecords = this.table("appRecords");
    this.appRecordsRepo = new BDRepository(this.appRecords);
  }
}

export const bdAppDB = new BDAppDatabase();

let legacyMigrated = false;

// Persistent one-time marker. Without it, deleting every rendered record would
// make `count() === 0` true on the next load and silently re-import rows the
// user just removed from the legacy table.
const LEGACY_MIGRATION_KEY = "bd:appRecords:legacyMigrated:v1";

function markLegacyMigrated(): void {
  legacyMigrated = true;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LEGACY_MIGRATION_KEY, "1");
    }
  } catch {
    // Storage may be unavailable (private mode); the in-memory flag still guards
    // this session.
  }
}

function isLegacyMigrationMarked(): boolean {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem(LEGACY_MIGRATION_KEY) === "1"
    );
  } catch {
    return false;
  }
}

/**
 * One-time, non-destructive copy of rows that used to live in the legacy
 * `BunnyDevDB.appRecords` table. Runs only when the dedicated database has
 * never been migrated, so existing local data survives the switch and records
 * deleted afterwards are never resurrected.
 */
export async function migrateLegacyAppRecords(): Promise<void> {
  if (legacyMigrated || isLegacyMigrationMarked()) {
    legacyMigrated = true;
    return;
  }
  try {
    const count = await bdAppDB.appRecords.count();
    if (count > 0) {
      // Already in use (possibly by another tab); treat as migrated.
      markLegacyMigrated();
      return;
    }
    const legacy = await bdDB.appRecords.toArray();
    if (legacy.length > 0) await bdAppDB.appRecords.bulkPut(legacy);
    markLegacyMigrated();
  } catch {
    // Best-effort: never block rendering on a legacy copy failure.
  }
}

/** Remove every rendered record belonging to a project. */
export async function deleteAppRecordsByProject(
  projectId: string,
): Promise<void> {
  await bdAppDB.appRecords.where("projectId").equals(projectId).delete();
}

/** Remove every rendered record belonging to an app. */
export async function deleteAppRecordsByApp(appId: string): Promise<void> {
  await bdAppDB.appRecords.where("appId").equals(appId).delete();
}

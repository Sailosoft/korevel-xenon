"use server";

// BDPrismaExport.Server — server-action wrapper around the pure Prisma and
// model-builder exporters. Kept as a `"use server"` action per the module's
// server-action convention so exports can also be produced server-side.

import type { BDSchemaModel } from "../../BDDomain.Types";
import { toModelBuilderFile, toPrismaSchema } from "./BDPrismaExport";

export interface BDPrismaExportResult {
  prisma: string;
  modelBuilder: string;
}

export async function generatePrismaExport(
  models: BDSchemaModel[],
): Promise<BDPrismaExportResult> {
  return {
    prisma: toPrismaSchema(models),
    modelBuilder: toModelBuilderFile(models),
  };
}

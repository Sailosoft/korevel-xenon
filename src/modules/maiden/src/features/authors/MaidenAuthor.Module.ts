import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { MaidenAuthor } from "../../entities/entities";
import { GetAllResponse } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { maidenDatabase } from "../../database/MaidenDatabase";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";

interface MaidenAuthorModule {
  config: BunnyConfig<MaidenAuthor, MaidenAuthor>;
}
export const maidenAuthorModule: MaidenAuthorModule = {
  config: {
    title: "Author",
    titlePlural: "Authors",
    rowKey: "id",
    modalSize: "lg",
    columns: [
      {
        field: "id",
        header: "Id",
        sortable: true,
        isRowHeader: true,
      },
      {
        field: "name",
        header: "Name",
        sortable: true,
      },
      {
        field: "description",
        header: "Description",
        sortable: true,
      },
    ],
    query: {
      getAll: async () => {
        const records = await maidenDatabase.authors.toArray();
        const response: GetAllResponse<MaidenAuthor> = {
          data: records,
          pagination: {
            page: 1,
            pageSize: records.length,
            total: records.length,
            totalPages: 1,
          },
        };
        return response;
      },
      getOne: async (id: number | string) => {
        return await maidenDatabase.authors.get(Number(id));
      },
    },
    mutation: {
      create: async (
        data: Omit<MaidenAuthor, "id">, // Usually ID is auto-generated
      ): Promise<AdminPanelResult<MaidenAuthor, unknown>> => {
        try {
          const id = await maidenDatabase.authors.add(data);
          const newAuthor = await maidenDatabase.authors.get(id);

          if (!newAuthor) throw new Error("Failed to retrieve created record.");

          return {
            status: "success",
            data: newAuthor,
            message: "Author created successfully",
          };
        } catch (error) {
          return {
            status: "error",
            error,
            message: "Failed to create author",
          };
        }
      },

      update: async (
        id: string | number,
        data: Partial<MaidenAuthor>,
      ): Promise<AdminPanelResult<MaidenAuthor, unknown>> => {
        try {
          const numericId = Number(id);
          await maidenDatabase.authors.update(numericId, data);
          const updatedAuthor = await maidenDatabase.authors.get(numericId);

          if (!updatedAuthor) throw new Error("Record not found after update.");

          return {
            status: "success",
            data: updatedAuthor,
            message: "Author updated successfully",
          };
        } catch (error) {
          return {
            status: "error",
            error,
            message: "Update failed",
          };
        }
      },

      delete: async (
        id: string | number,
      ): Promise<AdminPanelResult<MaidenAuthor, unknown>> => {
        try {
          const numericId = Number(id);
          await maidenDatabase.authors.delete(numericId);

          return {
            status: "success",
            data: undefined,
            message: "Author deleted successfully",
          };
        } catch (error) {
          return {
            status: "error",
            error,
            message: "Could not delete author",
          };
        }
      },
    },
  },
};

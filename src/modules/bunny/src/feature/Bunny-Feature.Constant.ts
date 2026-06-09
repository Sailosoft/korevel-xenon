import { GetAllResponse } from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";
import { BunnyConfig } from "../Bunny.Interface";

const defaultFeatureConfig: BunnyConfig<any, any> = {
  title: "",
  columns: [],
  rowKey: "" as keyof any,
  query: {
    getAll: function (): Promise<GetAllResponse<any>> {
      throw new Error("Function not implemented.");
    },
    getOne: function (): Promise<any | undefined> {
      throw new Error("Function not implemented.");
    },
  },
  mutation: {
    create: function (): Promise<AdminPanelResult<any, unknown> | undefined> {
      throw new Error("Function not implemented.");
    },
    update: function (): Promise<AdminPanelResult<any, unknown> | undefined> {
      throw new Error("Function not implemented.");
    },
    delete: function (): Promise<AdminPanelResult<any, unknown> | undefined> {
      throw new Error("Function not implemented.");
    },
  },
};

export const BunnyFeatureConstant = {
  default: defaultFeatureConfig,
};

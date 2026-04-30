import { ElvenAuthor, ElvenColumn } from "../../interfaces/elven.interface";

interface ElvenAuthorModule {
  columns: ElvenColumn<ElvenAuthor>[];
}

export const elvenAuthorModule: ElvenAuthorModule = {
  columns: [
    // { key: "id", label: "Id" },
    { key: "name", label: "Name" },
  ],
};

import { BunnyConfig } from '@/src/modules/bunny/src/Bunny.Interface';
import { BAIAuthor } from './bai.author.entity';
import { AdminPanelQueryOptions, GetAllResponse } from '@/src/modules/admin-panel/features/query/admin-panel-query.interface';
import { AdminPanelId } from '@/src/modules/admin-panel/features/id/admin-panel-id.interface';
import { AdminPanelResult, adminPanelResultSuccess } from '@/src/modules/admin-panel/shared/admin-panel-result';
import { baiDatabase } from '../../database/bai.database';
import { adminPanelQueryResponseAll } from './../../../../admin-panel/features/query/admin-panel-query.util';

export const baiAuthorModule: BunnyConfig<BAIAuthor, BAIAuthor> = {
  title: "Author",
  titlePlural: "Authors",
  rowKey: "id",
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
    },
  ],
  formConfig: {
    fields: [
      {
        name: "name",
        label: "Name",
        type: 'text',
        rules: [
          {
            rule: 'required',
            message: 'Name is required'
          }
        ]
      },
      {
        name: "description",
        label: "Description",
        type: 'editor',
        rules: [
          {
            rule: 'required',
            message: 'Description is required'
          }
        ]
      },
    ]
  },
  defaultHeaderActions: true,
  defaultRowActions: true,
  query: {
    getAll: async function (_options: AdminPanelQueryOptions, _overrideOptions?: AdminPanelQueryOptions): Promise<GetAllResponse<BAIAuthor>> {
      return adminPanelQueryResponseAll({
        data: await baiDatabase.authors.toArray(),
      });
    },
    getOne: async function (id: string | number): Promise<BAIAuthor | undefined> {
      return await baiDatabase.authors.get(Number(id));
    }
  },
  mutation: {
    create: async function (data: BAIAuthor): Promise<AdminPanelResult<BAIAuthor, unknown> | undefined> {
      const id = await baiDatabase.authors.add(data);

      return adminPanelResultSuccess<BAIAuthor>(
        await baiDatabase.authors.get(id) as BAIAuthor,
      )
    },
    update: async function (id: AdminPanelId, data: BAIAuthor): Promise<AdminPanelResult<BAIAuthor, unknown> | undefined> {
      if (typeof id !== 'number') {
        throw new Error('Invalid ID type. Expected a number.');
      }

      await baiDatabase.authors.update(id, data);

      return adminPanelResultSuccess<BAIAuthor>(
        await baiDatabase.authors.get(id) as BAIAuthor,
      );
    },
    delete: async function (iid: AdminPanelId): Promise<AdminPanelResult<BAIAuthor, unknown> | undefined> {
      const id = Number(iid);
      await baiDatabase.authors.delete(id);

      return adminPanelResultSuccess<BAIAuthor>(
        await baiDatabase.authors.get(id) as BAIAuthor,
      );
    }
  },
}
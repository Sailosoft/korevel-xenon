# Admin Panel Full Product Description

- Admin Panel is a nextjs, react, typescript that manage CRUD operations for hoooks and component.

- Abstraction between UI Components and the API operation.

## Features

- AdminPanelTable: Handling state for data row, pagination, filter, and sorting
- AdminPanelModal: Handling modal state such as loading, openModal, modal mode.
- AdminPanelForm: Handling Create and Update operation such as integrating mutation operation action and triggering table action for refresh.
  -AdminPanelDel: Handling dialog for delete operation and integration delete mutation action.
- AdminPanelNotify: Handling success and error notification.
- AdminPanelMutation: Handling abstraction of data layer to Create, Edit and Delete. Interface that CRUD operation can be dynamic. (Switching From DexieJS, Prisma or CRUD)
- AdminPanelQuery: Handling abstraction of data layer to GetOne and GetAll with QueryOption Parameters (filter, sort, pagination, search).
- AdminPanelCustomAction: Handling insertion of row action, bulk action and modal action. With head or headless (operate or just open modal/dialog then do operation).

## Rules

- Keep the branding AdminPanel for naming and file convention.
- E.g. Instead of writing Pagination interface just write AdminPanelPagination.
- For Hook just write useAdminPanel prefix and for type use AdminPanel prefix and for the folder just use use-admin-panel prefix or for component AdminPanel or for general admin-panel-features prefix.

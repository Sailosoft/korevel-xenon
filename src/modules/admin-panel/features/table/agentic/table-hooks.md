# UseAdminPanelTable Hooks

- This hooks manage state of handling table operations and data layer communication.
- state such loading, rows, pagination, sort, filter, search, and error.

## Data Layer

- It accepts interface from AdminPanelQuery Abstraction that allow to populate rows and easily apply if query options adjusted (e.g. Pagination, Filters and ETC)

## Operations Layer

- It handles row-level operations such as refresh..

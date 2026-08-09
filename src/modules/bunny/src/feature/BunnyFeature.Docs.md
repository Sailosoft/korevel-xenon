# BunnyFeature — Interface & Class Documentation

The `src/modules/bunny/src/feature` folder is the **feature-building layer** of the
Bunny module system. It exposes one main entry point — [`BunnyFeature`](BunnyFeature.ts:49) —
plus a set of small, fluent **configurators**, each responsible for mutating a single
section of a [`BunnyConfig`](../Bunny.Interface.ts:96).

Every public class in this folder now implements a contract declared in
[`BunnyFeature.Interface.ts`](BunnyFeature.Interface.ts:1). Consumers should prefer to
depend on the **interfaces** (the `IBunny*` types) rather than the concrete classes.

---

## Architecture overview

```
BunnyFeature (IBunnyFeature)                     // entry point / builder
├── BunnyFeatureUtil (IBunnyFeatureUtil)          // pluralization helper
└── configurators (created internally):
    ├── BunnyDataLayerConfigurator (IBunnyDataLayerConfigurator)  // query + mutation
    ├── BunnyFormConfigurator      (IBunnyFormConfigurator)       // form fields/layout
    ├── BunnyHeaderConfigurator    (IBunnyHeaderConfigurator)     // header actions/config
    ├── BunnyModalConfigurator     (IBunnyModalConfigurator)      // modal size/actions
    ├── BunnyRowConfigurator       (IBunnyRowConfigurator)        // row actions
    └── BunnyTableConfigurator     (IBunnyTableConfigurator)      // table columns/mode
```

**Flow:**

1. Consumers call `BunnyFeature.create("Books", "id", (feature) => { ... })`.
2. Inside the callback they invoke `feature.configureForm(...)`, `feature.configureTable(...)`,
   etc. Each `configure*` method instantiates the matching configurator and hands it to the
   user's callback as the **interface** type.
3. Configurators mutate the shared `BunnyConfig` in place and return `this` for chaining.
4. The final `BunnyConfig` is returned (optionally deep-frozen via
   `BunnyFeature.createImmutable`).

> **Why interfaces?** They decouple callbacks from concrete implementations, enable
> easier testing/mocking, and provide a single, documented contract for every public
> class in this folder.

---

## `IBunnyFeature<TRow, TForm>`

Implemented by [`BunnyFeature`](BunnyFeature.ts:49).

The main fluent **feature builder**. Assembles a full `BunnyConfig` through a chainable
API. Use the static factories to construct one:

- `BunnyFeature.create(title, rowKey, configure)` → returns a mutable `BunnyConfig`.
- `BunnyFeature.createImmutable(title, rowKey, configure)` → returns a **deep-frozen**
  `Readonly<BunnyConfig>` that can safely be used as a `Map` key.

### Instance methods

| Method | Description |
| --- | --- |
| `build(configure)` | Runs a final `configure` callback over the mutable config and returns it. |
| `setCustomPlural(pluralTitle)` | Overrides the auto-derived plural display title. |
| `setModuleUrl(moduleUrl)` | Sets the URL pattern (exact, `*` wildcard, or `/^regex/`) used for module activation. |
| `setModalSize(size)` | Sets the modal size preset (`xs`/`sm`/`md`/`lg`/`cover`/`full`). |
| `setModalWidth(width)` | Sets a custom modal width in pixels. |
| `setValidationAdapter(adapter)` | Installs a validation adapter (Zod, Yup, Joi, custom) that overrides built-in rules. |
| `useDefault()` | Enables default header **and** default row actions. |
| `useDefaultRowActions()` | Enables only default row actions (view / edit / delete). |
| `useDataLayer({ query, mutation })` | Wires query + mutation in a single call. |
| `configureDataLayer(cb)` | Configures the data layer via `IBunnyDataLayerConfigurator`. |
| `configureForm(cb)` | Configures the form via `IBunnyFormConfigurator`. |
| `configureTable(cb)` | Configures the table via `IBunnyTableConfigurator`. |
| `configureHeader(cb)` | Configures the header via `IBunnyHeaderConfigurator`. |
| `configureRow(cb)` | Configures row actions via `IBunnyRowConfigurator`. |
| `configureModal(cb)` | Configures the modal via `IBunnyModalConfigurator`. |

### Example

```ts
BunnyFeature.create<BookRow, BookForm>("Books", "id", (feature) => {
  feature
    .setModuleUrl("/modules/books/*")
    .useDefault()
    .configureDataLayer((data) => data.useRepository(bookRepository))
    .configureForm((form) => {
      form.setGridCols(2);
      form.addFields([...bookFormFields]);
      form.setOnSuccess({ mode: "closeOnly" });
    })
    .configureTable((table) => {
      table.addColumns([...bookColumns]);
      table.setMode("default");
    });
});
```

---

## `IBunnyFeatureUtil`

Implemented by [`BunnyFeatureUtil`](BunnyFeature.Util.ts:1) (default export).

Internal helper providing text utilities. Currently used to derive the plural title.

| Method | Description |
| --- | --- |
| `pluralize(word)` | Pluralizes an English word. Handles irregulars (`criterion` → `criteria`), sibilants (`Match` → `Matches`), consonant-`y` (`Category` → `Categories`), `f`/`fe` (`Knife` → `Knives`), and no-ops on `series`/`species` or already-plural words. |

---

## `IBunnyDataLayerConfigurator<TRow, TForm>`

Implemented by [`BunnyDataLayerConfigurator`](BunnyFeature.DataLayerConf.ts:6).

Configures the **data layer** (query + mutation) of a feature.

| Method | Description |
| --- | --- |
| `useQuery(query)` | Attaches an explicit `AdminPanelQuery` (getAll / getOne). |
| `useMutation(mutation)` | Attaches an explicit `AdminPanelMutation` (create / update / delete). |
| `useRepository(repository)` | Binds an `IBUIRepositoryAdminPanel` and derives both query and mutation from `panelGetAll`/`panelGetOne`/`panelCreate`/`panelUpdate`/`panelDelete`. |

---

## `IBunnyFormConfigurator<TRow, TForm>`

Implemented by [`BunnyFormConfigurator`](BunnyFeature.FormConf.ts:8).

Configures the **form** section. Initializes `props.form` and defaults to a 1-column grid.

| Method | Description |
| --- | --- |
| `configureProps(props)` | Deep-merges props onto the form's admin-panel props. |
| `setOnSuccess(onSuccess)` | Sets post-submit behavior (`openView`, `closeOnly`, or `redirect`). |
| `setBeforeSubmit(fn)` | Registers a `(form, mode) => TForm` transform run just before submit. |
| `addFields(fields)` | Appends `BunnyFormField[]` definitions. |
| `setGridCols(cols)` | Sets the grid column count (default: 1). |
| `setFormDefaultData(data)` | Pre-populates default form data for "create" mode (also pipes through `props.form.initialData`). |

---

## `IBunnyHeaderConfigurator<TRow, TForm>`

Implemented by [`BunnyHeaderConfigurator`](BunnyFeature.HeaderConf.ts:8).

Configures the **header** section.

| Method | Description |
| --- | --- |
| `disableDefaults()` | Turns off all default header actions (create, refresh, …). |
| `hide(actions)` | Hides specific default header buttons by type. |
| `addAction(action)` | Appends a custom header action button. |
| `setConfig(config)` | Merges display config (icon, description, variant) onto the header. |

---

## `IBunnyModalConfigurator<TRow, TForm>`

Implemented by [`BunnyModalConfigurator`](BunnyFeature.ModalConf.ts:7).

Configures the **modal** section.

| Method | Description |
| --- | --- |
| `setSize(size)` | Sets a preset size (`string`) or a custom pixel width (`number`). |
| `setModalHeaderActions(actions)` | Replaces all modal header action buttons. |
| `addModalHeaderAction(action)` | Appends a single modal header action button. |

---

## `IBunnyRowConfigurator<TRow, TForm>`

Implemented by [`BunnyRowConfigurator`](BunnyFeature.RowConf.ts:5).

Configures **row actions** for the table.

| Method | Description |
| --- | --- |
| `disableDefaults()` | Turns off all default row actions (view / edit / delete). |
| `hide(actions)` | Hides specific default row buttons. |
| `addAction(action)` | Appends a single custom row action. |
| `addActions(actions)` | Appends multiple custom row actions. |
| `setColumnWidth(width)` | Sets the row-actions column width in pixels. |
| `setMaxVisibleLength(length)` | Caps visible row-action buttons before collapsing into a "more" menu. |

---

## `IBunnyTableConfigurator<TRow, TForm>`

Implemented by [`BunnyTableConfigurator`](BunnyFeature.TableConf.ts:4).

Configures the **table** section. Initializes `props.table`.

| Method | Description |
| --- | --- |
| `setHeight(height)` | Sets the table height (px number or CSS string). |
| `addColumns(columns)` | Appends columns, skipping any whose `field` already exists (de-duplication). |
| `setMode(mode)` | Sets the table display mode (`BunnyTableMode`). |
| `configureProps(props)` | Deep-merges props onto the table's admin-panel props. |

---

## Related files

| File | Contents |
| --- | --- |
| [`BunnyFeature.Interface.ts`](BunnyFeature.Interface.ts:1) | All `IBunny*` contracts (this is the single source of truth). |
| [`BunnyFeature.ts`](BunnyFeature.ts:1) | The main builder (`BunnyFeature`). |
| [`BunnyFeature.Constant.ts`](BunnyFeature.Constant.ts:1) | `BunnyFeatureConstant.default` — the shared default `BunnyConfig`. |
| [`BunnyFeature.Util.ts`](BunnyFeature.Util.ts:1) | `BunnyFeatureUtil` pluralization helper. |
| [`BunnyFeature.DataLayerConf.ts`](BunnyFeature.DataLayerConf.ts:1) | Data-layer configurator. |
| [`BunnyFeature.FormConf.ts`](BunnyFeature.FormConf.ts:1) | Form configurator. |
| [`BunnyFeature.HeaderConf.ts`](BunnyFeature.HeaderConf.ts:1) | Header configurator. |
| [`BunnyFeature.ModalConf.ts`](BunnyFeature.ModalConf.ts:1) | Modal configurator. |
| [`BunnyFeature.RowConf.ts`](BunnyFeature.RowConf.ts:1) | Row-actions configurator. |
| [`BunnyFeature.TableConf.ts`](BunnyFeature.TableConf.ts:1) | Table configurator. |

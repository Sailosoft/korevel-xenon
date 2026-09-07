# Skills Market Module

## Overview

The **Skills Market** module is a marketplace for author writing skills. It presents a browsable catalog of skills (built-in constant object) that are **not** automatically added to the Author Skills registry. The user browses the marketplace and explicitly adds skills via the row action ("Add to Author Skills") or the header action ("Add All to Author Skills"). Once added, the skills appear in the [Author Skills](../author-skills/README.md) module.

## Use Cases

- Browse the marketplace and search skills by name or description.
- Add a single skill to Author Skills from a row action.
- Add every missing marketplace skill with the header action.
- If a same-named skill already exists in Author Skills, a warning dialog allows overriding the existing record (name/description) or canceling.

## Dependencies

- [Author Skills](../author-skills/bui.author-skills.entity.ts) — added marketplace skills are persisted into the `authorSkills` registry.
- [Bunny](../..//src/modules/bunny/src/Bunny.tsx) — the module is rendered strictly with the Bunny admin table.

## File Structure

| File                                                                        | Purpose                                                                            |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`bui.skills-market.entity.ts`](bui.skills-market.entity.ts)                | Data model interfaces (`BUISkillsMarketSkill`, `BUISkillsMarketRow`, add result)    |
| [`bui.skills-market.constant.ts`](bui.skills-market.constant.ts)            | Market catalog constant object plus catalog getters                                |
| [`bui.skills-market.lib.ts`](bui.skills-market.lib.ts)                      | Library layer — installed-state computation, conflict lookup, single/bulk add      |
| [`bui.skills-market.hooks.ts`](bui.skills-market.hooks.ts)                  | React hooks exposing the live Author Skills registry state                         |
| [`bui.skills-market.module.ts`](bui.skills-market.module.ts)                | BunnyConfig — columns, status badge, header/row add actions, override warning      |
| [`bui.skills-market.component.tsx`](bui.skills-market.component.tsx)        | Client component rendering the summary banner + Bunny market table                 |
| [`bui.skills-market.search.component.tsx`](bui.skills-market.search.component.tsx) | Header search input wired to the Bunny table search                          |

## Database

The module reads from (and writes into) the `authorSkills` table registered in [`bui.database.ts`](../../database/bui.database.ts). Marketplace skills themselves are static constants and never stored directly.

## Add-to-Author-Skills Behavior

- **No duplicate warning**: skill is added directly, a success notification is shown.
- **Duplicate found**: a dialog warns that the name already exists in Author Skills and that adding it will override the existing record; the user confirms override or cancels.
- **Header "Add All"**: adds every missing marketplace skill; an optional checkbox controls whether same-named existing skills are overridden instead of skipped.
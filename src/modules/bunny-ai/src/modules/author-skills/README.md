# Author Skills Module

## Overview

The **AuthorSkills** module manages reusable skill definitions that can be attached to authors. These skills are used to enrich author profiles and provide contextual metadata for AI-driven book chapter generation.

## Use Cases

- On the author view page, attach existing skills or create new skills for an author.
- An author can have multiple skills assigned.
- Skills are reusable and can be attached to multiple authors.
- When writing chapters, skills can be referenced to guide chapter content.

## Dependencies

- [Authors](../authors/bui.author.entity.ts) — Skills are assigned to authors.
- [Books](../books/bui.book.entity.ts) — Skills can be referenced during book/chapter creation.

## File Structure

| File                                                                         | Purpose                                                                             |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`bui.author-skills.entity.ts`](bui.author-skills.entity.ts)                 | Data model interface (`BUIAuthorSkill`) and prompt type union                       |
| [`bui.author-skills.module.ts`](bui.author-skills.module.ts)                 | BunnyConfig — table columns, form fields, queries, mutations, AI enhancement dialog |
| [`bui.author-skills.repository.ts`](bui.author-skills.repository.ts)         | Dexie repository extending `BUIRepositoryAdminPanel`                                |
| [`bui.author-skills.component.tsx`](bui.author-skills.component.tsx)         | Client component rendering the Bunny admin panel                                    |
| [`bui.author-skills.prompt.ts`](bui.author-skills.prompt.ts)                 | AI prompt definitions (professional, creative, short, detailed)                     |
| [`bui.author-skills.server.enhance.ts`](bui.author-skills.server.enhance.ts) | Server action for AI-powered skill enhancement                                      |

## Database

The `authorSkills` table is registered in [`bui.database.ts`](../../database/bui.database.ts) with the Dexie schema `++id, name`.

## AI Enhancement

The module supports AI-powered enhancement of skill names and descriptions via the "Enhance Skill With AI" button in the modal header. Four prompt styles are available:

- **Professional** — Clear, standardized, formally structured.
- **Creative** — Engaging, vivid, narrative-driven.
- **Short Blurb** — Condensed, punchy, high-impact.
- **Detailed Breakdown** — Comprehensive, use-case-aware expansion.

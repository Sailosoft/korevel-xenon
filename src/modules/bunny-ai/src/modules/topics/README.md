# Topics

A **Topic** is a small, reusable record `{ id, title, description }` stored in
the `topics` Dexie table (database version 8). Topics can be created manually or
AI-generated, and one Topic can seed any number of Outlines via
`books.topicId`.

## Files

| File | Role |
|---|---|
| `bui.topic.entity.ts` | `BUITopicEntity` |
| `bui.topic.repository.ts` | Admin-panel CRUD over `buiDatabase.topics` |
| `bui.topic.prompt.ts` | 11 Generation Type framings (returns `{ title, description }`) |
| `bui.topic.server.ts` | `buiTopicServerGenerate` → parsed `{ title, description }` |
| `bui.topic.module.ts` | List module + "Generate Topic with AI" header action |
| `bui.topic.component.tsx` | List wrapper |

## Generation Types (11)

`guide`, `architecture`, `discussion`, `lecture_lesson`, `study`, `exam_helper`,
`tutorial`, `reference`, `roadmap`, `research`, `workshop`.

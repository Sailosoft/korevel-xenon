BunnyStudio: KnowledgeBase

OramaJS - Act as RAG and uses 
https://docs.orama.com/docs/orama-js

bun add @orama/orama

Persisting Data Offline (IndexedDB / LocalStorage)
Because Orama runs in-memory, refreshing the browser page will reset the database. If you have a large dataset, you can serialize the index and save it locally using @orama/plugin-data-persistence

import { create, insert } from '@orama/orama';
import { persist, restore } from '@orama/plugin-data-persistence/indexeddb';

// Save the index to IndexedDB
await persist(db, 'binary', 'my-search-index');

// Restore the index on page reload instantly
const restoredDb = await restore('binary', 'my-search-index');
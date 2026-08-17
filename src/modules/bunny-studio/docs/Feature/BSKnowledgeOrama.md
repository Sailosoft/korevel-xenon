To run vector embeddings purely through OpenAI without TensorFlow dependencies, you can use the **OpenAI Node.js SDK** directly alongside **Orama's core database**.

OpenAI’s `text-embedding-3-small` model produces 1536-dimensional vectors. You generate embeddings using the official `openai` SDK when inserting documents and querying Orama.

---

## 1. Required npm Packages

Run this in your terminal (TensorFlow is completely removed):

```bash
npm install @orama/orama openai

```

| Package | Purpose |
| --- | --- |
| `@orama/orama` | In-memory search engine for full-text, vector, and hybrid search. |
| `openai` | Generates vector embeddings (`text-embedding-3-small`) and handles chat responses. |

---

## 2. Complete Code Implementation

Here is the full TypeScript/Node.js setup that routes embedding generation through OpenAI:

```typescript
import { create, insert, search } from '@orama/orama'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Helper function to generate vector embeddings using OpenAI
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 1536-dimension vectors
    input: text,
  })
  return response.data[0].embedding
}

async function initRAGSystem() {
  // 1. Create Orama Database set up for 1536-dimension vectors
  const db = await create({
    schema: {
      title: 'string',
      content: 'string',
      embedding: 'vector[1536]', // Matches text-embedding-3-small output
    },
  })

  // 2. Helper to insert documents with OpenAI embeddings
  async function addDocument(title: string, content: string) {
    const vector = await getEmbedding(content)
    await insert(db, {
      title,
      content,
      embedding: vector,
    })
  }

  // 3. Knowledge Base Ingestion
  console.log('Ingesting documents with OpenAI embeddings...')
  await addDocument(
    'Return Policy',
    'Customers can return any physical product within 30 days of receipt for a full refund.'
  )
  await addDocument(
    'Technical Support Hours',
    'Technical support is available Monday through Friday, 9:00 AM to 6:00 PM EST via live chat.'
  )

  return db
}

// 4. RAG Chat Handler Function
async function handleUserChat(db: any, userQuery: string) {
  // Step A: Embed the user query using OpenAI
  const queryVector = await getEmbedding(userQuery)

  // Step B: Query Orama using vector similarity search
  const searchResults = await search(db, {
    mode: 'vector',
    vector: {
      value: queryVector,
      property: 'embedding',
    },
    similarity: 0.2, // Minimum similarity threshold (0-1)
    limit: 2,
  })

  // Step C: Build context string from Orama hits
  const context = searchResults.hits
    .map((hit) => hit.document.content)
    .join('\n---\n')

  // Step D: Send prompt to OpenAI Chat Completion
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a helpful customer service assistant. Answer the user question using ONLY the provided Knowledge Base context. If the context does not contain the answer, politely state that you do not know.\n\nContext:\n${context}`,
      },
      { role: 'user', content: userQuery },
    ],
  })

  return completion.choices[0].message.content
}

// Execution Example
;(async () => {
  const db = await initRAGSystem()

  const response = await handleUserChat(db, 'What is your policy on returning items?')
  console.log('\nChat Response:\n', response)
})()

```

---
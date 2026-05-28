use case

```typescript
export const BookChaptersSchema = {
  chapters: {
    type: "array",
    description: "List of core chapters",
    items: {
      type: "object",
      description: "Details of a single chapter",
      properties: {
        number: {
          type: "number",
          description: "The sequential position index",
        },
        title: { type: "string", description: "Catchy blueprint title" },
        description: {
          type: "string",
          description: "A two sentence objective description",
        },
      },
    },
  },
} as const; // CRITICAL: This enables type inference!

// 2. Automatically derive the true type blueprint from the schema configuration!
export type IBookChaptersPayload = InferSchemaProps<typeof BookChaptersSchema>;
```

# schema cross check

- When you pass strict: true inside your compileSchema method, OpenAI evaluates your schema before running the model.

```typescript
import { OpenAI } from "openai";
import { StrictPropertyDefinition, InferSchemaProps } from "./ai-schema.types"; // Import your utility
import BUISchemaService from "./BUISchemaService";

export default class BUIAIService {
  private readonly ai: OpenAI;
  private readonly model: string;
  private readonly schemaCompiler: BUISchemaService;

  // ... constructor ...

  /**
   * Generates a JSON object where the return type is statically cross-checked
   * against the literal structure of the 'properties' schema provided.
   */
  async doChatJSON<T extends Record<string, StrictPropertyDefinition>>(option: {
    system: string;
    user: string;
    schemaName: string;
    schemaDescription: string;
    properties: T;
    temperature?: number;
  }): Promise<InferSchemaProps<T>> {
    // 👈 CHANGED: No more 'any'. Returns the exact inferred type!
    try {
      const responseFormat = this.schemaCompiler.compileSchema(
        option.schemaName,
        option.schemaDescription,
        option.properties,
      );

      const response = await this.ai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: option.system },
          { role: "user", content: option.user },
        ],
        response_format: responseFormat,
        temperature: option.temperature ?? 0.7,
      });

      const content = response.choices[0]?.message?.content || "{}";

      // Because OpenAI guarantees structural adherence on strict: true,
      // this assertion is 100% safe at runtime.
      return JSON.parse(content) as InferSchemaProps<T>;
    } catch (error) {
      throw new Error(`AI JSON Generation failed: ${error}`);
    }
  }
}
```

```typescript
const bookSchema = {
  title: { type: "string", description: "Book Title" },
} as const;

// TypeScript automatically knows 'result' is exactly: { title: string }
const result = await aiService.doChatJSON({
  system: "...",
  user: "...",
  schemaName: "Book",
  schemaDescription: "...",
  properties: bookSchema,
});
```

```typescript
const exactSchema = {
  name: "movie_schema",
  description: "A strict movie structure data object",
  properties: {
    name: { type: "string", description: "The title of the film" },
    released: { type: "boolean", description: "Whether the movie is out" },
  },
} as const; // Must apply 'as const' here for the inference mapping lookup

// No explicit generic parameter required! It dynamically extracts keys automatically
const result = await aiService.doChatStructured({
  system: "You are an entertainment archivist.",
  user: "Generate details for Inception.",
  schema: exactSchema,
});

// Completely typed behind the scenes as: { name: string; released: boolean }
console.log(result.name);
```

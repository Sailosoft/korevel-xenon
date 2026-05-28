import { OpenAI } from "openai";

type SchemaPropertyType = "string" | "number" | "boolean" | "object" | "array";

export interface BUIStrictPropertyDefinition {
  type: SchemaPropertyType;
  description: string;
  /** Required when type is 'object' */
  properties?: Record<string, BUIStrictPropertyDefinition>;
  /** Required when type is 'array' */
  items?: BUIStrictPropertyDefinition;
}

export type BUIAISchemaProperties = Record<string, BUIStrictPropertyDefinition>;

export interface BUIAISchemaOptions {
  name: string;
  description: string;
  properties: BUIAISchemaProperties;
}

export interface BUIAISchema {
  compileSchema(options: BUIAISchemaOptions): OpenAI.ResponseFormatJSONSchema;
}

// --- The Inference Engine ---
// This unwraps your custom schema layout into a real type contract
export type BUIInferSchemaProps<T> = T extends { properties: infer P }
  ? { [K in keyof P]: InferProperty<P[K]> }
  : T extends Record<string, BUIStrictPropertyDefinition>
    ? { [K in keyof T]: InferProperty<T[K]> }
    : never;

type InferProperty<P> = P extends { type: "string" }
  ? string
  : P extends { type: "number" }
    ? number
    : P extends { type: "boolean" }
      ? boolean
      : P extends { type: "object"; properties: infer Props }
        ? { [K in keyof Props]: InferProperty<Props[K]> }
        : P extends { type: "array"; items: infer Items }
          ? Array<InferProperty<Items>>
          : never;

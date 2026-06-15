import { OpenAI } from "openai";

type HelixSchemaPropertyType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

export interface HelixStrictPropertyDefinition {
  type: HelixSchemaPropertyType;
  description: string;
  /** Required when type is 'object' */
  properties?: Record<string, HelixStrictPropertyDefinition>;
  /** Required when type is 'array' */
  items?: HelixStrictPropertyDefinition;
}

export type HelixAISchemaProperties = Record<
  string,
  HelixStrictPropertyDefinition
>;

export interface HelixAISchemaOptions {
  name: string;
  description: string;
  properties: HelixAISchemaProperties;
}

export interface HelixAISchema {
  compileSchema(options: HelixAISchemaOptions): OpenAI.ResponseFormatJSONSchema;
}

// --- The Inference Engine ---
// This unwraps your custom schema layout into a real type contract
export type HelixInferSchemaProps<T> = T extends { properties: infer P }
  ? { [K in keyof P]: HelixInferProperty<P[K]> }
  : T extends Record<string, HelixStrictPropertyDefinition>
    ? { [K in keyof T]: HelixInferProperty<T[K]> }
    : never;

type HelixInferProperty<P> = P extends { type: "string" }
  ? string
  : P extends { type: "number" }
    ? number
    : P extends { type: "boolean" }
      ? boolean
      : P extends { type: "object"; properties: infer Props }
        ? { [K in keyof Props]: HelixInferProperty<Props[K]> }
        : P extends { type: "array"; items: infer Items }
          ? Array<HelixInferProperty<Items>>
          : never;

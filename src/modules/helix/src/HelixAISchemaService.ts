import { OpenAI } from "openai";
import {
  HelixAISchema,
  HelixAISchemaOptions,
  HelixStrictPropertyDefinition,
} from "./HelixAISchemaTypes";

export default class HelixAISchemaService implements HelixAISchema {
  public compileSchema({
    name,
    properties,
    description,
  }: HelixAISchemaOptions): OpenAI.ResponseFormatJSONSchema {
    const requiredFields = properties ? Object.keys(properties) : [];

    return {
      type: "json_schema",
      json_schema: {
        name,
        description,
        strict: true,
        schema: {
          type: "object",
          properties: this.cleanProperties(properties),
          required: requiredFields,
          additionalProperties: false,
        },
      },
    };
  }

  private cleanProperties(
    props: Record<string, HelixStrictPropertyDefinition>,
  ): Record<string, Record<string, unknown>> {
    const cleaned: Record<string, Record<string, unknown>> = {};

    for (const [key, value] of Object.entries(props)) {
      const node: Record<string, unknown> = {
        type: value.type,
        description: value.description,
      };

      if (value.type === "object" && value.properties) {
        node.properties = this.cleanProperties(value.properties);
        node.required = Object.keys(value.properties);
        node.additionalProperties = false;
      }

      if (value.type === "array" && value.items) {
        node.items = this.cleanSingleNode(value.items);
      }

      cleaned[key] = node;
    }

    return cleaned;
  }

  private cleanSingleNode(
    value: HelixStrictPropertyDefinition,
  ): Record<string, unknown> {
    const node: Record<string, unknown> = {
      type: value.type,
      description: value.description,
    };

    if (value.type === "object" && value.properties) {
      node.properties = this.cleanProperties(value.properties);
      node.required = Object.keys(value.properties);
      node.additionalProperties = false;
    }

    return node;
  }
}

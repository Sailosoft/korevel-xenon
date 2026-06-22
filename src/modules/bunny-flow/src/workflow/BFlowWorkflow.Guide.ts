import { z } from "zod";

/**
 * Describes a Zod schema by converting it to JSON Schema first,
 * then recursively building markdown documentation lines.
 *
 * This approach uses Zod v4's built-in `toJSONSchema()` method
 * rather than fragile internal property access.
 *
 * @param schema  The Zod schema to describe.
 * @param prefix  Dot-separated parent path (used for nested recursion).
 * @returns       An array of markdown-formatted description lines.
 */
export function describeZodObject(
  schema: z.ZodTypeAny,
  prefix = "",
): string[] {
  const descriptions: string[] = [];

  try {
    const jsonSchema = schema.toJSONSchema() as Record<string, unknown>;

    if (jsonSchema.type === "object" && jsonSchema.properties) {
      const properties = jsonSchema.properties as Record<
        string,
        Record<string, unknown>
      >;
      const required = (jsonSchema.required as string[]) || [];

      for (const key of Object.keys(properties)) {
        const prop = properties[key];
        const currentKey = prefix ? `${prefix}.${key}` : key;
        const isOptional = !required.includes(key);

        // Determine type description
        let typeDesc = describeJsonSchemaType(prop);

        // Handle nested objects
        if (prop.type === "object" && prop.properties) {
          descriptions.push(
            `- **${currentKey}** (object)${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
          );
          descriptions.push(
            ...describeObjectFromJsonSchema(
              prop as Record<string, unknown>,
              currentKey,
              (prop.required as string[]) || [],
            ),
          );
        }
        // Handle arrays
        else if (prop.type === "array") {
          const items = prop.items as Record<string, unknown> | undefined;
          if (items?.type === "object" && items.properties) {
            descriptions.push(
              `- **${currentKey}** (array of objects)${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
            );
            descriptions.push(
              ...describeObjectFromJsonSchema(
                items,
                `${currentKey}[]`,
                (items.required as string[]) || [],
              ),
            );
          } else {
            const itemType = items ? describeJsonSchemaType(items) : "unknown";
            descriptions.push(
              `- **${currentKey}** (array of ${itemType})${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
            );
          }
        }
        // Handle enums
        else if (prop.enum) {
          const values = (prop.enum as string[]).join(", ");
          descriptions.push(
            `- **${currentKey}** (enum [${values}])${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
          );
        }
        // Handle anyOf/oneOf (unions)
        else if (prop.anyOf || prop.oneOf) {
          const variants = (prop.anyOf || prop.oneOf) as Record<
            string,
            unknown
          >[];
          descriptions.push(
            `- **${currentKey}** (union: ${variants.map((v) => describeJsonSchemaType(v)).join(" | ")})${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
          );
        }
        // Handle primitive types
        else {
          descriptions.push(
            `- **${currentKey}** (${typeDesc})${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
          );
        }
      }
    }
  } catch {
    descriptions.push(
      `- **${prefix || "schema"}** (unable to describe — schema may be a union or complex type)`,
    );
  }

  return descriptions;
}

/**
 * Recursively describes a JSON Schema object node.
 */
function describeObjectFromJsonSchema(
  jsonSchema: Record<string, unknown>,
  prefix: string,
  required: string[],
): string[] {
  const descriptions: string[] = [];
  const properties = jsonSchema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!properties) return descriptions;

  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    const currentKey = prefix ? `${prefix}.${key}` : key;
    const isOptional = !required.includes(key);
    const typeDesc = describeJsonSchemaType(prop);

    if (prop.type === "object" && prop.properties) {
      descriptions.push(
        `- **${currentKey}** (object)${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
      );
      descriptions.push(
        ...describeObjectFromJsonSchema(
          prop,
          currentKey,
          (prop.required as string[]) || [],
        ),
      );
    } else if (prop.type === "array") {
      const items = prop.items as Record<string, unknown> | undefined;
      if (items?.type === "object" && items.properties) {
        descriptions.push(
          `- **${currentKey}** (array of objects)${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
        );
        descriptions.push(
          ...describeObjectFromJsonSchema(
            items,
            `${currentKey}[]`,
            (items.required as string[]) || [],
          ),
        );
      } else {
        const itemType = items ? describeJsonSchemaType(items) : "unknown";
        descriptions.push(
          `- **${currentKey}** (array of ${itemType})${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
        );
      }
    } else if (prop.enum) {
      const values = (prop.enum as string[]).join(", ");
      descriptions.push(
        `- **${currentKey}** (enum [${values}])${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
      );
    } else if (prop.anyOf || prop.oneOf) {
      const variants = (prop.anyOf || prop.oneOf) as Record<
        string,
        unknown
      >[];
      descriptions.push(
        `- **${currentKey}** (union: ${variants.map((v) => describeJsonSchemaType(v)).join(" | ")})${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
      );
    } else {
      descriptions.push(
        `- **${currentKey}** (${typeDesc})${isOptional ? " [Optional]" : ""}${prop.description ? ` - ${prop.description}` : ""}`,
      );
    }
  }

  return descriptions;
}

/**
 * Maps a JSON Schema property to a human-readable type string.
 */
function describeJsonSchemaType(prop: Record<string, unknown>): string {
  if (prop.type === "string") return "string";
  if (prop.type === "number") return "number";
  if (prop.type === "integer") return "integer";
  if (prop.type === "boolean") return "boolean";
  if (prop.type === "array") return "array";
  if (prop.type === "object") return "object";
  if (prop.enum) return `enum`;
  if (prop.anyOf || prop.oneOf) return "union";
  if (prop.type === "null") return "null";
  return prop.type ? String(prop.type) : "any";
}

/**
 * Generates a markdown guide describing the BFlowWorkflow YAML schema structure.
 * Uses the Zod schema's `toJSONSchema()` method for introspection.
 *
 * @returns An array of markdown lines ready for rendering.
 */
export function getWorkflowYamlGuide(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BFlowWorkflowSchema } = require("./BFlowWorkflow.Types");
  return describeZodObject(BFlowWorkflowSchema);
}

/**
 * Returns a formatted markdown string of the workflow YAML structure guide.
 */
export function getWorkflowYamlGuideMarkdown(): string {
  const lines = getWorkflowYamlGuide();
  return [
    "# Workflow YAML Structure Guide",
    "",
    "The workflow YAML follows the schema below. Fields marked with `[Optional]` can be omitted.",
    "",
    "## Schema Fields",
    ...lines,
    "",
    "---",
    "",
    "## Example Minimal Workflow",
    "",
    "```yaml",
    "name: my-workflow",
    "description: A sample workflow",
    "semanticVersion: 1.0.0",
    "variables: []",
    "agentPools: []",
    "agents: []",
    "jobs:",
    "  - id: job-001",
    "    name: my-job",
    "    prompt: Execute the task",
    "    steps:",
    "      - id: step-001",
    "        name: my-step",
    "        prompts: Perform the action",
    "```",
    "",
    "> 💡 **Tip:** Use the code editor above to write your YAML. The validation adapter",
    "> will parse and validate it against the schema before submission.",
  ].join("\n");
}

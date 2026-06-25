import { z } from "zod";

/**
 * Describes a Zod schema by converting it to JSON Schema first,
 * then recursively building YAML-schema-like documentation lines.
 *
 * This approach uses Zod v4's built-in `toJSONSchema()` method
 * rather than fragile internal property access.
 *
 * @param schema  The Zod schema to describe.
 * @returns       An array of YAML-schema-like description lines.
 */
export function describeZodObject(schema: z.ZodTypeAny): string[] {
  try {
    const jsonSchema = schema.toJSONSchema() as Record<string, unknown>;
    return describeSchemaNode(jsonSchema, "", true);
  } catch {
    return ["<unable to describe — schema may be a union or complex type>"];
  }
}

/**
 * Recursively describes a JSON Schema node as YAML-like lines.
 *
 * @param node       The JSON Schema sub-tree to describe.
 * @param indent     Current indentation string (spaces).
 * @param isRoot     Whether this is the root object (skips the key line).
 * @returns          An array of lines forming the YAML schema snippet.
 */
function describeSchemaNode(
  node: Record<string, unknown>,
  indent: string,
  isRoot: boolean,
): string[] {
  const lines: string[] = [];
  const properties = node.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  const required = (node.required as string[]) || [];

  if (!properties) return lines;

  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    const isOptional = !required.includes(key);
    lines.push(...describeProperty(prop, key, isOptional, indent));
  }

  return lines;
}

/**
 * Describes a single JSON Schema property as YAML-schema-like lines.
 */
function describeProperty(
  prop: Record<string, unknown>,
  key: string,
  isOptional: boolean,
  indent: string,
): string[] {
  const lines: string[] = [];
  const opt = isOptional ? "?" : "";

  // ── Nested object ──────────────────────────────────────────────
  if (prop.type === "object" && prop.properties) {
    lines.push(`${indent}${key}${opt}:`);
    lines.push(...describeSchemaNode(prop, `${indent}  `, false));
  }
  // ── Array of objects ───────────────────────────────────────────
  else if (prop.type === "array") {
    const items = prop.items as Record<string, unknown> | undefined;
    if (items?.type === "object" && items.properties) {
      const itemRequired = (items.required as string[]) || [];
      const itemProps = items.properties as Record<
        string,
        Record<string, unknown>
      >;
      lines.push(`${indent}${key}${opt}:`);
      for (const itemKey of Object.keys(itemProps)) {
        lines.push(
          ...describeProperty(
            itemProps[itemKey],
            itemKey,
            !itemRequired.includes(itemKey),
            `${indent}  `,
          ),
        );
      }
    }
    // ── Array of primitives / enums ──────────────────────────────
    else if (items?.enum) {
      const values = (items.enum as string[]).join(" | ");
      lines.push(`${indent}${key}${opt}: ${values}[]`);
    } else {
      const itemType = items ? describeJsonSchemaType(items) : "unknown";
      lines.push(`${indent}${key}${opt}: ${itemType}[]`);
    }
  }
  // ── Enum ───────────────────────────────────────────────────────
  else if (prop.enum) {
    const values = (prop.enum as string[]).join(" | ");
    lines.push(`${indent}${key}${opt}: ${values}`);
  }
  // ── Union (anyOf / oneOf) ─────────────────────────────────────
  else if (prop.anyOf || prop.oneOf) {
    const variants = (prop.anyOf || prop.oneOf) as Record<string, unknown>[];
    const types = variants.map((v) => describeJsonSchemaType(v)).join(" | ");
    lines.push(`${indent}${key}${opt}: ${types}`);
  }
  // ── Primitive or other ─────────────────────────────────────────
  else {
    const typeDesc = describeJsonSchemaType(prop);
    lines.push(`${indent}${key}${opt}: ${typeDesc}`);
  }

  return lines;
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
  if (prop.enum) return "enum";
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
    "The workflow YAML follows the schema below. A `?` suffix means the field is optional.",
    "## Schema Fields",
    "",
    "```yaml",
    ...lines,
    "```",
    "",
    "---",
    "",
    "## Example Workflow — Content Pipeline (v2)",
    "",
    "```yaml",
    "name: Content Pipeline",
    "# Optional: semantic version",
    "# semanticVersion: 1.0.0",
    "# outputType is now on steps, not workflow level",
    "",
    "variables:",
    "  - name: topic",
    '    value: "Artificial Intelligence"',
    "    # type: text      # optional, defaults to text",
    "",
    "# Agents (optional):",
    "# agents:",
    "#   - name: writer",
    "#     role: Technical Writer",
    "#     prompt: You are a technical writer.",
    "#",
    "#   - name: editor",
    "#     role: Editor",
    "#     prompt: You are an editor.",
    "",
    "# Reports configuration (optional):",
    "# reports:",
    "#   - name: final-report",
    '#     label: "Pipeline Report"',
    "#     source: job.step.outputs.__raw__",
    "",
    "jobs:",
    "  - name: research",
    "    prompt: Research the given topic",
    "    agent: writer",
    "    steps:",
    "      - name: gather_facts",
    "        prompts: |",
    '          Research the topic "{topic}" and list 5 key facts.',
    "        agent: writer",
    "",
    "      - name: extract_data",
    "        prompts: |",
    "          From the research above, extract the most important statistic",
    "          and return it as a single number.",
    "        agent: writer",
    "        inputs:",
    "          - name: research_output",
    "            source: research.gather_facts.outputs.__raw__",
    "",
    "  - name: writing",
    "    prompt: Write and edit content",
    "    agent: editor",
    "    needs: research",
    "    steps:",
    "      - name: draft_article",
    "        prompts: |",
    "          Write a short article based on the research and extract.",
    "        agent: editor",
    "        inputs:",
    "          - name: topic_name",
    "            source: vars.topic",
    "          - name: facts",
    "            source: research.gather_facts.outputs.__raw__",
    "          - name: key_stat",
    "            source: research.extract_data.outputs.__raw__",
    "```",
    "",
    "> 💡 **Source Shorthand:** When referencing the full raw output of another step,",
    "> you may omit `.outputs.__raw__` and use the shorthand `{job}.{step}` instead.",
    "> For example, `source: research.gather_facts` is equivalent to",
    "> `source: research.gather_facts.outputs.__raw__`.",
    "> See the [Step Inputs & Outputs Guide](../../docs/step-inputs-outputs.md) for details.",
    "",
    "> 💡 **Output Type Behavior:**",
    "> - Each step can declare either `output` (structured named fields) OR `outputType` (simple format), not both",
    '> - `output[].type` is optional in structured outputs — defaults to `"markdown"`',
    "> - `outputType` on a step (e.g. `outputType: plain`) sets the overall format when no structured outputs are needed",
    '> - If neither `output` nor `outputType` is set, defaults to `"markdown"`',
    "> - The AI prompt is automatically adjusted based on the output type:",
    ">   - `plain` → AI is told to return plain text only (no markdown)",
    ">   - `markdown` → AI is told to use markdown formatting",
    ">   - `html` → AI is told to return valid HTML",
    ">   - `json` → AI is told to return raw JSON",
    "",
    "> 💡 **Structured Outputs:** To declare structured outputs from a step, add an",
    "> `output` array. Each entry requires a `name` and optionally a `type`",
    "> (e.g. `plain`, `markdown`, `json_array`). The AI is then instructed to return",
    "> a JSON object matching those fields, and downstream steps can reference",
    "> individual outputs via `{job}.{step}.outputs.{name}`.",
    "",
    "> 💡 **Reports:** Define `reports` at the workflow level to configure how pipeline",
    "> results are exported. Each report has a `name`, optional `label`, and `source`",
    "> (e.g. `job.step`, `job.step.outputs.__raw__`, or `job.steps.outputs.{name}`).",
    "",
    "> 💡 **Tip:** Use the code editor above to write your YAML. The validation adapter",
    "> will parse and validate it against the schema before submission.",
  ].join("\n");
}

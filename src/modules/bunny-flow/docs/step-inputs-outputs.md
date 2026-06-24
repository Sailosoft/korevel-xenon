# BunnyFlow — Step Inputs & Outputs Guide

## Overview

BunnyFlow supports passing data **between steps** and **from pipeline variables** into individual steps via its **input source system**. This enables powerful workflow chaining where the output of one step becomes the input of another.

### Supported Source Patterns

| Pattern                       | Description                                                                           | Example                                 |
| ----------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| `vars.{name}`                 | Reference a pipeline/flow variable                                                    | `vars.api_endpoint`                     |
| `{job}.{step}`                | Shorthand for a step's full raw output (equivalent to `{job}.{step}.outputs.__raw__`) | `research.gather_facts`                 |
| `{job}.{step}.outputs.{name}` | Reference another step's output                                                       | `analysis.extract_data.outputs.__raw__` |

---

## Quick Start — 3-Step Example

Here's a complete workflow YAML demonstrating the input/output system with 3 steps across 2 jobs:

```yaml
name: Content Pipeline
semanticVersion: 1.0.0
variables:
  - name: topic
    defaultValue: "Artificial Intelligence"
    type: text

agents:
  - name: writer
    slug: writer
    role: Technical Writer
    prompt: You are a technical writer.

  - name: editor
    slug: editor
    role: Editor
    prompt: You are an editor.

jobs:
  - name: research
    prompt: Research the given topic
    agent: writer
    steps:
      - name: gather_facts
        prompts: |
          Research the topic "{topic}" and list 5 key facts.
        agent: writer

      - name: extract_data
        prompts: |
          From the research above, extract the most important statistic
          and return it as a single number.
        agent: writer
        inputs:
          - name: research_output
            source: research.gather_facts.outputs.__raw__

  - name: writing
    prompt: Write and edit content
    agent: editor
    needs: research
    steps:
      - name: draft_article
        prompts: |
          Write a short article based on the research and extract.
        agent: editor
        inputs:
          - name: topic_name
            source: vars.topic
          - name: facts
            source: research.gather_facts.outputs.__raw__
          - name: key_stat
            source: research.extract_data.outputs.__raw__
```

### How this flows:

1. **Job `research`** executes:
   - Step `gather_facts` — researches the topic, produces raw text output
   - Step `extract_data` — takes `research.gather_facts.outputs.__raw__` as input, extracts a statistic

2. **Job `writing`** executes (after `research` completes):
   - Step `draft_article` — receives **3 inputs**:
     - `vars.topic` → the pipeline variable value
     - `research.gather_facts.outputs.__raw__` → the full output from step 1
     - `research.extract_data.outputs.__raw__` → the statistic from step 2

---

## Reference Guide

### 1. Defining Inputs on a Step

Inputs are defined in the workflow YAML under a step's `inputs` array:

```yaml
steps:
  - name: my_step
    prompts: Do something with inputs
    inputs:
      - name: input_alias
        source: vars.my_variable
      - name: another_input
        source: some_job.some_step.outputs.__raw__
```

**Fields:**

| Field    | Required | Description                                                          |
| -------- | -------- | -------------------------------------------------------------------- |
| `name`   | ✅       | An alias for this input. Used to reference it in the prompt context. |
| `source` | ✅       | The source reference. See supported patterns below.                  |

### 2. Source Patterns

#### Pattern A: `vars.{variable_name}`

References a pipeline variable or flow variable by name.

```yaml
inputs:
  - name: endpoint
    source: vars.api_url
  - name: model
    source: vars.ai_model
```

**Validation:**

- ✅ Variable exists → resolved to its current value
- ❌ Variable does not exist → step fails with error:
  ```
  Variable "api_url" referenced in input "endpoint" source "vars.api_url" does not exist.
  Available variables: topic, model, temperature (or "(none)")
  ```

#### Pattern B: `{job_name}.{step_name}.outputs.{output_name}`

References the output of another step. The step must have **already executed** before this step runs.

```yaml
inputs:
  - name: full_text
    source: research.gather_facts.outputs.__raw__
  - name: structured_data
    source: analysis.parse_data.outputs.parsed_json
```

**Special output names:**

| Output Name     | Description                                           |
| --------------- | ----------------------------------------------------- |
| `__raw__`       | The full raw text output from the AI step             |
| `{custom_name}` | A named output if the step defines structured outputs |

**Validation chain:**

1. ✅ Job `{job_name}` exists → continues
2. ✅ Step `{step_name}` exists in that job → continues
3. ✅ Step has been executed (outputs available) → continues
4. ✅ Output `{output_name}` exists in that step's outputs → **resolved**
5. ❌ Any check fails → step fails with descriptive error:
   ```
   Step "gather_facts" in job "research" has not been executed yet.
   Input "facts" source "research.gather_facts.outputs.__raw__" references
   a step that must run first.
   ```

#### Pattern C (Shorthand): `{job_name}.{step_name}`

A convenient shortcut for referencing the **full raw output** of another step.
Equivalent to `{job_name}.{step_name}.outputs.__raw__`.

```yaml
inputs:
- name: full_text
 source: research.gather_facts          # ← shorthand, no .outputs.__raw__ needed
```

This is especially useful when the step has **no structured outputs** defined and you
simply need the entire raw text.

**When to use `{job}.{step}` vs `{job}.{step}.outputs.__raw__`:**

| Use Case                                    | Recommended Syntax             |
| ------------------------------------------- | ------------------------------ |
| Need the full raw output (most common case) | `{job}.{step}` (shorthand)     |
| Be explicit about intent                    | `{job}.{step}.outputs.__raw__` |
| Reference a specific structured field       | `{job}.{step}.outputs.{field}` |

**Validation chain:** (same as Pattern B for job/step validation, output resolution is implicit)

1. ✅ Job `{job_name}` exists → continues
2. ✅ Step `{step_name}` exists in that job → continues
3. ✅ Step has been executed (outputs available) → continues
4. ✅ Resolves implicitly to `__raw__` → **resolved**

### 3. How Inputs Appear in the AI Prompt

When a step has resolved inputs, they are injected into both the **system prompt** and the **user prompt**:

**System prompt (auto-injected):**

```
You are executing step "draft_article" in job "writing" of a pipeline.

Instructions: Write a short article based on the research and extract.

Resolved Inputs:
  topic_name = Artificial Intelligence
  facts = [full research output text here...]
  key_stat = 42% of enterprises use AI

Available variables:
  topic = Artificial Intelligence
```

**User prompt (auto-injected):**

```
Execute step "draft_article" with the following inputs:
  topic_name: Artificial Intelligence
  facts: [full research output text here...]
  key_stat: 42% of enterprises use AI

Provide the output for this step.
```

### 3a. How Inputs Are Injected — Under the Hood

The resolved input injection described above is implemented by the prompt builder strategy in use. BunnyFlow supports two strategies:

| Strategy                     | File                                                                          | Approach                                                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TemplateBar** (Handlebars) | [`BFlowRun.Prompt.TemplateBar.ts`](../src/run/BFlowRun.Prompt.TemplateBar.ts) | Two-pass system: Pass 1 interpolates `{{marker}}` references in prompt strings using a flat context map; Pass 2 renders the pre-interpolated strings through Handlebars templates with `{{#if}}` / `{{#each}}` helpers. |
| **SectionBuilder** (fluent)  | [`BFlowRun.SectionBuilder.ts`](../src/run/BFlowRun.SectionBuilder.ts)         | Legacy fluent builder that appends prompt sections (instructions, inputs, variables, output format) one by one via method chaining.                                                                                     |

Both implement the [`IBFlowRunPromptBuilder`](../src/run/BFlowRun.Prompt.Types.ts) interface and produce identical prompt output — they differ only in how sections are assembled internally.

The strategy is selected at runtime via the `BFlowPromptBuilderKind` enum (`Section` | `TemplateBar`) defined in [`BFlowRun.Prompt.Types.ts`](../src/run/BFlowRun.Prompt.Types.ts).

### 4. Execution Order & Dependencies

Steps execute **sequentially within a job**. Jobs execute **sequentially across the pipeline**.

```
Job 1: "research"
  +-- Step "gather_facts" ------------+ (output available after execution)
  +-- Step "extract_data" ------------+ (can reference gather_facts.outputs)

Job 2: "writing"
  +-- Step "draft_article" -----------+ (can reference any step in job 1)
```

**Rules:**

- A step can only reference outputs from **earlier steps** (same job or previous jobs)
- Cross-job references work as long as the referenced job completed first
- Use `needs` on a job to enforce job-level ordering (see `needs: research` in the example)

### 5. Using `needs` for Job Ordering

If steps in Job B reference outputs from Job A, ensure Job B has `needs: A`:

```yaml
- name: job_a
  steps:
    - name: step_1
      prompts: Generate report
      # produces output

- name: job_b
  needs: job_a # Required! Ensures job_a runs first
  steps:
    - name: step_2
      prompts: Summarize the report
      inputs:
        - name: report
          source: job_a.step_1.outputs.__raw__
```

Without `needs`, Job B might start before Job A's outputs are available, causing an error.

### 6. YAML Structure Reference

Complete structure for a workflow with inputs:

```yaml
name: My Workflow
semanticVersion: 1.0.0
variables:
  - name: var_name
    defaultValue: "value"
    type: text

agents:
  - name: agent_name
    slug: agent_slug
    role: Role description
    prompt: Agent system prompt

jobs:
  - name: job_name
    prompt: Job-level context
    agent: agent_slug # optional per-job agent
    needs: other_job # optional dependency
    steps:
      - name: step_name
        prompts: Instructions for the AI
        agent: agent_slug # optional per-step agent override
        inputs: # OPTIONAL: define inputs
          - name: input_1
            source: vars.variable_name
          - name: input_2
            source: other_job.other_step # shorthand for .outputs.__raw__
          - name: input_3
            source: other_job.other_step.outputs.__raw__ # explicit (equivalent)
```

---

## Error Reference

When input resolution fails, the step is marked as `failed` with a clear error message:

| Scenario                 | Error Message                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variable not found       | `Variable "{name}" referenced in input "{input}" source "{source}" does not exist. Available variables: ...`                                        |
| Job not found            | `Job "{name}" referenced in input "{input}" source "{source}" does not exist. Available jobs: ...`                                                  |
| Step not found in job    | `Step "{name}" in job "{job}" referenced in input "{input}" source "{source}" does not exist. Available steps in job "{job}": ...`                  |
| Step hasn't executed yet | `Step "{name}" in job "{job}" has not been executed yet. Input "{input}" source "{source}" references a step that must run first.`                  |
| Output name not found    | `Output "{name}" from step "{step}" in job "{job}" ... does not exist. Available outputs: ...`                                                      |
| Invalid source format    | `Input "{input}" has an unrecognized source format: "{source}". Expected formats: "vars.{name}", "{job}.{step}", or "{job}.{step}.outputs.{name}".` |

---

## Structured Outputs Guide

BunnyFlow supports **named structured outputs** from AI steps. When a step defines an `output` array in its schema, the system:

1. **Instructs the AI** to return a JSON object matching the declared output fields
2. **Parses the AI response** and extracts each named value
3. **Registers each named output** so downstream steps can reference them individually via `{job}.{step}.outputs.{name}`

This enables granular cross-step references — instead of passing the entire raw text, steps can consume specific fields.

### Defining Outputs on a Step

```yaml
steps:
  - name: analyze_data
    prompts: |
      Analyze the data and extract the summary, score, and tags.
    output:
      - name: summary
        type: plain
      - name: score
        type: number
      - name: tags
        type: json_array
      - name: raw_report
        type: markdown
```

**Supported output types:**

| Type         | Description         | Parsing behavior                         |
| ------------ | ------------------- | ---------------------------------------- |
| `plain`      | Plain text          | Stored as-is                             |
| `markdown`   | Markdown text       | Stored as-is                             |
| `json`       | Structured JSON obj | Parsed from AI response, value extracted |
| `json_array` | JSON array          | Parsed from AI response                  |
| `yaml`       | YAML content        | Parsed from AI response                  |
| `html`       | HTML content        | Stored as-is                             |
| `csv`        | CSV data            | Stored as-is                             |

### How It Works (Behind the Scenes)

**1. Prompt Injection** — When a step has `output` definitions, the system appends this to the system prompt:

```
You MUST return your response as a valid JSON object with the following fields:
{
  "summary": <plain>,
  "score": <number>,
  "tags": <json_array>,
  "raw_report": <markdown>
}
Do NOT include any text outside the JSON object. Do NOT wrap it in markdown code blocks.
Return ONLY the raw JSON object.
```

**2. Parsing** — After the AI responds, the system attempts to parse the response as JSON and extract each declared field. If the AI wraps the JSON in markdown code blocks (` ```json ... ``` `), the parser strips those automatically.

**3. Registration** — Each named output is registered in addition to the `__raw__` full text:

```
After step "analyze_data" executes:
  - __raw__        -> {"summary": "Data shows...", "score": 85, "tags": [...], ...}
  - summary        -> "Data shows..."
  - score          -> 85
  - tags           -> [...]
  - raw_report     -> "# Report\n\n..."
```

### Referencing Structured Outputs in Downstream Steps

Once a step has structured outputs, downstream steps can reference them individually:

```yaml
steps:
  - name: analyze_data
    prompts: Extract summary, score, and tags from the data.
    output:
      - name: summary
        type: plain
      - name: score
        type: number
      - name: tags
        type: json_array

  - name: generate_report
    prompts: |
      Write a report based on the analysis summary and top tag.
    inputs:
      - name: analysis_summary # References only the "summary" field
        source: job_a.analyze_data.outputs.summary
      - name: top_tag # References only the first tag
        source: job_a.analyze_data.outputs.tags
      - name: full_analysis # Can still reference the raw output
        source: job_a.analyze_data.outputs.__raw__
```

### Complete Example — Structured Outputs Pipeline

```yaml
name: Data Analysis Pipeline
semanticVersion: 1.0.0
variables:
  - name: dataset_description
    defaultValue: "Customer survey responses Q1 2025"
    type: text

agents:
  - name: analyst
    slug: analyst
    role: Data Analyst
    prompt: You are a data analyst specializing in survey data.

  - name: writer
    slug: writer
    role: Content Writer
    prompt: You are a technical content writer.

jobs:
  - name: analysis
    prompt: Analyze the dataset
    agent: analyst
    steps:
      - name: extract_insights
        prompts: |
          Analyze the dataset: "{dataset_description}".
          Extract the key insight, sentiment score (0-100), and
          list of top 3 keywords.
        output: # Declare structured outputs
          - name: key_insight
            type: plain
          - name: sentiment_score
            type: number
          - name: keywords
            type: json_array

  - name: reporting
    prompt: Generate reports from analysis
    agent: writer
    needs: analysis # Required for cross-job refs
    steps:
      - name: write_summary
        prompts: |
          Write a short executive summary based on the insight.
        inputs:
          - name: insight # References named output directly
            source: analysis.extract_insights.outputs.key_insight
          - name: score # References the numeric score
            source: analysis.extract_insights.outputs.sentiment_score

      - name: generate_keywords_report
        prompts: |
          Write a detailed breakdown of the keywords.
        inputs:
          - name: keyword_list # References the JSON array
            source: analysis.extract_insights.outputs.keywords
```

### What Downstream Steps Receive

When `write_summary` executes, the AI receives these **resolved inputs**:

```
Resolved Inputs:
  insight = [the extracted key insight text]
  score = 85

Available variables:
  dataset_description = Customer survey responses Q1 2025
```

### Structured Output vs. Raw `__raw__`

| Use Case                        | Reference         | Example                      |
| ------------------------------- | ----------------- | ---------------------------- |
| Need the full AI response       | `__raw__`         | `outputs.__raw__`            |
| Need a specific extracted field | `{field_name}`    | `outputs.sentiment_score`    |
| Need the parsed JSON object     | individual fields | Reference each field by name |

### Error Handling

If the AI fails to return valid JSON matching the declared output fields:

1. **Fallback behavior** — Each named output falls back to the full raw text
2. **No hard failure** — The step still succeeds; downstream steps get the raw text for any unparseable field
3. **Tip** — If a downstream step needs `outputs.sentiment_score` but the AI didn't return JSON, the value will be the full raw text — ensure your prompts are clear about the required output format

---

## Tips & Best Practices

1. **Use `__raw__` for full output** — The complete AI response is always stored under the `__raw__` key. This is the most common reference.

2. **Name steps clearly** — Step names are used as identifiers in source references. Use descriptive, slug-compatible names like `extract_data`, `generate_summary`.

3. **Order steps logically** — Place steps that produce referenced outputs **before** steps that consume them.

4. **Use `needs` for cross-job references** — Always add `needs` to enforce job ordering when referencing outputs from another job.

5. **Start simple** — Begin with `vars.{name}` references which don't depend on execution order, then graduate to cross-step references.

6. **Leverage structured outputs for granularity** — Instead of passing the entire raw text, define structured `output` fields to pass only what downstream steps need.

7. **Be explicit about JSON output format** — When using structured outputs, ensure your `prompts` instructions clearly tell the AI to return JSON matching the declared output fields.

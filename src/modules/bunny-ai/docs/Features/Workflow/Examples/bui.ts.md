# BUI Workflow TypeScript Entity

```ts
export type BUIWorkflowVariableType =
  | "text"
  | "editor"
  | "textarea"
  | "select"
  | "number";

export type BUIWorkflowGenerateMode = "text" | "flat";
export type BUIWorkflowReportType = "plain" | "flat" | "per_job";

export type BUIWorkflowStepOutput =
  | "plain"
  | Array<{
      name: string;
      description?: string;
    }>;

export interface BUIWorkflowVariable {
  name: string;
  value: string | number | boolean;
  description?: string;
  type: BUIWorkflowVariableType;
}

export interface BUIWorkflowStepInput {
  name: string;
  source: string;
  // Example:
  // generate_draft.create_article.outputs.raw_draft
}

export interface BUIWorkflowStep {
  name: string;
  inputs?: BUIWorkflowStepInput[];
  prompts: string | string[];
  generate_mode?: BUIWorkflowGenerateMode;
  output?: BUIWorkflowStepOutput;
}

export interface BUIWorkflowJob {
  name: string;
  needs?: string | string[];
  agent: string;
  group?: string;
  variables?: BUIWorkflowVariable[];
  steps: BUIWorkflowStep[];
}

export interface BUIWorkflowGroupOverride {
  group: string;
  variables?: BUIWorkflowVariable[];
}

export interface BUIWorkflowReportExport {
  name: string;
  value: string;
  // Example:
  // optimize_seo.generate_meta_summary.outputs.default
}

export interface BUIWorkflowReports {
  type: BUIWorkflowReportType;
  filename: string;
  exports: BUIWorkflowReportExport[];
}

export interface BUIWorkflowConfig {
  name: string;
  group?: string;
  variables?: BUIWorkflowVariable[];

  agentPool?: string;
  agents?: string[];

  jobs: BUIWorkflowJob[];
  groups?: BUIWorkflowGroupOverride[];

  // Keep both for compatibility while docs use mixed casing.
  Reports?: BUIWorkflowReports;
  reports?: BUIWorkflowReports;
}
```

# Example Typed Object (Based on PLAN.ADVICE-1.yaml)

```ts
const workflowExample: BUIWorkflowConfig = {
  name: "Content Generation Pipeline",
  group: "staging",
  variables: [
    {
      name: "target_audience",
      value: "tech professionals",
      description: "The primary demographic targeting parameter",
      type: "text",
    },
    {
      name: "model_temperature",
      value: 0.7,
      description: "Creativity threshold for the AI agents",
      type: "number",
    },
  ],
  agentPool: "marketing-cluster",
  agents: ["copywriter-agent", "SEO-optimizer-agent", "reviewer-agent"],
  jobs: [
    {
      name: "generate_draft",
      agent: "copywriter-agent",
      group: "staging",
      variables: [
        {
          name: "tone_of_voice",
          value: "professional yet engaging",
          description: "Local job override for writing style",
          type: "text",
        },
      ],
      steps: [
        {
          name: "create_article",
          prompts: [
            "Write a short blog post targeting {{vars.target_audience}} using a {{vars.tone_of_voice}} tone. Focus on AI automation.",
          ],
          generate_mode: "text",
          output: [
            {
              name: "raw_draft",
              description: "The unoptimized first iteration of the text article",
            },
          ],
        },
      ],
    },
    {
      name: "optimize_seo",
      needs: "generate_draft",
      agent: "SEO-optimizer-agent",
      variables: [
        {
          name: "keywords",
          value: "AI workflow, GitHub actions for AI, automation",
          description: "Target search terms to inject",
          type: "textarea",
        },
      ],
      steps: [
        {
          name: "apply_keywords",
          inputs: [
            {
              name: "baseline_text",
              source: "generate_draft.create_article.outputs.raw_draft",
            },
          ],
          prompts: [
            "Inject the following keywords: {{vars.keywords}} into this baseline article without disrupting its natural readability:\n\n{{inputs.baseline_text}}",
          ],
          generate_mode: "text",
          output: [
            {
              name: "optimized_draft",
              description: "The copy containing high-value search terms",
            },
          ],
        },
        {
          name: "generate_meta_summary",
          inputs: [
            {
              name: "final_copy",
              source: "optimize_seo.apply_keywords.outputs.optimized_draft",
            },
          ],
          prompts: [
            "Create a one-sentence meta-description for search engines based on this text:\n\n{{inputs.final_copy}}",
          ],
          generate_mode: "flat",
          output: "plain",
        },
      ],
    },
  ],
  groups: [
    {
      group: "production",
      variables: [
        {
          name: "target_audience",
          value: "enterprise executives",
          description: "Production shift toward corporate enterprise level scale",
          type: "text",
        },
        {
          name: "model_temperature",
          value: 0.3,
          description:
            "Lower temperature for strict factual compliance in production",
          type: "number",
        },
      ],
    },
    {
      group: "staging",
      variables: [
        {
          name: "target_audience",
          value: "tech startups and early adopters",
          description:
            "A loose tech demographic alignment for testing environments",
          type: "text",
        },
      ],
    },
  ],
  Reports: {
    type: "per_job",
    filename: "marketing_campaign_report.md",
    exports: [
      {
        name: "Initial Drafting Result",
        value: "generate_draft.create_article.outputs.raw_draft",
      },
      {
        name: "SEO Optimized Article Body",
        value: "optimize_seo.apply_keywords.outputs.optimized_draft",
      },
      {
        name: "Search Engine Snippet Summary",
        value: "optimize_seo.generate_meta_summary.outputs.default",
      },
    ],
  },
};
```

# Normalizer (Reports/reports + prompt array)

```ts
type BUIWorkflowNormalizedConfig = Omit<BUIWorkflowConfig, "Reports" | "reports" | "jobs"> & {
  reports?: BUIWorkflowReports;
  jobs: Array<Omit<BUIWorkflowJob, "steps"> & {
    steps: Array<Omit<BUIWorkflowStep, "prompts"> & { prompts: string[] }>;
  }>;
};

export function normalizeWorkflowConfig(
  config: BUIWorkflowConfig,
): BUIWorkflowNormalizedConfig {
  const reports = config.Reports ?? config.reports;

  return {
    name: config.name,
    group: config.group,
    variables: config.variables,
    agentPool: config.agentPool,
    agents: config.agents,
    groups: config.groups,
    reports,
    jobs: config.jobs.map((job) => ({
      ...job,
      steps: job.steps.map((step) => ({
        ...step,
        prompts: Array.isArray(step.prompts) ? step.prompts : [step.prompts],
      })),
    })),
  };
}

// Usage
const normalized = normalizeWorkflowConfig(workflowExample);
console.log(normalized.reports?.filename);
console.log(normalized.jobs[0].steps[0].prompts[0]);
```

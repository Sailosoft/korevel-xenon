# Bunny AI Workflow

## Description

This is inspired github actions for AI workers.

```yaml
# Workflow
name: Name of workflow
group: name of env
variables:
  - name: Name of variable
    value: value
    description: Description of variable
    type: text | editor | textarea | select | number
agentPool: name of pool agents
agents:
  - agentId
  - agentId
jobs:
  - name: job1
    needs: optional need of name job
    agent: agentId
    group: optional override use of default group
    variables:
      - name: Name of variable
        value: value
        description: Description of variable
        type: text | editor | textarea | select | number
    steps:
      - name: Name of Step
        prompts: "Prompt and access {{vars.name_of_var}}"
        output:
          - name: Name of pipeline value
            description: Description of value
        generate_mode: text | flat
      - name: Name of step
        input:
          - name: Name of pipeline value
        prompts:
          - "input: {{inputs.name_of_var}}"
        output:
          - name: name of value
            description: Description of value
  - name: job2
    agent: agentId
    group: optional
    variables:
    steps:
      - name: step1
        prompts: "Prompts and access {{job1.name_of_step.outputs.name_of_value}}"
      - output: "plain"
      - name: step2
        inputs:
          - name: name of input
            source: job2.step1.outputs.default
        prompts:
          - "input: {{inputs.name_of_var}}"
        output:
          - name: name of value
            description: Description of value

Reports:
  type: plain | flat | per_job
  filename: name of file
  exports:
    - name: title of exports
      value: job1.step1.outputs.name_of_value
    - name: title of exports
      value: job2.step1.outputs.default
```

```yaml
# Pipeline Store: temporary in memory value good for managing value of groups variables

# Pipeline Value: current pipeline generated value of prompted output
```

```yaml
# Variables will be override the workflow base on specified env
groups:
  - group: name of env
    variable:
      - name: Name of variable
        value: value
        description: Description of variable
        type: text | editor | textarea | select | number
```

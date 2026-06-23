# BFlowRun — Pipeline Execution Flowchart

## Use Case & Purpose

**BFlowRun** is the execution engine and run-time UI for **BunnyFlow pipelines** — multi-step AI workflows
defined as YAML templates. A pipeline is composed of **Jobs** (logical work units) each containing a sequence
of **Steps** (individual AI chat calls to configurable LLM providers via Helix).

| Aspect            | Description                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who uses it**   | End-users who configure and trigger AI pipelines from the UI                                                                                                          |
| **What it does**  | Orchestrates sequential job→step execution, resolves variables/inputs at each step, calls AI providers, tracks progress in IndexedDB, and presents real-time state    |
| **Why it exists** | To provide a **presentation-decoupled, testable** run view where the component is purely stateless and all logic lives in composable hooks + a dedicated engine class |

---

## Architecture Layers

```mermaid
flowchart TD
    subgraph UI_Layer ["UI Layer (React Component)"]
        BFlowRunComponent["BFlowRunComponent.tsx<br/>Presentational — stateless view"]
    end

    subgraph Hook_Layer ["Hook Layer (Stateful Orchestration)"]
        useBFlowRun["useBFlowRun()<br/>Composite: composes all sub-hooks"]
        useBFlowRunDataLoad["useBFlowRunDataLoad()<br/>Loads pipeline, template,<br/>variable group, flow vars<br/>from IndexedDB"]
        useBFlowRunPolling["useBFlowRunPolling()<br/>Polls IndexedDB every 2s<br/>for live run state updates"]
        useBFlowRunSubmit["useBFlowRunSubmit()<br/>Manages startPipelineRun()<br/>and generateReport()"]
    end

    subgraph Engine_Layer ["Engine & Builder Layer"]
        BFlowRunPromptBuilder["BFlowRunPromptBuilder<br/>Builds system/user prompts<br/>with resolved variables + inputs"]
        BFlowRunInputResolver["BFlowRunInputResolver<br/>Resolves step input sources:<br/>vars.{name} or {job}.{step}.outputs.{name}"]
    end

    subgraph Action_Layer ["Server Action Layer (secure AI calls)"]
        executeStepChatAction["executeStepChatAction()<br/>'use server' — calls Helix AI<br/>for a single step"]
    end

    subgraph Data_Layer ["Data Layer (IndexedDB)"]
        BFlowRun_Types["BFlowRun.Types.ts<br/>Zod schemas: BFlowStepRun,<br/>BFlowJobRun, BFlowPipelineRunEntity"]
        BFlowRunDB["BFlowRunDB<br/>PhazeRepository-based queries<br/>getLatestPipelineRun, getJobRunsForRun,<br/>getStepRunsForRun"]
    end

    BFlowRunComponent -->|"consumes useBFlowRun()"| Hook_Layer
    useBFlowRun --> useBFlowRunDataLoad
    useBFlowRun --> useBFlowRunPolling
    useBFlowRun --> useBFlowRunSubmit
    useBFlowRunSubmit -->|"prompts via"| BFlowRunPromptBuilder
    useBFlowRunSubmit -->|"inputs via"| BFlowRunInputResolver
    useBFlowRunSubmit -->|"calls"| executeStepChatAction
    useBFlowRunDataLoad -->|"reads"| BFlowRunDB
    useBFlowRunPolling -->|"polls"| BFlowRunDB
    useBFlowRunSubmit -->|"writes"| BFlowRunDB
    BFlowRunDB -->|"schemas from"| BFlowRun_Types
```

---

## Initial Data Load Flow (useBFlowRunDataLoad)

```mermaid
flowchart TD
    START["Component mounts<br/>with pipelineId"] -->|"calls useBFlowRun(pipelineId)"| C1{"pipelineId exists?"}
    C1 -->|"No"| ERR1["Set error: 'Pipeline ID not found'<br/>Set loading: false"]
    C1 -->|"Yes"| LOAD_P["Load pipeline from IndexedDB<br/>bflowDB.pipelines.get(pipelineId)"]
    LOAD_P -->|"pipeline found"| LOAD_T["Load workflow template<br/>bflowDB.workflowTemplates.get(pipeline.templateId)"]
    LOAD_P -->|"not found"| ERR2["Set error: 'Pipeline not found (id)'"]
    LOAD_T -->|"template found"| LOAD_VG["Load variable group<br/>bflowDB.variableGroups.get(pipeline.variableGroupId)"]
    LOAD_T -->|"not found"| WARN_T["Template undefined<br/>(non-fatal warning)"]
    LOAD_VG -->|"group found"| LOAD_FV["Load flow variables<br/>bflowDB.flowVariables<br/>.where('groupId')<br/>.equals(group.id)"]
    LOAD_VG -->|"no group"| EMPTY_FV["Flow variables = []"]
    LOAD_FV --> MERGE_VARS["Merge variables:<br/>1. Template defaults (lowest priority)<br/>2. Flow variables override template<br/>3. Pipeline variables override all"]
    MERGE_VARS --> DERIVE_JOBS["Derive jobs from<br/>template.template.jobs"]
    DERIVE_JOBS --> DONE["Return: pipeline, template,<br/>variableGroup, flowVariables,<br/>resolvedVariables, jobs, loading=false"]
    ERR1 --> DONE
    ERR2 --> DONE
    WARN_T --> LOAD_VG
```

---

## Polling Flow (useBFlowRunPolling)

```mermaid
flowchart TD
    MOUNT["useBFlowRunPolling(pipelineId) mounts"] --> INIT_LOAD["Initial load:<br/>getLatestPipelineRun(pipelineId)"]
    INIT_LOAD -->|"run found"| LOAD_JOBS_STEPS["Load jobRuns + stepRuns<br/>(parallel Promise.all)"]
    INIT_LOAD -->|"no run"| EMPTY["Set jobRuns=[], stepRuns=[]<br/>initialLoadDone=true"]
    LOAD_JOBS_STEPS --> SET_STATE["Set activeRun, jobRuns, stepRuns<br/>initialLoadDone=true"]
    SET_STATE --> START_INTERVAL["Start setInterval(2000ms)"]
    START_INTERVAL --> POLL["Poll: getLatestPipelineRun(pipelineId)"]
    POLL -->|"run exists<br/>AND status is running/pending"| UPDATE_RUN["Update activeRun state"]
    UPDATE_RUN --> POLL_JOBS_STEPS["Load jobRuns + stepRuns<br/>(parallel Promise.all)"]
    POLL_JOBS_STEPS --> UPDATE_STATE["Update jobRuns, stepRuns"]
    UPDATE_STATE --> POLL
    POLL -->|"no run<br/>OR terminal status"| STOP_INTERVAL["Clear interval<br/>(stop polling)"]
    POLL -->|"terminal status"| FINAL_UPDATE["Final state update"]
```

---

## Pipeline Execution Flow (startPipelineRun)

```mermaid
flowchart TD
    TRIGGER["User clicks 'Run Pipeline'"] -->|"isRunning guard"| VALIDATE{"pipeline exists?<br/>template exists?"}
    VALIDATE -->|"No"| EXIT["Return (no-op)"]
    VALIDATE -->|"Yes"| PREP["set isRunning=true<br/>clearError(null)"]

    PREP --> CREATE_RUN["1. Create BFlowPipelineRunEntity<br/>status: 'running'<br/>id: uuidv7()<br/>startedAt: now<br/>Write to IndexedDB"]
    CREATE_RUN -->|"onRunUpdate refresh"| AI_CONFIG["2. Resolve AI config<br/>resolveAIConfig(pipeline)<br/>→ provider + model from Helix"]
    AI_CONFIG --> VARMAP["3. Build resolution context:<br/>- variableMap (vars)<br/>- empty stepOutputs Map"]
    VARMAP --> JOB_LOOP["4. For each job (sequential)"]

    subgraph PER_JOB ["Per-Job Execution"]
        JOB_LOOP --> CREATE_JOB_RUN["4a. Create BFlowJobRun<br/>status: 'running'<br/>jobRunId: uuidv7()<br/>Write to IndexedDB"]
        CREATE_JOB_RUN --> STEP_LOOP["4b. For each step in job (sequential)"]

        STEP_LOOP --> RESOLVE_INPUTS["5a. Resolve step inputs<br/>inputResolver.resolveStepInputs(step, job, context)<br/>→ ResolvedStepInput[]"]
        RESOLVE_INPUTS -->|"resolution fails"| INPUT_ERR["Throw InputResolutionError<br/>→ Write failed BFlowStepRun<br/>→ Mark job as failed<br/>→ Break step loop"]
        RESOLVE_INPUTS -->|"success"| BUILD_PROMPTS["5b. Build prompts:<br/>- systemPrompt = buildStepSystemPrompt()<br/>- userPrompt = buildUserPrompt()"]
        BUILD_PROMPTS --> EXEC_STEP["5c. Server action:<br/>executeStepChatAction(stepRequest)"]
        EXEC_STEP -->|"Helix AI chat"| RESULT["5d. Receive StepExecutionResponse<br/>{ success, output, error }"]
        RESULT --> WRITE_STEP_RUN["5e. Write BFlowStepRun to IndexedDB<br/>with resolvedInputs, prompts,<br/>output, structuredOutput"]
        WRITE_STEP_RUN --> REGISTER_OUTPUT["5f. Register step output<br/>inputResolver.registerStepOutput()<br/>→ stepOutputs map updated"]
        REGISTER_OUTPUT -->|"step succeeded"| CHECK_NEXT_STEP{"More steps?"}
        REGISTER_OUTPUT -->|"step failed"| MARK_JOB_FAILED["5g. Mark job as failed<br/>update jobRuns repo<br/>→ break step loop"]
        MARK_JOB_FAILED --> CHECK_NEXT_STEP
        CHECK_NEXT_STEP -->|"Yes"| STEP_LOOP
    end

    PER_JOB -->|"Job finished"| MARK_JOB_DONE["Mark job succeeded<br/>Update jobRuns repo"]
    MARK_JOB_DONE --> REFRESH_UI["Immediate UI refresh:<br/>load latest jobRuns + stepRuns<br/>→ onRunDataUpdate()<br/>(bypasses 2s poll)"]
    REFRESH_UI --> MORE_JOBS{"More jobs?"}
    MORE_JOBS -->|"Yes"| JOB_LOOP
    MORE_JOBS -->|"No"| FINALIZE["6. Finalize pipeline run<br/>status: 'succeeded' | 'failed'<br/>Write completedAt<br/>Update pipelineRuns repo"]
    FINALIZE --> FINAL_REFRESH["7. Final state refresh:<br/>getLatestPipelineRun()<br/>load jobRuns + stepRuns<br/>→ onRunUpdate()"]
    FINAL_REFRESH -->|"anyFailed?"| SHOW_ERROR["if failed: onError(globalError)"]
    FINAL_REFRESH --> DONE_EXEC["set isRunning=false"]
```

---

## Input Resolution — Detailed Flow

```mermaid
flowchart TD
    RESOLVE["resolveStepInputs(step, job, context)"] -->|"step.inputs exists?"| CHECK_INPUTS{"Has inputs?"}
    CHECK_INPUTS -->|"No"| EMPTY_RESULT["Return []"]
    CHECK_INPUTS -->|"Yes"| LOOP_INPUTS["For each input definition<br/>{ name, source }"]

    LOOP_INPUTS --> PARSE_SOURCE["parse source string"]

    PARSE_SOURCE -->|"matches vars.{name}"| LOOKUP_VAR["Lookup in context.variables Map"]
    LOOKUP_VAR -->|"found"| ASSIGN_VAR["Resolve to variable value"]
    LOOKUP_VAR -->|"not found"| THROW_VAR_ERR["Throw InputResolutionError:<br/>'Variable {name} does not exist.<br/>Available: ...'"]

    PARSE_SOURCE -->|"matches {job}.{step}.outputs.{name}"| VALIDATE_JOB["Validate job exists<br/>in context.jobs"]
    VALIDATE_JOB -->|"invalid"| THROW_JOB_ERR["Throw InputResolutionError:<br/>'Job {jobSlug} does not exist.'"]
    VALIDATE_JOB -->|"valid"| VALIDATE_STEP["Validate step exists<br/>in target job"]
    VALIDATE_STEP -->|"invalid"| THROW_STEP_ERR["Throw InputResolutionError:<br/>'Step {stepSlug} does not exist.'"]
    VALIDATE_STEP -->|"valid"| CHECK_EXECUTED["Check stepOutputs Map<br/>for {jobSlug}.{stepSlug} key"]
    CHECK_EXECUTED -->|"not executed"| THROW_ORDER_ERR["Throw InputResolutionError:<br/>'Step has not been executed yet.<br/>Must run first.'"]
    CHECK_EXECUTED -->|"executed"| CHECK_OUTPUT["Check output name exists"]
    CHECK_OUTPUT -->|"not found"| THROW_OUTPUT_ERR["Throw InputResolutionError:<br/>'Output {name} does not exist.<br/>Available: ...'"]
    CHECK_OUTPUT -->|"found"| ASSIGN_OUTPUT["Resolve to step output value"]

    PARSE_SOURCE -->|"unrecognized format"| THROW_FORMAT_ERR["Throw InputResolutionError:<br/>'Unrecognized source format.<br/>Expected: vars.{name} or {job}.{step}.outputs.{name}'"]

    ASSIGN_VAR --> COLLECT_RESULT["Collect ResolvedStepInput<br/>{ name, source, value }"]
    ASSIGN_OUTPUT --> COLLECT_RESULT
    THROW_VAR_ERR --> ERROR_PATH
    THROW_JOB_ERR --> ERROR_PATH
    THROW_STEP_ERR --> ERROR_PATH
    THROW_ORDER_ERR --> ERROR_PATH
    THROW_OUTPUT_ERR --> ERROR_PATH
    THROW_FORMAT_ERR --> ERROR_PATH

    subgraph ERROR_PATH ["Error Handling"]
        ERR_MSG["InputResolutionError caught in useBFlowRunSubmit"]
        ERR_MSG --> WRITE_FAILED_STEP["Write failed BFlowStepRun<br/>with error message"]
        WRITE_FAILED_STEP --> MARK_FAILURE["Mark job as failed<br/>Break step loop<br/>Pipeline continues with anyFailed=true"]
    end

    COLLECT_RESULT --> MORE_INPUTS{"More inputs?"}
    MORE_INPUTS -->|"Yes"| LOOP_INPUTS
    MORE_INPUTS -->|"No"| RETURN_ALL["Return ResolvedStepInput[]"]
```

---

## Prompt Building Flow (BFlowRunPromptBuilder)

```mermaid
flowchart TD
    BUILD["buildStepSystemPrompt(step, job, pipeline,<br/>resolvedVariables, resolvedInputs)"] --> INTRO["Append: 'You are executing step {name}<br/>in job {name} of a pipeline.'"]

    INTRO --> STEP_PROMPTS{"step.prompts exists?"}
    STEP_PROMPTS -->|"Yes"| APPEND_INSTRUCTIONS["Append: 'Instructions: {prompts}'<br/>(array joined by newlines)"]
    STEP_PROMPTS -->|"No"| SKIP_STEP_PROMPTS

    APPEND_INSTRUCTIONS --> JOB_PROMPT
    SKIP_STEP_PROMPTS --> JOB_PROMPT

    JOB_PROMPT{"job.prompt exists?"}
    JOB_PROMPT -->|"Yes"| APPEND_JOB_CTX["Append: 'Job Context: {prompt}'"]
    JOB_PROMPT -->|"No"| SKIP_JOB_CTX

    APPEND_JOB_CTX --> PIPELINE_PROMPT
    SKIP_JOB_CTX --> PIPELINE_PROMPT

    PIPELINE_PROMPT{"pipeline.prompt exists?"}
    PIPELINE_PROMPT -->|"Yes"| APPEND_PIPE_CTX["Append: 'Pipeline Context: {prompt}'"]
    PIPELINE_PROMPT -->|"No"| SKIP_PIPE_CTX

    APPEND_PIPE_CTX --> RESOLVED_INPUTS
    SKIP_PIPE_CTX --> RESOLVED_INPUTS

    RESOLVED_INPUTS{"resolvedInputs present<br/>and non-empty?"}
    RESOLVED_INPUTS -->|"Yes"| APPEND_INPUTS["Append: 'Resolved Inputs:'<br/>+ name=value pairs"]
    RESOLVED_INPUTS -->|"No"| SKIP_INPUTS

    APPEND_INPUTS --> VARIABLES
    SKIP_INPUTS --> VARIABLES

    VARIABLES{"resolvedVariables > 0?"}
    VARIABLES -->|"Yes"| APPEND_VARS["Append: 'Available variables:'<br/>+ name=value pairs"]
    VARIABLES -->|"No"| SKIP_VARS

    APPEND_VARS --> OUTPUT_FORMAT
    SKIP_VARS --> OUTPUT_FORMAT

    OUTPUT_FORMAT{"step.output defined<br/>and non-empty?"}
    OUTPUT_FORMAT -->|"Yes"| APPEND_JSON_INST["Append JSON output instructions:<br/>'Return valid JSON object with<br/>fields: {name}: {type}'<br/>+ strict formatting rules"]
    OUTPUT_FORMAT -->|"No"| SKIP_OUTPUT

    APPEND_JSON_INST --> RETURN
    SKIP_OUTPUT --> RETURN

    RETURN["Return joined string = systemPrompt<br/><br/>Then buildUserPrompt() appends:<br/>'Execute step {name} with inputs:{list}'<br/>or simple: 'Execute step {name}'"]
```

---

## Error Handling & Failure Propagation

```mermaid
flowchart TD
    SUB_START["Pipeline execution running..."] --> MONITOR{"Any error occurs?"}

    MONITOR -->|"Input resolution error"| STEP_FAIL["InputResolutionError caught<br/>in step loop"]
    MONITOR -->|"AI chat error (step)"| STEP_FAIL2["executeStepChatAction returns<br/>{ success: false, error: message }"]
    MONITOR -->|"Job-level exception"| JOB_FAIL["Job catch block:<br/>unexpected error"]
    MONITOR -->|"Pipeline-level exception"| PIPE_FAIL["Outer try/catch:<br/>critical error"]

    STEP_FAIL --> WRITE_STEP_FAIL["Write BFlowStepRun with<br/>status: 'failed'<br/>error: message<br/>resolvedInputs: {}"]
    STEP_FAIL2 --> WRITE_STEP_FAIL

    WRITE_STEP_FAIL --> MARK_JOB_STEP_FAIL["Mark BFlowJobRun:<br/>status: 'failed'<br/>error: message<br/>completedAt: now"]

    MARK_JOB_STEP_FAIL --> BREAK_STEP_LOOP["break — stop executing<br/>further steps in this job"]
    BREAK_STEP_LOOP --> JOB_ERR

    JOB_FAIL --> WRITE_JOB_FAIL["Mark BFlowJobRun:<br/>status: 'failed'<br/>error: message"]
    WRITE_JOB_FAIL --> JOB_ERR

    JOB_ERR["anyFailed = true<br/>globalError = message"] --> CONTINUE_JOBS{"More jobs to run?"}
    CONTINUE_JOBS -->|"Yes"| NEXT_JOB["Continue to next job<br/>(jobs don't block each other)"]
    CONTINUE_JOBS -->|"No"| FINALIZE_PIPE["Mark BFlowPipelineRunEntity:<br/>status: 'failed'<br/>error: globalError<br/>completedAt: now"]
    FINALIZE_PIPE --> SHOW_UI_ERROR["Show error banner in UI<br/>onError(globalError)"]

    PIPE_FAIL --> WRITE_PIPE_FAIL["Catch-all: Mark pipeline run<br/>status: 'failed'<br/>error: err.message<br/>completedAt: now"]
    WRITE_PIPE_FAIL --> SHOW_UI_ERROR
```

---

## Report Generation Flow (generateReport)

```mermaid
flowchart TD
    GENERATE["User clicks 'Generate Report'"] -->|"isDisabled if no activeRun"| CHECK_RUN{"activeRun.id exists?"}
    CHECK_RUN -->|"No"| EXIT_GEN["Return (no-op)"]
    CHECK_RUN -->|"Yes"| FETCH_DATA["Fetch run data from IndexedDB:<br/>getRunDataForReport(activeRun.id)"]

    FETCH_DATA --> BUILD_HEADER["Build report header:<br/># Pipeline Run Report: {name}<br/>Status, Run ID, Started, Completed"]

    BUILD_HEADER --> LOOP_JOBS["For each jobRun in jobRuns"]
    LOOP_JOBS --> ADD_JOB_SECTION["## Job: {jobName}<br/>**Status**: {status}"]
    ADD_JOB_SECTION --> FILTER_STEPS["Filter stepRuns by jobRunId"]
    FILTER_STEPS --> LOOP_STEPS["For each stepRun"]
    LOOP_STEPS --> ADD_STEP_SECTION["#### {stepName}<br/>- Status, Duration<br/>- Output (code block)<br/>- Error (code block if present)"]
    LOOP_STEPS --> MORE_STEPS{"More steps?"}
    MORE_STEPS -->|"Yes"| LOOP_STEPS
    MORE_STEPS -->|"No"| MORE_JOBS_REPORT{"More jobs?"}
    MORE_JOBS_REPORT -->|"Yes"| LOOP_JOBS
    MORE_JOBS_REPORT -->|"No"| CREATE_BLOB["Create Blob (text/markdown)<br/>from joined reportLines"]
    CREATE_BLOB --> DOWNLOAD["Create object URL<br/>Create hidden <a> element<br/>a.download = 'pipeline-run-{name}-{id}.md'<br/>a.click()<br/>Revoke object URL"]
```

---

## Complete End-to-End Sequence

```mermaid
flowchart TD
    NAV["User navigates to pipeline run page:<br/>flow/[flowId]/pipeline/[pipeline]/run"] --> MOUNT_COMP["BFlowRunComponent mounts<br/>with params.pipelineId"]

    MOUNT_COMP --> HOOK["useBFlowRun(pipelineId) initializes"]

    subgraph DATA_LOADING ["Data Loading Phase"]
        HOOK --> DATA_LOAD["useBFlowRunDataLoad()"]
        DATA_LOAD -->|"reads IndexedDB"| DB_READS["Load pipeline, template,<br/>variable group, flow variables"]
        DB_READS --> DERIVE_DERIVED["Derive resolvedVariables (3-layer merge)<br/>Derive jobs from template"]
        DERIVE_DERIVED --> COMP_RENDER["Component renders UI<br/>with loaded data"]
    end

    COMP_RENDER --> POLL_START["useBFlowRunPolling() starts<br/>Initial load + setInterval(2000ms)"]
    POLL_START --> WAITING["UI shows: 'Click Run Pipeline<br/>to start execution'"]
    WAITING -->|"User clicks Run"| EXEC_PHASE

    subgraph EXEC_PHASE ["Execution Phase"]
        EXEC["startPipelineRun()"] --> STEP1["1. Create BFlowPipelineRunEntity<br/>status: 'running'"]
        STEP1 --> STEP2["2. Resolve AI config"]
        STEP2 --> STEP3["3. Build variable map + empty step outputs"]
        STEP3 --> STEP4["4. Loop jobs → create BFlowJobRun"]
        STEP4 --> STEP5["5. Loop steps → resolve inputs"]
        STEP5 --> STEP6["6. Build prompts → executeStepChatAction"]
        STEP6 --> STEP7["7. Write BFlowStepRun + register outputs"]
        STEP7 --> STEP8["8. Immediate UI refresh (bypasses poll)"]
        STEP8 -->|"repeat for each step"| STEP5
        STEP8 -->|"all steps done"| STEP9["9. Mark job succeeded"]
        STEP9 -->|"repeat for each job"| STEP4
        STEP9 -->|"all jobs done"| STEP10["10. Mark pipeline run succeeded/failed"]
        STEP10 --> STEP11["11. Final state refresh"]
    end

    EXEC_PHASE -->|"polling shows live updates"| UI_UPDATES["UI updates in real-time<br/>via polling + immediate refresh"]

    UI_UPDATES -->|"Run complete"| COMPLETE["Pipeline run status: succeeded/failed<br/>Error banner if failed<br/>'Generate Report' activated"]
    COMPLETE -->|"User clicks Generate Report"| REPORT_PHASE["generateReport() creates markdown<br/>→ triggers file download"]
```

---

## File Reference Map

| File                                                                                             | Role                                                                                            |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [`BFlowRun.Component.tsx`](../../../src/modules/bunny-flow/src/run/BFlowRun.Component.tsx)       | Presentational React component — stateless, consumes `useBFlowRun()`                            |
| [`BFlowRun.Hooks.ts`](../../../src/modules/bunny-flow/src/run/BFlowRun.Hooks.ts)                 | All hooks: `useBFlowRun`, `useBFlowRunDataLoad`, `useBFlowRunPolling`, `useBFlowRunSubmit`      |
| [`BFlowRun.Types.ts`](../../../src/modules/bunny-flow/src/run/BFlowRun.Types.ts)                 | Zod schemas: `BFlowStepRun`, `BFlowJobRun`, `BFlowPipelineRunEntity`, `BFlowPipelineRunSummary` |
| [`BFlowRun.Prompt.ts`](../../../src/modules/bunny-flow/src/run/BFlowRun.Prompt.ts)               | `BFlowRunPromptBuilder` — constructs system/user prompts with variable substitution             |
| [`BFlowRun.InputResolver.ts`](../../../src/modules/bunny-flow/src/run/BFlowRun.InputResolver.ts) | `BFlowRunInputResolver` — resolves `vars.{name}` and `{job}.{step}.outputs.{name}` sources      |
| [`BFlowRun.Actions.ts`](../../../src/modules/bunny-flow/src/run/BFlowRun.Actions.ts)             | Server actions (`'use server'`) — `executeStepChatAction`, `executePipelineRunAction`           |
| [`BFlowRunDB.ts`](../../../src/modules/bunny-flow/src/run/BFlowRunDB.ts)                         | IndexedDB access layer — convenience queries over PhazeRepository                               |
| [`BFlowAIEngine.ts`](../../../src/modules/bunny-flow/src/run/BFlowAIEngine.ts)                   | Alternative server-side engine — full pipeline orchestration with topological job ordering      |

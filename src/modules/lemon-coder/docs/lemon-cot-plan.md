# Plan: Better Agentic Mode for Planning, Coding, and Multi-Turn

## 1. Current State Analysis
- Plan mode asks questions and proposes plans, but does not generate files.
- Code mode is single-turn and generates files, but loses conversation history.
- The gap: there is no bridge from plan to execution, and no iteration loop.

## 2. Goals
- Create a seamless flow: Understand → Clarify → Plan → Execute → Review → Iterate.
- Maintain persistent context across multiple turns.
- Enable the agent to ask questions, propose options, and execute with approval.
- Improve file path matching and validation to avoid errors.

## 3. Proposed Architecture

### 3.1 Agentic State Machine
Introduce explicit turn states:
- `UNDERSTAND`: analyze the request and context.
- `CLARIFY`: ask questions if the request is ambiguous.
- `PLAN`: propose a structured plan.
- `EXECUTE`: generate or modify files.
- `REVIEW`: summarize changes and ask for confirmation.
- `ITERATE`: accept feedback and refine the work.

Each state uses a tailored system prompt and expected JSON output.

### 3.2 Unified Memory Model
Maintain session memory with:
- `userGoals`: high-level objectives.
- `approvedPlan`: plan the user agreed to.
- `fileTree`: current project file listing.
- `stash`: relevant file contents.
- `turnHistory`: recent conversation turns.
- `pendingQuestions`: unresolved clarifying questions.
- `pendingChanges`: files queued for modification.

### 3.3 Prompt Router
Create `LCPromptMode.Agent.ts` that:
- Detects the current state from context.
- Builds a state-specific prompt.
- Routes to Plan, Code, or Review sub-prompts as needed.

### 3.4 Multi-Turn Protocol
Use a structured message format:
- `role`: user | assistant | system.
- `state`: current agent state.
- `intent`: understand | clarify | plan | execute | review | iterate.
- `content`: message text.
- `artifacts`: files, questions, and decisions.

This lets the backend resume any session and keep context intact.

## 4. Implementation Steps

### Step 1: Define Agent State and Transitions
Add types such as:
```typescript
type AgentState = 'UNDERSTAND' | 'CLARIFY' | 'PLAN' | 'EXECUTE' | 'REVIEW' | 'ITERATE';
type AgentIntent = 'ask_question' | 'propose_plan' | 'generate_code' | 'confirm' | 'refine';
```

### Step 2: Build the Agent Prompt Builder
Create `LCPromptMode.Agent.ts` that accepts state, history, file tree, and stash, then injects the right instructions.

### Step 3: Enhance Plan Mode
Improve Plan mode to output:
- Numbered steps with dependencies.
- Risks and assumptions.
- Tags for manual vs automated steps.
- File path validation against the project tree.

### Step 4: Add an Execution Planner
Before coding, generate a change manifest:
- Which files to create, update, or delete.
- Path validation against the file tree.
- Estimated scope and order of operations.

### Step 5: Implement the Iteration Loop
After execution:
- Summarize changes.
- Ask: Accept, Modify, Add Tests, or Revert.
- On Modify: re-enter ITERATE state and apply targeted edits.

### Step 6: Add a Validation Layer
Add JSON schema validation and auto-repair:
- Validate output with Zod or similar.
- Escape control characters before parsing.
- Retry with a repair prompt if parsing fails.

### Step 7: Migrate to Function Calling
Eventually use structured function calls such as:
- `ask_clarification`
- `propose_plan`
- `edit_file`
- `create_file`
- `run_command`
- `run_tests`

This is more reliable than free-form JSON responses.

## 5. Multi-Turn UX Flow
1. User sends a request.
2. Agent analyzes and asks 1-3 clarifying questions if needed.
3. User answers; Agent updates its understanding.
4. Agent proposes a plan; user approves or edits it.
5. Agent executes and returns file changes.
6. User reviews and accepts or requests edits.
7. Loop until the user is satisfied.

## 6. Benefits
- Fewer errors because intent is clarified first.
- Less token waste because plans are approved before coding.
- Better user control at every stage.
- Reusable context across sessions.
- Foundation for more autonomous agent behavior.

## 7. Suggested Next Steps
1. Implement the state machine types and prompt router.
2. Add persistent turn history to the backend.
3. Improve the Plan mode output format.
4. Add execution manifest generation.
5. Build the review and iteration UI.
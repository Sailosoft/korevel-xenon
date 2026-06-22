# Implementation Phases: Bunny Flow

This document outlines the phased approach to implementing the Bunny AI Workflow engine, a GitHub Actions-inspired system for AI workers.

## Phase 1: Core Types & Schema
**Goal:** Define the data contract for workflows and the state management model.
- [ ] **Workflow Schema**: Implement Zod schemas for `Workflow`, `Job`, `Step`, `Variable`, and `Report` based on `PLAN.md`.
- [ ] **TypeScript Interfaces**: Derive strong types from schemas for the engine.
- [ ] **Variable Resolution Logic**: Create the utility to resolve `{{vars.name}}` and `{{job.step.outputs.name}}` placeholders.
- [ ] **State Model**: Define `PipelineValue` and `PipelineStore` for in-memory execution tracking.

## Phase 2: Database & Persistence
**Goal:** Ensure workflows and execution data can be stored and retrieved.
- [ ] **BFlowDatabase Extension**: Implement storage for YAML workflow templates.
- [ ] **Execution History**: Create tables/collections to track run statuses, job logs, and timestamps.
- [ ] **Group Config Storage**: Implement persistence for environment-based variable overrides (`groups`).
- [ ] **BFlowProject Entity**: Bind the database layer to the `BunnyFeature` in `BFlowProject.ts`.

## Phase 3: The Execution Engine
**Goal:** Build the logic to coordinate AI agents and data flow.
- [ ] **DAG Resolver**: Implement a dependency resolver for jobs using the `needs` property.
- [ ] **Pipeline Orchestrator**: 
    - Initialize `PipelineStore`.
    - Apply group/job variable overrides.
    - Queue and dispatch jobs to agents.
- [ ] **Step Executor**:
    - Handle prompt interpolation.
    - Interface with Bunny AI agents for text/flat generation.
    - Parse and store outputs into the `PipelineStore`.
- [ ] **Report Generator**: Collect exported values and generate the final report file based on the specified `type`.

## Phase 4: Integration & UI
**Goal:** Make the workflow engine usable within the application.
- [ ] **Agent Mapping**: Connect `agentPool` and `agentId` to actual AI agent instances.
- [ ] **Trigger API**: Create endpoints/methods to trigger a workflow run manually or via event.
- [ ] **UI Integration**: Build the interface to edit YAML workflows and monitor real-time execution progress.

---
*Last Updated: 2026-06-17*

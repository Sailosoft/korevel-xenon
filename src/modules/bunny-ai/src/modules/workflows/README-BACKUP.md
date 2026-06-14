# Bunny AI Workflows Module

## Overview
This module implements the core workflow execution system for Bunny AI, providing a production-ready workflow specification with database persistence, observability, and reporting capabilities.

## Planned Directory Structure
```
src/modules/bunny-ai/src/modules/workflows/
├── README.md
├── bui.workflow-run.entity.ts
├── bui.workflow-step.entity.ts
├── bui.workflow-output.entity.ts
├── bui.workflow-output-archive.entity.ts
├── bui.workflow-definition-ref.entity.ts
├── bui.workflow-output-alias.entity.ts
├── bui.workflow-extract-request.entity.ts
├── bui.workflow-extract-result.entity.ts
├── workflow.module.ts
├── index.ts
├── services/
│   ├── workflow-execution.service.ts
│   ├── dag-scheduler.service.ts
│   ├── workflow-validator.service.ts
│   ├── pipeline-store-resolver.service.ts
│   ├── workflow-normalizer.service.ts
│   ├── run-ledger.service.ts
│   ├── output-archive.service.ts
│   ├── extraction-api.service.ts
│   └── report-generator.service.ts
├── repositories/
│   ├── workflow.repository.interface.ts
│   └── workflow.repository.ts
└── docs/
    ├── README.md
    └── workflow-api.md
```

## Database Entities
All entities implement the interfaces defined in the Bunny AI Workflow documentation:

1. **BUIRunLedger** - Tracks workflow execution metrics
2. **BUIRunStepLedger** - Tracks individual step execution metrics
3. **BUIWorkflowStoredValue** - Stores workflow outputs with metadata
4. **BUIWorkflowOutputArchiveRecord** - Archives immutable snapshots of workflow runs
5. **BUIWorkflowDefinitionRef** - References workflow definitions by hash
6. **BUIWorkflowOutputAlias** - Maps renamed keys for backward compatibility
7. **BUIWorkflowExtractRequest** - Defines extraction requests for historical data
8. **BUIWorkflowExtractResult** - Contains results from extraction operations

## Core Services

### Workflow Execution Services
- **WorkflowExecutionService** - Main service for executing workflows
- **DAGSchedulerService** - Schedules workflow jobs in topological order
- **WorkflowValidatorService** - Validates workflow configurations
- **PipelineStoreResolverService** - Resolves and stores pipeline outputs
- **WorkflowNormalizerService** - Normalizes workflow configurations

### Observability and Reporting Services
- **RunLedgerService** - Tracks workflow execution metrics
- **OutputArchiveService** - Archives workflow outputs
- **ExtractionAPIService** - Extracts historical workflow data
- **ReportGeneratorService** - Generates workflow execution reports

## Database Integration
The module will integrate with the existing Dexie.js database system used by Bunny AI, adding new tables for workflow entities while maintaining compatibility with existing data structures.

## Features
- Deterministic workflow execution
- Safe retry/fallback/timeout behaviors
- Step-level run records and cost tracking
- Extensible architecture for providers and tool steps
- Backward compatibility for workflow migrations
- Immutable run archives for historical access
- Extraction API for historical records
- Comprehensive reporting capabilities

## Implementation Roadmap
1. Create database entity models
2. Update database schema with workflow tables
3. Implement repository pattern for data access
4. Create core workflow execution services
5. Implement observability and reporting components
6. Add integration tests
7. Document APIs and usage patterns
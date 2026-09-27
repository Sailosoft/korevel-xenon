# Bunny Ideas — Batch 1

More module ideas in the same `BunnyX:` format as [Main.md](Main.md), grouped by theme.
Designed to fit the existing platform: Bunny framework CRUD, Helix AI + BYOK, PhazeDB/Dexie
local-first storage, BunnyFlow pipelines, BunnyThinker chain-of-thought, `bunny-helix`
AI-create, Orama search, TTS/STT in BunnyStudio, and 2-letter module prefixes (`BK`, `BS`, `BC`).

## Health & Wellbeing
- **BunnyTherapy:** CBT/DBT exercise companion, session notes, thought records, mood-linked progress.
- **BunnyJournal:** guided reflective journaling with sentiment trends and weekly AI summaries.
- **BunnyHabit:** habit tracking with streaks, AI accountability check-ins, and relapse insights.
- **BunnyFitness:** workout programs, form coaching, progressive overload, activity logs.
- **BunnyNutrition:** meal planning, macro tracking, recipe generation from pantry contents.
- **BunnySleep:** sleep logging, wind-down routines, circadian insights.
- **BunnyElder:** elder-care coordination — meds, appointments, caregiver notes, family updates.

## Learning & Knowledge
- **BunnyTutor:** adaptive Socratic tutor with mastery tracking across subjects.
- **BunnyLanguage:** conversation-first language learning with pronunciation via TTS/STT.
- **BunnyFlash:** spaced-repetition flashcards (SM-2/FSRS) generated from any source.
- **BunnyExam:** rubric-based quiz/exam generator, proctored-style runs, auto-grading.
- **BunnyLibrary:** personal "second brain" — ingest docs/PDFs, Orama-backed RAG search.
- **BunnyResearch:** literature review, source ranking, citation capture, synthesis.
- **BunnyCertify:** issue and verify credentials earned through BunnyUniversity/BunnyCase.

## Work & Productivity
- **BunnyMeeting:** transcription, decisions, action items, follow-up drafts.
- **BunnyCRM:** contacts, pipeline, AI-drafted follow-ups, deal health scoring.
- **BunnySupport:** ticket triage, macros, deflection bot; pairs with BunnyCase training.
- **BunnySales:** call scripts, objection handling, roleplay certification (BunnyCase variant).
- **BunnyRecruit:** job specs, interview kits, resume screening, structured scorecards.
- **BunnyLegal:** contract clause extraction, risk flags, plain-language summaries (with disclaimers).
- **BunnyFinance:** budgets, expense categorization, scenario planning, advisory chat.
- **BunnyProposal:** proposals, SOWs, estimates, and pricing from a brief.
- **BunnyEmail:** inbox triage, replies, sequences, tone control.
- **BunnyDocs:** branded document/draft generation with templates and versioning.

## Creative
- **BunnyStory:** fiction drafting — characters, arcs, worldbuilding bibles.
- **BunnyScript:** screenplay/dialogue with beat sheets and table reads.
- **BunnyBrand:** brand voice, naming, positioning, logo/mood briefs.
- **BunnySocial:** content calendar, platform-native posts, hashtags, scheduling.
- **BunnyVideo:** scripts, shot lists, storyboards; optional voiceover via TTS.
- **BunnyPodcast:** episode outlines, show notes, guest research, chapter markers.
- **BunnyArt:** image-prompt studio with style locks and prompt versioning.
- **BunnyGame:** game design docs, levels, dialogue trees, playtest notes.

## Technical
- **BunnyAPI:** API design, OpenAPI specs, docs, mock servers.
- **BunnyDB:** schema/model design, migrations, ERD generation.
- **BunnyTest:** test-case generation and coverage gap analysis.
- **BunnyBug:** bug triage, reproduction steps, root-cause hypotheses.
- **BunnyReview:** code review with rule packs and diff annotations (pairs with Lemon-Coder).
- **BunnyData:** natural-language data analysis, charts, CSV/Sheet workflows.
- **BunnyDevOps:** IaC/config generation, runbooks, incident postmortems.

## Personal Life
- **BunnyTravel:** itinerary planning, budgets, packing, local tips.
- **BunnyEvent:** weddings/parties — guest lists, vendors, timelines.
- **BunnyHome:** renovation/maintenance planner with cost and task tracking.
- **BunnyGift:** gift suggestions from occasion, budget, and recipient profile.
- **BunnyAssistant:** cross-bunny concierge that routes requests to the right module.

## Platform / Cross-cutting (leverage existing infra)
- **BunnyMarketplace:** share/install packages of flows, thinkers, agents, courses, templates.
- **BunnyOrchestrator:** multi-agent orchestration that runs BunnyFlow pipelines with routing.
- **BunnyAnalytics:** outcome/usage analytics across all bunnies (completion, sentiment, cost).
- **BunnySearch:** unified Orama-powered search over every module's local data.
- **BunnyVault:** encrypted BYOK key/secret store and per-module model policies.
- **BunnyVoice:** shared TTS/STT layer so every module gets voice without rework.
- **BunnyAutomation:** triggers and schedules that fire flows (cron, webhook, event).
- **BunnyForms:** form builder whose submissions feed BunnyFlow/Thinker inputs.
- **BunnyDashboard:** personal cockpit aggregating cards from every active bunny.
- **BunnySync:** optional Dexie → Supabase sync for cross-device continuity.
- **BunnyForge:** visual agent/flow builder (extends `admin-panel/agentic`).

## Patterns Worth Noting
- **Ties into existing modules instead of rebuilding:** Medical → University (certifications, consent docs), Case → Support/Sales/Recruit (training), Flow → Automation/Orchestrator/Forms, Thinker → any reasoning-heavy module.
- **Suggested prefixes:** 2-letter per module (`BI` BunnyFitness, `BL` BunnyLibrary, `BM` BunnyMedical, `BU` BunnyUniversity, …) to avoid collisions with `BK`/`BS`/`BC`.
- **Shared primitives:** repository pattern + PhazeDB tables, `bunny-helix` header action for "AI Create", Helix provider selector for BYOK, and Bunny feature/header/table/form components for CRUD consistency.

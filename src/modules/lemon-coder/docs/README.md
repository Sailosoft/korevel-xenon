# 🍋 Lemon Coder

**AI-powered code assistant** with a VS Code-inspired dark interface. Leverages the **File System Access API** for native folder management, **DexieDB** for local persistence, and **HelixAI** for intelligent code generation.

---

## Brand

- **Primary:** Grey (`#1e1e1e`, `#252526`, `#333333`) — Dark panel backgrounds
- **Accent:** Yellow (`#e5c07b`) — Eye-friendly highlight color
- **UI Style:** VS Code Dark Gray theme

## File Branding Convention

| Element        | Pattern              | Example              |
|----------------|----------------------|----------------------|
| File Name      | `LC{FileName}.ts`    | `LCFileTree.tsx`     |
| Class          | `LC{ClassName}`      | `LCDatabase`         |
| Component      | `LC{ComponentName}`  | `LCMainContent`      |
| Interface      | `LC{Interface}`      | `LCProject`          |
| Hook           | `useLC{Verb}`        | `useLCProject`       |
| Function       | `{verb}LC{Noun}`     | `createLCSession`    |

---

## Features

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Brand] ────────── Menu ──────────────────────── [spacer]  │
├──┬──────────┬──────────────────────────────┬────────────────┤
│  │  Icon    │                              │   Stash        │
│  │  Bar     │    Main Content              │   Sessions     │
│  │          │    (Chat / File View)        │   Settings     │
│  │  File    │                              │                │
│  │  Tree    │                              │                │
│  │          │                              │                │
└──┴──────────┴──────────────────────────────┴────────────────┘
```

### Views

- **Welcome Screen** — Landing page with project selection
- **Workspace** — Full IDE-like layout with three panes
  - **Left:** Icon bar (Files, Search, Extensions) + File Tree
  - **Center:** Chat view or Monaco Editor file view (toggle)
  - **Right:** Context Stash + Chat Sessions + Settings

### Key Features

1. **Project Management** — Open local folders using the File System Access API
2. **File Tree** — Navigate and browse project structure with expand/collapse
3. **Context Stash** — Add files/folders to include as AI context
4. **AI Chat** — Conversational code assistant with file-aware prompts
5. **File View** — Monaco Editor with syntax highlighting
6. **File Actions** — Apply AI-suggested file changes (create/overwrite)
7. **Session Management** — Multiple chat sessions per project

---

## Technology Stack

| Tool             | Purpose                        |
|------------------|--------------------------------|
| **DexieDB**      | Local database (IndexedDB)     |
| **Monaco Editor**| Code editor component          |
| **Tailwind CSS** | Utility-first styling          |
| **HeroUI**       | UI component library           |
| **HelixAI**      | AI provider integration        |
| **UUID**         | String UUID generation         |

---

## File Structure

```
src/modules/lemon-coder/
├── docs/
│   ├── Instruction-1.md         # Original specification
│   └── README.md                # This file
└── src/
    ├── LCInterface.ts           # All TypeScript interfaces & types
    ├── LCDatabase.ts            # DexieDB database class
    ├── LCApp.tsx                # Main orchestrator component
    ├── LCMenu.tsx               # Top menu bar
    ├── LCSidebar.tsx            # Left sidebar (icon bar + file tree)
    ├── LCFileTree.tsx           # Recursive file tree view
    ├── LCMainContent.tsx        # Main content area (chat/file toggle)
    ├── LCChatView.tsx           # AI chat interface
    ├── LCFileView.tsx           # Monaco Editor file viewer
    ├── LCRightSidebar.tsx       # Right sidebar (stash, sessions, settings)
    ├── useLCProject.ts          # Project management hook
    ├── useLCFileSystem.ts       # File system operations hook
    ├── useLCChat.ts             # Chat & AI operations hook
    └── index.ts                 # Module barrel exports
```

---

## Flow

1. **App Entry** → Check for recent projects
2. **No Recent Project** → Show "Open Project" prompt
3. **Open Project** → Use File System Access API to pick a folder
4. **Store Project** → Save project name to DexieDB as current project
5. **Open Workspace** → Navigate to `lemon-coder/{projectId}` workspace
6. **Workspace Layout** → VS Code-like UI with menu, file tree, content, and stash panels
7. **File Interaction** → Browse files, add to stash, view in Monaco Editor
8. **AI Chat** → Ask questions, AI checks stashed files for context
9. **AI Response** → Receives JSON with message + file actions
10. **Apply Changes** → Create or overwrite files from AI suggestions
11. **Session Checkpoints** → New chat session created on each checkpoint

---

## AI Integration

The AI expects responses in the following JSON format:

```json
{
  "SessionID": "uuid-string",
  "AIMessage": "AI response text",
  "FileContents": [
    {
      "FileName": "example.ts",
      "ExistingFile": false,
      "FileDirectory": "src/components",
      "Description": "New component file",
      "Content": "// file content here"
    }
  ]
}
```

---

## Getting Started

1. Navigate to `/modules/lemon-coder` in the app
2. Click **Open Project** and select a folder
3. Browse files in the file tree
4. Click the **+** button on files to add them to the context stash
5. Open the **Chat** tab and ask Lemon Coder for help with your code
6. Apply suggested file changes with the **Apply** button on AI responses

# Agent
You are typescript developer.
- follow SOLID PRINCIPLE
- follow DRY Principle
- Seperate the logic, component, schema.
- used dexieDB for database.
- your approach is modularized.
- create a shared components to share among modules and to make config first.
- make the component shareable within the bunny-dev
- all interface and type should start with BD
- files should BDExample.ts or BDExample.tsx

## Intent
The new module Bunny Developer.

it is application use for helps decision making for Developer.
To build idea and brainstorm business software application.

It has overview of whole application

### Description
- create new module bunny-dev
- This module is a module to use bunny for developer.
- follow the bunny-dev and follow the dexie db local first
- server action for ai request generated and use helix

### SchemaBuilder
- The schema builder - is feature that it can create a schema. This schema building is not actual schema but visual and data representation of what would be the database and table.
it could have group so i could build a different version  and variant of schema. it has export properties that it could export as prisma or model builder file.

- Integrate AI Generation: Yes

### AppBuilder
- The App Builder - is inspired by filament. That i could generate a application CRUD, one to one, one to many, many to many, or many to one. It has crud so i could define it.

- The App Rendering - it has a rendering that would render App base on the configuration define on the app builder capable of CRUD and relation selection and attachment relation similar to filament.

- Integrate AI Generation: Yes

### API Design
- this is not actual API reference but create a documentation and mocking of the api. It has two layout - mock and view(document layout)
- in mock it was similar looking to post man
- document view: like a document view that can be export to html.
- Integrate AI Generation: Yes
### Architecture Design
- This help me to build the basic architecture of that project.
- More architecture design and help me variants.
- This Architecture has export to markdown
- Integrate AI Generation: Yes
### File Management
- file management. virtualize file management that save the content to dexiedb.
- it can open it on editor code mirror or just plain wysiwygt editor.
- it can upload a file and save on it there.
- it can download the file too.

### Diagram Builder
- it can create a diagram with visual editor for diagram editor
- creating and remove node.
- adding label and remove label.
- adjusting position
- any docs
- Integrate AI Generation: Yes.

### Project Management
- Make it look like a JIRA kanban board and a display.
- use WYSISWYG editor for comment and description.

- Project Management can be base for human user
- or hands off to agent.
- it has also a concurrent agent.
- it has a calling for agent - that it can manage
  - diagram.
  - app builder
  - schema builder management
  - outline
  - and the rest
  - content creating
  - virtual file management
  - it can work on that management
- it has a multi-turn decision making for the agent to manage those.
  - wether to create new, append them, or change them.

### Outline
- GEnerating outline, helpful, guides, and docs
- use react markdown reader and wysiwyg editor
- can export it.



## Agent Manager
- Generate AGENT that can be hands off too on project management.
- Integrate AI Generation: Yes.
## Plan
- create new module in bunny-dev folder
- all modules should write in bunny-dev/modules
- make it first level. ts and tsx on same level.
- follow BunnyDev.ts on blueprint for BunnyDev
- the title is Bunny Developer
- the branding is similar to bluish theme or mui base theme color
- create each module in the directory.
- in the layout. two layout. main Layout (which list all project)
  - second layout - project layout that list on its children
    - app builder(App)
    - schema builder(Schema)
    - api reference builder(API)
    - outline builder(Outline)
    - diagram builder(Diagram)
    - file management(File)
    - architecture designer(Architecture Design)
    - Project Management(Project Management)
    - the rest.
- all the builders conntected to that project.
- CRUD Modules(This module should have CRUD)
  - AppBuilder
    - It can generate the application
    - AppRendering
      - Generated Application can be rendered and stored in database


## Specs

main directory:
src\modules\bunny-dev

modules directory:
src\modules\bunny-dev\modules

Modules:
docs\Ideas\BunnyDev\BunnyDev.ts

AISettings
src\modules\helix
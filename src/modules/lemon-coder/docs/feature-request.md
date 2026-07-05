# Feature Requests 
- This feature request is for lemon-coder
- ask if ambigous
- src\modules\lemon-coder

# Request 1 - file diff state
- In LCChat in ai response add state status in file diff is apply, applying and applied
- for both accept all and accept one.
- if this persistent should consider if the parent delete this state also remove

# Request 2 - Create Project
- In open project - in landing screen. instead of opening folder
- add modal create project. add project name then select folder location
- Update LCStudio to change project name instead of root folder

# Request 3 - Project List (new route)
- Add link to landing page to display project list
- This page will display the project list and meta data
- This page has view, edit and delete button
- if delete remove related entity including the project
- if view it will direct to next project view

# Request 4 - Project details (new route)
- It has tab that display list of projects
- first tab - display project meta data
- second tab - display list of session tab (view to list session chat) - clear session
- subsequent tab - any entities that connected to project id
- other tab -project configuration(for future request)

# request 5 - icon support per filetype in treeview
- add distinct icon for each 
  - md
  - ts
  - tsx
  - json
  - html
  - css
  - js

# Request 6 - Add Display Tooltip toggle
- In tree view
- beside refresh
- add icon button - toggle to display tooltip on tree view
- default enable
- if false it should not float around the tooltip use native tooltip

# Request 7 - Mode (Agent, Plan, Ask)
- Create seperate logic and file
- LCPromptMode.Agent.ts (default)
- LCPromptMode.Plan.ts (which is help you build plan and ask you question and build context)
- LCPromptMode.Ask.ts

# Request 8 - Add New Session Button
- instead of Add Code Button Replace it with New Session Button

# Request 9 - Session Name
- at first session include session title in prompt output 
- session name will be the title 
- display session name - on chat view
- fallback the session date and time

# Request 10 - Session Clear
- have option to delete session and respective attach to that 
- or clear sessions to delete all session related entity

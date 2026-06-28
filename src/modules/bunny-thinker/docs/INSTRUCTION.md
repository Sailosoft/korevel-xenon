# Bunny Thinker
- Bunny thinker is application to utilize chain of thoughts it is preplanned thoughts

# Meta Data
- Branding Name: BunnyAI Thinker

# Router
- src\app\modules\bunny-thinker

# Agents
- ai\agents\hero-ui\agent-hero-ui.md
- ai\agents\document-use-case-guide-agent.md\guide-agent.md

# References
- src\modules\bunny-ai
- src\modules\bunny-flow

# Base Framework
- src\modules\helix - use helix for ai interaction
- src\modules\bunny - use bunny framework

# Domain
## Thinker
- it used as a persona for the thought
### Properties
- name: name of thinker
- description: description of thinker
- rules?: guard rails if thinker being used
- role?: role of the thinker
- specialization?: specialization base on role

### GenerativeAI
- ThinkerSwarm: generate multiple thinker at once base on request. it can generate multiple thinker per role base on specified request.
- GenerateThinker: generate thinker base on request input

## ThoughtPattern
- This is used as act as variable to the thought
- This can generate what input type be used on the variable

## ThoughtAssociation
- this act as variable swapping to thought pattern so it can be used in many cases.
- Given: select specified thought pattern
- Then: Fill value base on thought pattern

### Action
- Generate Association Base On Thought Pattern
  - when pattern is selected
  - it create association matching to pattern

### GenerativeAI
- GenerateThought: 
  - Given: input request of user
    Then: it create all pattern and prefill all association base on request

## Ideas
- Ideas where you want a reusable prompt that can be attach to high level thought or attach to thought association

### GenerativeAI
- GenerateIdeaForThought: it generate a reusable ideas to thought

## Craft
- Craft can be attach to Train of thought this use case that the output follows a strict formating, no commentary, no wrapping and no question

### Format
- markdown - default format
- html - format strictly write in html in view mode it will view as plain html
- tailwind - format and ai attempt to write the classname use tailwind
- csv - format as csv but in craft engine it will create a table mode
- json - format the json and craft engine it will be readable json
= imageList - this format will ai will atempt to find image link on pexel,  unsplash and other supported and free 
  - links: 
    - pexels: https://pexels.com
    - unsplash: https://unsplash.com/
    - pixabay: https://pixabay.com/
    - pinterest: pinterest.com
    - stocksnap: https://stocksnap.io/
  - capable to display those images in array with link
- mermaid - it generate mermaid format
- plain - just plain text

### Engine
- It calculate and generate output before it saves to memory

## Thoughts
- here you can build your main prompt or idea as your main thought
- it uses open ai chat that saves system, assistant and user whole conversation
- thoughts are not single request but a chat conversation but preplanned
- In thoughts you could set thought pattern first so you could have the dynamic variable

### Train Of Thoughts
- In your main thought would be part of system conversation
- Train of thought would be a part of user | assistant conversation
- it was preplanned conversation
- train of thoughts should have toggle where the ouput of that thought will be included in memory or in exportable format

## Memory
- it has crud and when active thinking it create a memory base on think / thought
- you can review the publish output via memory
- where you can export memory to html format
- it used to the output of think to be persist

## Think
- a workspace module that it connects all thoughts, thoughts association and memory
- where it computed the thought pattern via thought association
- run the thoughts via openAI conversation
- store the process in think conversation.
- if rethink it back from the start of conversation.
- you can rethink at specified train of thought.
- in case your thinking stop you can consolidate again via think conversation
- when done it generate memory
- where you can extract via think or in memory to export to html


# Code Rules
- Follow BunnyFlow and BunnyAI code architecture
- Prompt text should be in seperate folder {Filename}.Prompt.ts
- AI Prompt should not be included on server action files
- dont use dexie useLiveQuery hooks
- use dexie for persistence db
- add repository pattern for db
- often use "use client" only wrapper for server action for when doing doChat on AI
- all exportable class and interface and file name should have "BK" prefix e.g. BKStudio or BKStudioOptions
- all exportable functions use BK after the verb. useBKCase or doBKJob always put bk on branding
- i want clear seperation of file or logic of Component, Logic, Constant(prompts or text), ServerAction(specially for AI Action), Engine, Modules
- generate me readme docs for this new application
- generate me a link in -\src\app

# Functionality
- use BunnyAI document shell
- use Bunny Module or BunnyFeature.Create to form module
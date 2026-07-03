# Title
Lemon Coder

# Brand
Grey and Yellow(Eye friendly color)

Similar to VS Code UI in Dark Gray mode

# FileBranding
- FileName: LC{FileName}.ts
- ClassName: LC{ClassName}
- ComponentName: LC{ComponentName}
- Interface: LC{Interface}
- hooks: useLC{Verb}
- function: {verb}LC{Noun}

# Tools
dexieDB
Monaco Editor - for content editor
Tailwind
HeroUI
HelixAI

# Developer
- Use HEROUI as much as possible
ai\agents\hero-ui\agent-hero-ui.md

# Features
File helper coder with three pane

## UI LemonCoder
[[Brand]---------------Menu------------]
[-SpecialButtons-][--FileTreeView--][-----Chat/FileView------][----Stash-----]


## Chat View
[----Chat/FileView-----]
[--------------------------[ChatButton][FileViewButton]]
[---------------------Content--------------------------------]
[----------------Chat Input----------------------]

# Database
- dexieDB (dont use PhazeDB)
- id type: string UUID using uuid package

# Flow
- When user enter the app
- Then check if there is recent project
- But if there is no recent project
- Then ask user to click the open project
- When user click the open project
- Then user ask to open folders using browser filemanagement api
- When user select certain folder
- Then store the folder name in dexieTable set as current project
- When user open the project
- Then open the lemon-studio/{projectid}
- and display similar to vscode-ui
- When Open the lemon studio
- Then It display menu on top(OpenProject, OpenRecentProject, NewSession)
- And Left - Icon Button(FileButton, SearchButton, Extensions)
- And Left - File Tree View(Each Item has AddButton - Purpose to add folder or files to LemonStudio Stash) (Supports scrolling left and right when file and folder name is too long)
- And MainContent (ContentAction(VeryTop) Top Middle Content(Occupy Top and Middle) and ChatInput (BottomContent). all are adjustable size and has expand view)
- And Right Sidebar contains  ChatSessions, ContextStash(The added from FileTreeView)(ContextStashItems that can be removed button), and other settings accordion
- When In Main Content
- Then there is button on ContentAction (File/Chat) 
- When user select file 
- Then the Content will display the selected file
- When user select chat
- Then It display the chat list
- Given ContentAction
- Then Add Code Button
- When Code is trigger
- Then AI will check the stash files and files in folder stashes
- When AI Check the code
- Then it compiles the files in one prompt including their filedirectory and file name
- Given user instruction on the chat input
- Then AI Compiles all files and chat instruction
- Given using AIHelix uses the chat array
- Then Lemon cache the conversation per session
- When AI returns value
- Then lemon expects array of json object
- expects
  - SessionID:
  - AIMessage:
  - FileContents: array of object file content
    - FileContent
      - FileName:
      - ExistingFile: bool
      - FileDirectory: string
      - Description: string
      - Content: string - the copy paste code(not code snippet) or actual content
- When user receives ai response
- Then It has capable to apply button to overwrite files based on the file name and directory
- But if not existing 
- Then create new file
- Given the restash button 
- then it reupdate the content of the stashed context
- Then it create a checkpoint session
- When checkpoint session
- Then it create new chat session

# References
## Rules
### Rule - Document Shell
In generating document shell refer to
src\modules\bunny-studio\src\modules\studio
generate your own header, sidebarshell

### Rule - Modules
In Create, Update, Delete and Edit Use Bunny
@src\modules\bunny\src\feature\BunnyFeature.Docs.md


### Rules - Database
use DexieJS database do not use live query.

###  Rules - Modular Architecture
Write in modular way in this directory
src\modules\bunny-case\src\modules
src\modules\bunny-case\src\modules\{module}
src\modules\bunny-case\src\modules\{module}\index.ts

### Rules - Naming Convension
Main Directory: src\modules\bunny-case
File Name Convention: BC{FileName}.ts, BC{FileName}.tsx
Class/Export Interface/ReactComponent convention: class BCCase {}, export interface BCCaseProps {}, BC{Title}{Modifier}
object naming convention: const bcCase, const bc{Title}
hooks naming convention: useBCCase, useBC{HookName}

- Instruction
it was a hard rule to add BC as part of naming convention. it does not conflict to other files.

### Rules: AI Configuration
Add AI Configuration settings and use

src\modules\helix\src\docs\HelixAIProviderSelector.md
src\modules\helix\src\HelixConfig.ts
src\modules\helix\index.ts

### Feature - TextToSpeech and SpeechToText
implement text to speech and speech to text in the interaction module.

refer to 
src\modules\bunny-studio\src\modules\chat\BSChat.Input.STT.Hooks.ts
src\modules\bunny-studio\src\modules\chat\BSChat.Input.STTButton.tsx
src\modules\bunny-studio\src\modules\chat\BSChat.Voice.tsx

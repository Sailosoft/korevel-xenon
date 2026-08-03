# BunnyAIStudio

# Description
Bunny AI Studio one of feature multi-modal chat similar to Gemini and ChatGPT and other AI tools I could build.

# Streaming over output
The AI Chat uses vercel ai. use the BYOK for vercel ai instead of server action. 
It uses streaming.

# Database
- use local first dexiejs database to define schema. 

# Main Features
- AI Chat - similar to gemini and chatgpt. It can accept import text, code-text-based files and images.
- SpeechToText(soon) - It will not yet develop
- Agent Pools - it will create an group of agents and each group can create agents
- AI Settings - configuration of default AI Settings

# Representation
Header: Sticky Header
(BunnyIcon)(Bunny AI Studio)(SpaceInBetween)(Logout)

Sidebar: 
(Bunny Main Title Sidebar)
(Chat: Default)
(SidebarTitle: Agent)
(Agents)
(AgentPools)
(SidebarTitle: Settings)
(AI Settings)
(Configurations)

# Architecture
## CodeRules
Main Directory: src\modules\bunny-studio
File Name Convention: BS{FileName}.ts, BS{FileName}.tsx
Class/Export Interface/ReactComponent convention: class BSChat {}, export interface BSChatProps {}, BS{Title}{Modifier}
object naming convention: const bsChat, const bs{Title}
hooks naming convention: useBSChat, useBS{HookName}
### Instruction
- it was a hard rule to add BS as part of naming convention. it does not conflict to other files.

### Files
- Documentation
src\modules\bunny-studio\docs

here you put documentation and readme

- Source
src\modules\bunny-studio\src 

put all source code to Bunny Studio

- Modules
src\modules\bunny-studio\src\modules

it support a modular approach

- Module
src\modules\bunny-studio\src\modules\{module}

contain of source code of each module

e.g.: src\modules\bunny-studio\src\modules\chat

- Module Index
src\modules\bunny-studio\src\modules\{module}\index.ts

where you put exportable function

- Module docs
src\modules\bunny-studio\src\modules\{module}\docs

modules markdown documentation


# Feature: AI Chat
<AIChat>
When user load page chat
Then appear the textarea and send button on center of screen
And After It Become a conversation bubble chat
Given A conversation view
Then Three Parts
Given Upper part a title of chat, current ai model and provider
Given Middle part a conversation bubble
Given Lower part a input chat
When user send in input chat
And Loading Chat Appear
</AIChat>
<AIInitialChat>
When user load page chat
Then had multiple options
Given first options
Then standard input chat
Given second options
Then instruction field and text field
When user put instruction
Then target the text field
And custom instruction
Given third option
Use CodeMirror To Create Input Field
</AIInitialChat>

<AIChatSettings>
When user load page chat
Then user can capable to adjust AI Provider and model
Given There is Global AI Settings
Then user capable to override AI provider and model
when user in conversation mode
Then user can capable to adjust AI Provider and model
When it is not settup
Then use Global AI Settings
</AIChatSettings>

<AIAgent>
When user load page chat or in conversation input
User can select AI Agent. 
Then AI Agent instruction will be part of system instruction
When agent has model and provider
Then it use the model and provider
</AIAgent>

<RenderingConversation>
<Reference>
src\modules\render
src\modules\render\docs\readme.md
</Reference>
<Instruction>
When user initial load or system settings
Then user can select initial load
And it list all rendering types
Then it adds to user instruction
When user no rendering type
Then it plain instruction
When user set rendering type
Then the content will be display base on rendering type
Given the content
Then it has render view and raw view
Given user has capable to copy either
Then capable to copy the rendered view or raw view
</Instruction>
</RenderingConversation
>
## Schema
<ChatSchema>
Name: Chat

Columns: 
- id: uuidv7
- title: string. name of chat but for initial add datetime. 
- createdDate: string. datetime
- agentId?: string -> Agent
- agentPoolId?: string -> AgentPool then it will display agents from that pool
- provider?: string. base on helix ai provider
- model?: string. base on helix ai model
</ChatSchema>
<ConversationSchema>
Name: Conversation

Columns:
- id: uuidv7
- chatId: string;
- type: string. "assistant" | "system" | "user"
- agentId?: string -> Agent. override agent.
- provider?: string. history what provider used to produce specially ai output
- model?: capable to adjust model.
- content: string;
- contentType?: string; base on render type
- createdDate?: string;
</ConversationSchema>


# Feature: AI Settings
Use AI Helix for AI Configuration and to use with AI Services
- src\modules\helix

Components
- src\modules\helix\src\components\index.ts

## Rules
Least to Most Priority on AI Provider Settings
AISettings(Global) -> Agent AI Settings -> AI Conversation Settings -> AI Input Settings

# Feature: Agent and AgentPool
CRUD For AI Agent
Reference
src\modules\bunny
src\modules\bunny\src\feature

## Schema
<Table>
  <Name>Agent</Name>
  <Columns>
  name: string
  agentPoolId?: string -> AgentPool.id
  persona: string
  skills: string -> array of string seperate by comma","
  provider?: string -> base on helix provider string
  model?: string -> base on helix model
  </Columns>
</Table>

<Repository>
  <Methods>
  <Method>
  <Name>
  GetWithoutAgentPoolId
  </Name>
  </Method>
  </Methods>
</Repository>
## Rules
Display agent without agentPoolId.

agent can have change to override global priority.

# Feature: AgentPools

Agent pools are agent groups that groups agent. ungroup agent or agent without agentpoolid are global agents.

The purpose of agent pools where in user initial chat. they can set agents pool then inherit the list of agent they can choose from


# FeatureRequest:
Don't modify this file just do the feature request
## Feature: Gradient Background
In initial chat add gradient background but when in conversation it fades away.

## Feature: Red Theme
Change the theme color to red theme similar to BunnyAI Theme color

## Feature: Chat Settings Modal 
In initial input the chat settings popup is behind on chat input it should be settings popup appear above than the chat input

## Feature: Chatid on url
each chat should have a chat id on url and display chat according to the chat id

## Feature: ChatHistory
Add Module ChatHistory and Add link on document shell
Use BunnyModule to display chat history and latest first
use BunnyFeature Row Action Router to route to open previous chat

## Feature: Voice Settings
Add voice settings and capable to select voice if available and supported by the browser
```
const synth = window.speechSynthesis;
let voices = [];

synth.onvoiceschanged = () => {
  voices = synth.getVoices();
};

function speakText(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Choose a specific voice (e.g., Google US English)
  utterance.voice = voices.find(v => v.name.includes("Google US English")) || voices[0];
  
  // Adjust audio properties
  utterance.rate = 1.0;  // Speed: 0.1 to 10
  utterance.pitch = 1.0; // Pitch: 0 to 2

  synth.speak(utterance);
}
```
## Feature: Spinning red line around chat input
around chat input only on initial chat input
add animation red line around chat input

## Feature: Code Editor Open Modal
in code editor in initial chat should have open in modal it will have its own modal and has button
to open cover view or just window view.

## Feature: Custom Instructions
Add two module and routing Instruction and InstructionGroup
use Bunny
To use this in initial chat on instruction tab
user can prefill the instruction using instruction group then instruction
if instruction group is unselected then user can still select insutrction without instructionGroupId

## Feature: In chat settings there is toggle to automatically turn on text to speech

## Feature: TextToSpeech Markdown Issue
before text to speech to read it. it should filter only text. it should not read markdown symbols. before it reads

## Feature: Agent skill
in add bubble in skill array. then when i enter it create a bubble.

## Fix: Scrolldown Issue
while ai output is streaming I could not scroll down and up. 

After the user send input it should. send 

## Feature: Delete Chat
If Chat is deleted it should delete chat history too 

Check if dexiejs could support listening to delete model and add hooks to it

## Feature: Render
Check if render instruction is included when i set render type base on render type

## Fix: Seemless ai stream chat and virtual scrolling
i want a seemless ai stream chat and virtual scrolling similar to gemini or chatgpt
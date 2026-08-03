# FeatureRequest

> Status: ✅ implemented — updated 2026-08-03

## Feature: Add animation ✅
- tw-animate-css

make add animation and colors like circling color like it was beating

Implemented: beating (`bs-beat`) + circling-color (`bs-beat-color`) animation on
bot avatars (chat empty state + conversation bubbles) via `tw-animate-css` /
custom keyframes in [`globals.css`](../../../../../app/globals.css).

## Feature: UI Layout ✅
src\modules\bunny-studio\src\modules\chat\BSChat.Component.tsx
Add more borders curve instead of just plain boxes

Implemented: more curved borders (`rounded-3xl` / `rounded-xl`) across the chat
header, input container, bubbles and settings buttons.

## Feature: Add seconds or minutes laps ✅
add schema in conversation to record seconds or minutes laps between chat

Implemented: `gapSeconds` field added to the `BSConversation` schema, recorded
for each new message, and shown as a "Xs / Ym / Zh later" divider when a
conversation gap ≥ 60s.

## Feature: Add animation and Sending on send button ✅
add animation while ai still writing

Implemented: input container gets a purple ring while streaming and the Stop
button pulses (`animate-pulse`).

## Fix: Textarea input is too big ✅
unless shift enter. to make textarea input to make it bigger input

Implemented: textarea now auto-grows from a compact single line up to a max
height as the user types (instead of a fixed 4-row box).

## Add open in editor it pops up modal(generate a reusable modal then use it) then open codemirror editor that modal has fullscreen or just window screen ✅

Implemented: reusable [`BSModal`](../../src/components/BSModal.tsx) with
window/fullscreen toggle + reusable
[`BSCodeMirrorEditor`](../../src/components/BSCodeMirrorEditor.tsx). Assistant
bubbles get an "open in editor" button that opens the content in the CodeMirror
editor inside the modal (window or fullscreen).

## Fix: Add cursor pointer on buttons ✅
add cursor pointer on buttons for whole BunnyStudio

Implemented: `.bs-studio button:not(:disabled) { cursor: pointer }` global rule;
the `bs-studio` class is applied on the studio shell and chat root.

## Feature: adjust position of actions (render, raw) ✅
adjust position of actions copy button at the buttom of chat bubble

Implemented: render/raw toggle, copy, open-in-editor and read-aloud actions are
now grouped at the bottom of the assistant bubble.

## Feature: User input chat render type ✅
Per user chat can adjust render type then back to normal after that request

Implemented: per-request render type selector in the chat input; the selected
type is used for the next request then resets to the conversation default.

## Feature: DocumentShell ✅
make the document shell friendly mobile view, add hamburger for sidebar

Implemented: `BSStudioShell` hides the sidebar on small screens and shows a
hamburger in the header that opens a slide-in drawer.

## Feature: ChatTitle ✅
adjust chat title base on first ai response.
user can rename the title

Implemented: new chats auto-title from the first AI response (first sentence,
truncated); the title is clickable to rename inline.

## Virtual Scroll ✅
bun add react-virtuoso
implement virtual scroll
After user input send request
It should scroll untill the ai first sentence top of screen.

Implemented: added `react-virtuoso`; conversation list uses `Virtuoso` and,
while streaming, the AI response is scrolled so its first sentence stays pinned
to the top of the viewport.

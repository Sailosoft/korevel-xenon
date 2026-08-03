# Feature: Add conversation chat bubble browsers natural support for text to speech ✅

Implemented: native browser text-to-speech (Web Speech API) on assistant
conversation bubbles via a "read aloud" button that toggles speak/stop.

- Uses `window.speechSynthesis` (no extra dependency).
- The button appears only when the browser supports TTS and the message has content.
- Playing icon becomes a stop icon while the message is being read; clicking
  again stops playback. Speech is cancelled on unmount.

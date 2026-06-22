You can absolutely replicate your exact Gemini workflow directly inside VS Code without letting an AI loop through or index your entire codebase.

The ideal setup for this is **Visual Studio Code's native BYOK (Bring Your Own Key) Support** combined with native **Agentic Chat**. Recent updates to VS Code natively support configuring your own API keys (OpenAI, Anthropic, OpenRouter, or local Ollama endpoints) without needing a GitHub Copilot subscription, and it gives you complete control over file targeting.

Here is exactly how to set this up to achieve your "read only selected files, modify, and save" workflow.

---

## Step 1: Configure Your BYOK Endpoint in VS Code

You don't need a third-party extension anymore; VS Code handles BYOK natively via the **Language Models** architecture.

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Search for and select **Chat: Manage Language Models**.
3. Click **Add Model** or select **Custom Endpoint** (OpenAI-compatible / Anthropic / OpenRouter).
4. Provide your API key and base URL.
5. Open your native VS Code Chat pane (`Ctrl+Alt+I` or click the Chat icon in the Activity Bar) and select your custom model from the model picker dropdown at the bottom.

---

## Step 2: Stop VS Code from Automatically Reading the Codebase

By default, the AI chat tries to look at your workspace workspace-wide. You want to turn off automatic code search indexing so it _only_ looks at what you explicitly give it.

1. Open your settings (`Ctrl+,`).
2. Search for `copilot.chat.search.semanticTextSearch` or `chat.search`.
3. **Disable/Uncheck** automatic codebase indexing or semantic search for the chat assistant. This ensures it stays completely blind to the codebase unless instructed otherwise.

---

## Step 3: Use the Strict "File Targeting" Workflow

Instead of copy-pasting, you will use **`#-mentions`** and direct tool permissions to let the AI read your selected files and save the changes.

### 1. Passing the Files (Context)

In the Chat panel, type your prompt and explicitly attach only the relevant TypeScript files. You can do this in three ways:

- Type `#` in the chatbox and select the specific file from the dropdown (e.g., `#UserService.ts`).
- **Drag and drop** the files directly from your VS Code Explorer sidebar into the Chat input window.
- Highlight a specific block of code in your active text editor, and it will automatically be attached to your prompt context.

### 2. Prompting the Agent to Edit & Save

Because you are using an agentic workflow model, the model has access to system tools to edit the file structure. Instead of asking it to _"write the code for me to copy,"_ explicitly command it to modify the file.

> **Example Prompt:**
> "Look at `#authController.ts` and `#tokenValidator.ts`. Refactor the login logic to use the Strategy Pattern we introduced in the validator, similar to how it's done there. Apply the changes directly to `#authController.ts`."

### 3. Review and One-Click Save

1. The AI will read _only_ those attached files, process your request, and generate a **File Diff** right inside your Chat window or side-by-side editor.
2. It will show you exactly what lines are changing (Red for deleted, Green for added).
3. Click the **Accept / Save** checkmark button right above the diff block. VS Code will instantly write the new code into your local file and save it. Zero copy-pasting required.

---

## Alternative: Cursor or Cline (If you want deeper autonomous edits)

If you prefer a dedicated extension that aggressively handles file-writing via your own API key rather than the native VS Code chat window:

- **Cline (Extension):** Install the `Cline` extension from the marketplace. Set your provider to OpenRouter/OpenAI/Anthropic BYOK. In the settings, make sure to ignore workspace indexing. When prompting Cline, drag your files into the prompt window and say: _"Modify these files and save them. Do not read other directories."_ Cline will execute a precise `read_file` and `write_to_file` tool call on only those explicit paths.

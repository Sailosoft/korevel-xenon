Yes, there is an entirely native UI way to do this without messing with folder trees or external markdown configuration files!

Roo Code has a built-in feature called **Custom Modes** built exactly for this purpose. It includes a native graphical interface where you can explicitly pick and choose which exact tools (like file search vs. file writing) the AI agent is allowed to touch.

Here is the native, click-and-configure path to build your "Target Editor" mode.

---

## The Native Setup UI

1. **Open the Prompts / Modes Configuration:** 10 seconds.
   Open the Roo Code panel in VS Code. Click on the **Prompts** tab (or click the gear/settings icon and navigate to **Custom Modes** / **Prompts**).

2. **Trigger Mode Creation:** 15 seconds.
   Click the **"Add Custom Mode"** button. If you prefer a shortcut, you can also just type into the main Roo Code chat window: `"Create a new mode for an isolated file editor"` and click the gear adjustment that pops up.

3. **Name and Describe Your Mode:** 30 seconds.
   Fill out the native text fields:

- **Name:** `Target Editor`
- **Slug:** `target-editor`
- **Role Definition:** `You are a strict, isolated TypeScript source code editor. Your only purpose is to modify files explicitly tagged by the user.`

4. **Toggle the Allowed Tools Checklist:** 45 seconds.
   Scroll down to the **Permissions / Allowed Tools** checkbox array. This is the native control you are looking for.

- **CHECK:** `read_image`, `write_to_file`, and `apply_diff`.
- **UNCHECK:** `search_grep`, `list_files`, and `execute_command`.

> **Why this works:** By unchecking search and list capabilities, the AI physically _cannot_ loop through or scan your workspace directories, ensuring it remains blind to the rest of your codebase.

5. **Paste Mode-Specific Instructions:** 30 seconds.
   In the **Custom Instructions** text field block inside that same UI window, paste these two strict instructions:

1. Rely exclusively on files attached via `@` context mentions.
1. Apply edits directly to target files using file tools; do not output code blocks for the user to copy-paste.

1. **Save and Switch:** 5 seconds.
   Click **Save** or **Done**. Look at the bottom bar of your Roo Code panel; click the Mode dropdown and switch from `Code` or `Architect` over to your newly minted `Target Editor` mode.

---

## The Workflow Look & Feel

When you activate this mode, the agent functions exactly like your Gemini workflow: you drag in a file or type `@` to reference it, provide instructions, and watch the native file diff write directly to your VS Code window. Because the file listing tools are turned off at the system level, it will never attempt to crawl your project.

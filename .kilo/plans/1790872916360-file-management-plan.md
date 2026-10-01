# File Management Plan (task 14)

Module: `src/modules/bunny-dev/modules/file-management`.
Source: `tasks.yaml` lines 96–102.

## Goal

1. Support multimedia upload and add a modal viewer.
2. Add a multiple-select toggle with group move, copy, download, delete.
3. Password-protect a file: cannot edit, view, or download without the password.
4. Remove password protection by matching the password.

## Key files

- Domain: `BDFile.Domain.ts` (`BDProjectFileKind` 6–22, `BDProjectFile` 73–97)
- Types/helpers: `BDFile.Types.ts` (`detectKind`, `isTextKind`, `buildPath`, `replacePathPrefix`, `createUploadedFile` 259–291)
- Repos/hooks: `BDFile.Repository.ts`, `BDFile.Hooks.ts`
- UI: `BDFile.Manager.Component.tsx` (upload input 465–474, `readUpload` 288–310, `handleUpload` 312–329, `handleDownload` 348–351, grid 588–612, list 649–676, context menu 356–402), `BDFileEditor.Component.tsx`, `BDFileEditorPage.Component.tsx`
- Reuse: `BDModal.tsx`, `BDConfirmDialog.tsx`, `BDContextMenu.tsx` (`disabled` support), `BDCodeEditor`, `BDMarkdownView`, `BDWysiwygEditor`, `BDDownload.ts` (`downloadBlob`/`downloadText`), `crypto-js` (dependency; precedent `src/modules/bunny-studio/src/modules/crypto/BSCrypto.Library.ts`)

---

## T1 — Multimedia upload + modal viewer

1. Upgrade upload:
   - Keep `multiple`; add a sensible `accept` (or leave open) and set `mime` from `file.type` in `readUpload`/`createUploadedFile` (`BDFile.Types.ts` 259–291 currently never sets `mime`).
   - `image`, `video`, `audio` already map to non-text kinds and are stored as Blobs (`isTextKind` false), so storage already supports multimedia.
   - Add video/audio/PDF icons in `fileIcon(kind)` (manager 78–91).
2. Add `BDFileViewerModal.Component.tsx`:
   - Uses `BDModal` (size `full`, `bodyScroll`), receives `file: BDProjectFile` and `objectUrl`.
   - Renders by kind: `image` → `<img>`; `video` → `<video controls>`; `audio` → `<audio controls>`; `pdf`/`document` → `<iframe src={objectUrl}>`; `markdown` → `BDMarkdownView`; text/code/json → `BDCodeEditor` readOnly; else icon + Download.
   - Manage object URL lifecycle (create on open, revoke on close) as the editor does (35–44).
3. Trigger:
   - Add a "Preview" context-menu action; for media kinds, make the card/row open the viewer instead of the editor route (or add a preview button). Keep "Open in editor" for text types.

Acceptance: uploading an image/video/audio stores a blob and opens in a modal viewer; PDFs preview inline.

## T2 — Multiple select + group move/copy/download/delete

1. Selection state in `BDFile.Manager.Component.tsx`: `selectionMode: boolean` (toggle button in the header) and `selected: Set<string>` (file and folder ids).
2. Render checkboxes on grid cards and list rows when `selectionMode` is on (pattern: `components/BDList.tsx` 82, 134–148, 228–240, 284–295). Suppress navigation while selecting.
3. Bulk action bar (shown when `selected.size > 0`): Move, Copy, Download, Delete.
4. **Move**: folder-picker modal (`BDModal`) listing folders; on confirm, for each selected file/folder set `folderId` and rewrite `path` via `replacePathPrefix` (`BDFile.Types.ts`); guard against moving a folder into itself/descendant. Persist via `bdFileRepository.update`/`bdFolderRepository.update`.
5. **Copy**: duplicate selected rows with new UUIDs and name suffix `"(copy)"`. Files: copy content/blob/kind; folders: recursively copy child folders/files (add `copyFile`/`copyFolderTree` helpers). Offer "same folder" or target folder.
6. **Download**: for files, loop `downloadBlob`/`downloadText`; for selected folders, expand to contained files. No zip dependency exists — download items individually (adding `fflate`/`jszip` for a single archive is an optional follow-up).
7. **Delete**: confirm via `BDConfirmDialog`, then delete files and folders (folder delete cascades children via `BDDatabase` hooks). Use repo `deleteWhere`/loop.
8. Clear selection and exit selection mode after an action.

Acceptance: toggle selection, pick multiple files/folders, and move/copy/download/delete them as a group.

## T3 — Password protection

Decision: salted SHA-256 hash + `passwordProtected` flag; UI gate on view/edit/download (no at-rest encryption).

1. Domain (`BDFile.Domain.ts` `BDProjectFile` 73–97): add `passwordProtected?: boolean`, `passwordHash?: string`, `passwordSalt?: string`. (Stored by Dexie without a schema change; no index needed.)
2. Types (`BDFile.Types.ts`): add `hashPassword(password, salt)` = `CryptoJS.SHA256(salt + password).toString()`, `makeSalt()`, and `verifyPassword(file, password)` using a constant-time-ish compare. Note in comments this is obfuscation, not a security boundary (same caveat as `BSCrypto.Library.ts`).
3. Protect action: context-menu "Protect with password" → modal to enter (and confirm) a password → store `passwordProtected`, `passwordSalt`, `passwordHash`.
4. Gate access until unlocked:
   - `handleDownload` (manager 348–351 and editor page 56–59): if `passwordProtected` and not unlocked, prompt for password; verify before downloading.
   - Viewer/modal and editor: before rendering content, prompt; on success add the file id to a session `unlocked` set (component state/local context, not persisted).
   - `canEdit` in `BDFileEditor.Component.tsx` (line 48): force `false` while locked.
   - Context menu: disable "Open in editor"/"Download"/"Preview" for locked files (`BDContextMenuAction.disabled`), with tooltip "Password required".
5. Remove protection: context-menu "Remove password" → prompt, verify against stored hash, then clear `passwordProtected`/`passwordHash`/`passwordSalt` via `bdFileRepository.update`.
6. Add a lock badge to grid/list rows for protected files.

Acceptance: a protected file cannot be opened, edited, or downloaded without the password; entering the correct password unlocks it for the session; the correct password removes protection.

---

## Risks

- Hashing is not real encryption; contents remain readable via IndexedDB devtools. State this limitation.
- Group folder copy/move must avoid cycles and must rewrite descendant paths consistently.
- No zip dependency; multi-download is per-file until one is added.
- MIME is best-effort from `File.type` (can be empty).

## Validation

- `bun run build` and `npm run lint` pass.
- Upload image/video/audio/PDF → modal viewer works; text files still open in the editor.
- Multi-select move/copy/download/delete across files and folders; verify paths and no cycles.
- Protect a file → confirm blocked view/edit/download; unlock with correct password; wrong password fails; remove password works.

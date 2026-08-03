# Bunny AI Studio — Studio Shell Module

Provides the application layout:

## Header (sticky)

```
(BunnyIcon) (Bunny AI Studio) ............. (Logout)
```

## Sidebar

```
(Bunny Main Title Sidebar)
  Chat
Agents
  Agents
  Agent Pools
Settings
  AI Settings
  Configurations
```

## Files

| File | Purpose |
|---|---|
| [`BSStudioShell.tsx`](../BSStudioShell.tsx) | Combines header + sidebar + content |
| [`BSHeader.tsx`](../BSHeader.tsx) | Sticky header |
| [`BSSidebar.tsx`](../BSSidebar.tsx) | Sidebar navigation |

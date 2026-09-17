# PM2 Integration

PM2 is used to run this project as a production Node process: it keeps the Next.js
server alive, restarts it on crash, exposes logs/status, and can relaunch it after a
machine reboot.

This guide is written for **korevel-xenon**. It starts with how to run the project,
then covers the PM2 setup that already exists in this repo.

## Project reference

| Command             | Port    | Purpose                                             |
| ------------------- | ------- | --------------------------------------------------- |
| `npm run dev`       | `3050`  | Local development server.                           |
| `npm run sub`       | `3051`  | Secondary development server.                       |
| `npm run build`     | —       | Production build (`next build`).                    |
| `npm start`         | `3000`  | `next start` with the default port.                 |
| `npm run start:pm2` | `3051`  | Build, start under PM2, then print status.          |
| `pm2` (`next-app`)  | `3051`  | Production server managed by PM2 (`ecosystem.config.js`). |

The PM2 app is named `next-app` and runs `next start -p 3051` with `NODE_ENV=production`.

## Prerequisites

- Node.js 20+ (project uses Next.js 16 / React 19).
- PM2 installed globally:

```bash
npm install -g pm2
```

## Quick start (production with PM2)

From the repository root:

```bash
npm install
npm run start:pm2
```

`start:pm2` is the one-liner for the full sequence:

```json
"start:pm2": "npm run build && pm2 start ecosystem.config.js && pm2 status"
```

It builds the app, starts it under PM2, and prints `pm2 status`. The app is then
served at <http://localhost:3051>.

Equivalent manual commands:

```bash
npm run build
pm2 start ecosystem.config.js
pm2 status
```

If `next-app` is already running, `pm2 start` reports `Script already launched`; use
the [deploy update flow](#deploying-an-update) instead of restarting from scratch.

## ecosystem.config.js

The repo already contains the PM2 app definition:

```js
module.exports = {
  apps: [
    {
      name: 'next-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3051',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

| Field    | Meaning                                                        |
| -------- | -------------------------------------------------------------- |
| `name`   | Process name used by all `pm2 <command> next-app` calls.       |
| `script` | Executes the local Next.js CLI directly (no `npm` wrapper).    |
| `args`   | `start -p 3051` runs the production server on port 3051.       |
| `env`    | Forces `NODE_ENV=production` for the process.                  |

Running the local CLI via `script` avoids the Windows `npm`/`npm.cmd` wrapper issues
described in [Troubleshooting](#troubleshooting).

## Day-to-day commands

```bash
pm2 status                       # List processes and their state
pm2 logs next-app                # Live logs
pm2 logs next-app --lines 100    # Tail last 100 lines
pm2 monit                        # Terminal monitoring dashboard
pm2 restart next-app             # Restart (brief downtime)
pm2 reload next-app              # Zero-downtime reload
pm2 stop next-app                # Stop without removing
pm2 delete next-app              # Remove from the process list
pm2 save                         # Persist current process list
```

PM2 log files for this app live in the PM2 home directory:

```
C:\Users\<you>\.pm2\logs\next-app-out-0.log
C:\Users\<you>\.pm2\logs\next-app-error-0.log
```

## Deploying an update

Rebuild, then reload so PM2 swaps the process with minimal downtime:

```bash
npm run build
pm2 reload next-app
pm2 save
```

`pm2 reload` only applies to cluster-mode processes; in fork mode (the default used
here) it falls back to a restart. See [Scaling](#scaling-cluster-mode) if you want
true zero-downtime reloads.

## Autostart on boot

On Linux/macOS:

```bash
pm2 startup          # Prints a command; run it (needs sudo)
pm2 save             # Snapshot the current process list for restore-on-boot
```

On Windows, `pm2 startup` is not supported. Use one of these instead:

- `npm install -g pm2-installer` and follow its prompts, or
- `npm install -g pm2-windows-startup` then run `pm2-startup install`.

After either setup, run `pm2 save` so `next-app` is restored on reboot.

## Scaling (cluster mode)

To use all CPU cores, add the following to the app in `ecosystem.config.js`:

```js
instances: 'max',
exec_mode: 'cluster',
```

Before scaling on Next.js 16, note the multi-instance caveats:

- Set a shared `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` so Server Actions encrypted by
  one worker can be decrypted by another.
- The default server cache is per-process; a custom cache handler is required if you
  need consistent caching and tag revalidation across workers.

For a single-machine deployment, running one fork instance is the simplest and safest
default.

## Troubleshooting

**App exits immediately / `pm2 status` shows `errored`.**

```powershell
Get-Content C:\Users\<you>\.pm2\logs\next-app-error-0.log -Tail 20
```

A common cause is starting the app before `npm run build` has produced `.next`.

**`pm2 start npm ...` fails to launch.** Avoid wrapping `npm` on Windows; use the
local CLI (`node_modules/next/dist/bin/next`) as `ecosystem.config.js` does. If you
must use `npm`, point at the full path:

```powershell
pm2 start "C:\Program Files\nodejs\npm.cmd" --name "next-app" --script-execute -- run start -- -p 3051
```

**Port 3051 already in use.** A stray `npm run sub` dev server may still be running.
Stop it, or change the port in `args` and restart.

**Reset the process after config changes.**

```bash
pm2 delete next-app
pm2 start ecosystem.config.js
pm2 save
```

## Optional: standalone output

The project does **not** use `output: 'standalone'` today. If you switch to it later
for a slimmer production bundle, add the output option to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
};
```

Then copy static assets and point the PM2 `script` at the generated server:

```bash
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

```js
module.exports = {
  apps: [
    {
      name: 'next-app',
      script: '.next/standalone/server.js',
    },
  ],
};
```

## References

- PM2 documentation: <https://pm2.keymetrics.io/docs/usage/quick-start/>
- Next.js self-hosting: <https://nextjs.org/docs/app/guides/self-hosting>


```
npm i -g pm2-installer
pm2-installer setup          # installs a service that runs `pm2 resurrect` at boot
pm2 save                     # service resurrects this saved list
```
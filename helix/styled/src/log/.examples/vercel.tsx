import type { HelixLog } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const OUTPUT = [
  '2026-10-10T03:22:30.512Z  Running build in Washington, D.C., USA (East) – iad1',
  '2026-10-10T03:22:30.602Z  Cloning github.com/acme/storefront (Branch: main, Commit: 4f2a9c1)',
  '2026-10-10T03:22:33.258Z  Cloning completed: 2.656s',
  '2026-10-10T03:22:39.852Z  Running "vercel build"',
  '2026-10-10T03:22:40.581Z  Warning: Detected "engines": { "node": ">=22" } in your `package.json`',
  '2026-10-10T03:22:40.612Z  Running "install" command: `bun install`...',
  '2026-10-10T03:22:41.858Z  Resolving dependencies',
  '2026-10-10T03:23:12.044Z  Installed 1,214 packages',
  '2026-10-10T03:23:12.410Z  Running "next build"',
  '2026-10-10T03:24:20.102Z  Compiled successfully in 61s',
  '2026-10-10T03:24:41.877Z  Generating static pages (195/195)',
  '2026-10-10T03:24:58.330Z  Build Completed in /vercel/output [2m]',
  '2026-10-10T03:24:58.901Z  Deploying outputs...',
  '2026-10-10T03:25:06.215Z  Deployment completed',
  '',
]

export function Example() {
  const log = useRef<HelixLog>(null)

  useEffect(() => {
    log.current?.clear()
    log.current?.write(OUTPUT.join('\n'))
  }, [])

  return (
    <helix-log
      format="vercel"
      label="Vercel build"
      line-numbers
      ref={log}
    />
  )
}

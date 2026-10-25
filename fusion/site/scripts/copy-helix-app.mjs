#!/usr/bin/env bun
/**
 * Puts the Helix gallery where Expo Go opens it: `public/helix/app`.
 *
 * `@fusion.dev/helix-app`'s `bundle` writes the bundles and their assets,
 * which name no address. This copies them and writes the two manifests beside
 * the copy for the address this deploy is served from, so one cached bundle
 * serves production and every preview:
 *
 * - **production**: `https://<VERCEL_PROJECT_PRODUCTION_URL>/helix/app`,
 *   the gallery's address on the site's own domain;
 * - **a preview**: `https://<VERCEL_URL>/helix/app`, the deployment's own
 *   address;
 * - **anywhere else**: `--base`, or `HELIX_APP_BASE`, or
 *   `http://127.0.0.1:3000/helix/app` for `next start`.
 *
 * `next.config.ts` answers the base address with the manifest for the
 * platform Expo Go names, and `app/message/route.ts` holds the socket Expo Go
 * opens. Ignored by git, like the other copies under `public`.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const APP = join(ROOT, 'helix', 'app')
const DIST = join(APP, 'dist')
const SERVED = join(import.meta.dirname, '..', 'public', 'helix', 'app')
const PATH = '/helix/app'

/** The address this deploy serves the gallery from. */
const baseOf = () => {
  const { values } = parseArgs({ options: { base: { type: 'string' } } })
  const env = process.env
  if (values.base !== undefined) {
    return values.base
  }
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}${PATH}`
  }
  if (env.VERCEL_ENV !== undefined && env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}${PATH}`
  }
  return env.HELIX_APP_BASE || `http://127.0.0.1:3000${PATH}`
}

if (!existsSync(join(DIST, 'metadata.json'))) {
  console.error('helix-app: helix/app/dist has no export. Run `turbo run bundle` for it first.')
  process.exit(1)
}

const base = baseOf()
rmSync(SERVED, { force: true, recursive: true })
cpSync(DIST, SERVED, { recursive: true })

const written = spawnSync(
  process.execPath,
  [join(APP, 'scripts', 'manifests.ts'), '--base', base, '--dist', SERVED],
  { cwd: APP, stdio: 'inherit' },
)
if (written.status !== 0) {
  process.exit(written.status ?? 1)
}

// What the manifests were written from, and what the host answers, which
// `next.config.ts` and the `/message` route say for themselves.
for (const file of ['metadata.json', 'host.json']) {
  rmSync(join(SERVED, file), { force: true })
}

console.log(`helix-app: the gallery copied to public${PATH}, for ${base}`)

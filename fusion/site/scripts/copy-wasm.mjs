#!/usr/bin/env bun
/**
 * Puts the theme engine where the site serves it from.
 *
 * `theme-engine.server.ts` reads `public/helix/theme.wasm` off disk at render
 * time and the browser fetches the same path, so the binary has to be a static
 * file under `public/` before `next build` starts. It was tracked there, a
 * byte-for-byte twin of `helix/theme/wasm/fusion_helix_theme_bg.wasm` that
 * `build-wasm.mjs` wrote alongside the real one. Two tracked copies of one
 * artifact is a diff waiting to disagree; this makes the served one a build
 * output, declared in `turbo.json` and ignored by git, and the package's copy
 * the only source.
 *
 * Through the package's own `exports` rather than a path into `helix/theme`,
 * which is what a consumer of the published package does too.
 */
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(
  import.meta.resolve('@fusion.dev/helix-theme/wasm/fusion_helix_theme_bg.wasm'),
)
const served = join(import.meta.dirname, '..', 'public', 'helix', 'theme.wasm')

mkdirSync(dirname(served), { recursive: true })
copyFileSync(source, served)

console.log(
  'wasm-copy: helix/theme/wasm/fusion_helix_theme_bg.wasm copied to public/helix/theme.wasm',
)

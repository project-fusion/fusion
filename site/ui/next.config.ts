import type { NextConfig } from 'next'

/**
 * No Lit SSR integration.
 *
 * `@lit-labs/nextjs` rendered declarative shadow DOM by monkey-patching
 * `React.createElement` through a webpack `imports-loader` rule. Three problems
 * ended it. It cannot work with server components at all, because the patch
 * only runs on the server and a server component is never re-run on the client,
 * so React replays the emitted `<template>` through DOM APIs where declarative
 * shadow DOM does not activate. It hooks `config.webpack`, which Turbopack
 * ignores, so it would stop working silently. And it has not published since
 * July 2025.
 *
 * Consumers are on the App Router, so Helix has to work there without asking
 * them to adopt an experimental patch to React. Elements now upgrade on the
 * client like any other custom element, and `@helix-io/web/elements.css` covers
 * the window before they do.
 */

const config: NextConfig = {
  /**
   * Development builds into its own directory.
   *
   * `.next` is a declared Turborepo output for the site's `build`, so a task
   * that reaches it writes over the directory a running `next dev` is serving
   * from, and every route 500s until it is deleted. Two processes, two
   * directories, no shared state.
   */
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',

  /**
   * The preview frame's HTML is never cached; everything it points at is.
   *
   * `bun run frame` stamps the bundle and the stylesheet with a hash of their
   * contents, so `frame.js?v=61ce3e17` is a new URL whenever the code changes,
   * and an old URL can never be served for new code. That is the whole of the
   * cache story except for the file carrying those two URLs, which is a static
   * document under `public/` and was cached like any other. A browser holding
   * yesterday's `frame.html` asks for yesterday's bundle by name and keeps
   * getting it, so the stamping accomplishes nothing.
   *
   * This is the ordinary shape of it and the reason the stamps exist: the
   * document is small and uncacheable, the assets it names are immutable.
   */
  async headers() {
    return [
      {
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
        source: '/sandbox/frame.html',
      },
    ]
  },

  reactStrictMode: true,
  // Helix ships ESM from workspace packages; Next has to compile it rather
  // than treat it as prebuilt CommonJS. Production resolves `dist` through
  // package `exports`, which is what a consumer installs.
  transpilePackages: ['@helix-io/core', '@helix-io/headless', '@helix-io/sandbox', '@helix-io/web'],

  /**
   * Turbopack, not webpack.
   *
   * Nothing chose webpack: it is what `next dev` defaults to on 15. Turbopack
   * is the default from Next 16 on, and a `config.webpack` hook is ignored
   * there without an error, so anything written for webpack would quietly stop
   * applying.
   *
   * The dev server reads Helix from `dist`, not source, so a component edit
   * needs a build before it shows. Aliasing to source would fix that, but the
   * sources import with the `.js` extension TypeScript emits, and mapping that
   * back to `.ts` is `resolve.extensionAlias`, which is webpack only. Turbopack
   * has no equivalent, so source resolution and Turbopack cannot both be had
   * here. `bun run dev:watch` rebuilds `dist` on change instead.
   */
  turbopack: {},
}

export default config

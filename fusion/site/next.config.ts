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
 * client like any other custom element, and `@fusion.dev/helix-styles/helix.css` covers
 * the window before they do.
 */

const config: NextConfig = {
  /**
   * Development builds into its own directory.
   *
   * Next 16 already keeps `next dev` apart from `next build` under one
   * `distDir`, writing development output to `<distDir>/dev`. What that does
   * not survive is the cache: `.next/**` is a declared Turborepo output for the
   * site's `build`, and a cache hit replaces the directory with the cached
   * set, `dev/` included, under a running dev server. Two directories keeps
   * the restore away from the process that is serving.
   */
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',

  /**
   * The preview frame's HTML is never cached; everything it points at is.
   *
   * `turbo run frame` stamps the bundle and the stylesheet with a hash of their
   * contents, so `frame.js?v=61ce3e17` is a new URL whenever the code changes,
   * and an old URL can never be served for new code. The one file that cannot
   * be cached is the static document carrying those two URLs: a browser holding
   * yesterday's `frame.html` asks for yesterday's bundle by name and keeps
   * getting it, which is the stamping accomplishing nothing.
   */
  async headers() {
    return [
      {
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
        source: '/sandbox/frame.html',
      },
      /**
       * The brand faces, fetchable by the sandbox frame.
       *
       * The preview is an iframe with `allow-scripts` and no
       * `allow-same-origin`, so it runs on an opaque origin and every
       * CORS-checked request it makes arrives as `Origin: null`. `@font-face`
       * fetches in CORS mode, which is why the frame could not load a face this
       * server sent and inlined all three as data URIs instead: 111,208 bytes
       * of a 292,825 byte `frame.css`.
       *
       * `*` rather than a list, because the value that has to be allowed is
       * `null` and there is no way to name it: an opaque origin matches no
       * origin. What is being allowed is reading three woff2 files that are
       * already public, by a document this site serves, and a font carries no
       * credentials and no user data.
       *
       * Immutable because the faces are replaced by hand and approximately
       * never. A content hash would give the same guarantee and the frame
       * cannot use one, having no way to learn a new hash.
       */
      {
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/fonts/:file*',
      },
      /**
       * The 3D models the Graph examples draw their notes on, fetchable by the
       * sandbox frame, for the reason the faces are: three.js reads a model
       * with `fetch`, which from an opaque origin is a CORS request. Models
       * this site made and already serves, and carry nothing of a reader's.
       */
      {
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
        source: '/media/models/:file*',
      },
    ]
  },

  reactStrictMode: true,

  // Helix ships ESM from workspace packages; Next has to compile it rather
  // than treat it as prebuilt CommonJS. Production resolves `dist` through
  // package `exports`, which is what a consumer installs.
  transpilePackages: [
    '@fusion.dev/helix-core',
    '@fusion.dev/helix-headless',
    '@fusion.dev/helix-map',
    '@fusion.dev/helix-sandbox',
    '@fusion.dev/helix',
  ],

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
   * here. `bun run watch` rebuilds `dist` on change instead.
   *
   * **One warning is ignored, and it is Turbopack's mistake rather than ours.**
   * Its CSS parser does not know `::highlight()`, the Custom Highlight API's
   * pseudo-element, which every browser Helix supports does, and it says so on
   * every compile of the one rule in Helix's base layer that uses it. Matched
   * on that file and that sentence, so a real parse failure anywhere else, or a
   * different one in the same file, is still reported.
   */
  turbopack: {
    ignoreIssue: [
      {
        description: /'highlight' is not recognized as a valid pseudo-element/,
        path: /helix\/styles\/dist\/base\.css$/,
      },
    ],
  },
}

export default config

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
 * client like any other custom element, and `@fusion.dev/helix/elements.css` covers
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
   * `bun run gen:frame` stamps the bundle and the stylesheet with a hash of their
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
       * never, which is the property `next/font`'s content hash used to buy and
       * the frame could not use, having no way to learn a new hash.
       */
      {
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
        source: '/fonts/:file*',
      },
    ]
  },

  reactStrictMode: true,

  /**
   * The old vertical routes, kept alive.
   *
   * `/design` and `/mind` were the verticals' routes, and the pages under them
   * were always the products. The masthead says `Products` and names Helix and
   * Cortex, so the URL says so too.
   *
   * Permanent, because these are the addresses of the two pages worth linking
   * to and a 308 is what tells a search engine the move is the new truth. The
   * wildcards carry the gallery's children with them, so a bookmarked
   * `/design/components/card` and a shared `/design/sandbox?e=card.default`
   * both land where they used to, query string intact.
   */
  async redirects() {
    return [
      { destination: '/helix', permanent: true, source: '/design' },
      { destination: '/helix/:path*', permanent: true, source: '/design/:path*' },
      { destination: '/cortex', permanent: true, source: '/mind' },

      /* `for-coding-agents` lost its preposition. The old address is in
         `llms.txt` and in `published.json`, so an agent may hold it, and an
         agent is the one kind of reader that will not think to try the other
         spelling. */
      {
        destination: '/helix/docs/coding-agents',
        permanent: true,
        source: '/helix/docs/for-coding-agents',
      },

      /* Editor was never a component a reader could install. It is
         `helix-sandbox-editor`, from `@fusion.dev/helix-sandbox`, which is
         `private: true` build tooling for this repository, and it reached the
         reference only because the catalog was reading that package's manifest
         alongside the two that publish. The Sandbox document is where the
         editor is explained. */
      {
        destination: '/helix/docs/sandbox',
        permanent: true,
        source: '/helix/components/editor',
      },
    ]
  },

  // Helix ships ESM from workspace packages; Next has to compile it rather
  // than treat it as prebuilt CommonJS. Production resolves `dist` through
  // package `exports`, which is what a consumer installs.
  transpilePackages: [
    '@fusion.dev/helix-core',
    '@fusion.dev/helix-headless',
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
   */
  turbopack: {},
}

export default config

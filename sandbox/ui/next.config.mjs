/**
 * No Lit SSR integration, for the same reasons the marketing site has none:
 * `@lit-labs/nextjs` cannot work with server components, hooks `config.webpack`
 * which Turbopack ignores, and is unmaintained. Elements upgrade on the client
 * and `@helix-io/web/elements.css` covers the window before they do.
 */

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['@helix-io/core', '@helix-io/headless', '@helix-io/sandbox', '@helix-io/web'],
}

export default config

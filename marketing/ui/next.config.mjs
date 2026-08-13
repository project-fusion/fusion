/**
 * No Lit SSR integration.
 *
 * `@lit-labs/nextjs` rendered declarative shadow DOM by monkey-patching
 * `React.createElement` through a webpack `imports-loader` rule. Three problems
 * ended it. It cannot work with server components at all, because the patch
 * only runs on the server and a server component is never re-run on the client,
 * so React replays the emitted `<template>` through DOM APIs where declarative
 * shadow DOM does not activate. It hooks `config.webpack`, which Turbopack
 * ignores, so it would stop working silently on that migration. And it has not
 * published since July 2025.
 *
 * Consumers are on the App Router, so Helix has to work there without asking
 * them to adopt an experimental patch to React. Elements now upgrade on the
 * client like any other custom element, and `@helix-io/web/elements.css` covers
 * the window before they do.
 */

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Helix ships ESM from workspace packages; Next has to compile it rather
  // than treat it as prebuilt CommonJS.
  transpilePackages: ['@helix-io/core', '@helix-io/headless', '@helix-io/react', '@helix-io/web'],
}

export default config

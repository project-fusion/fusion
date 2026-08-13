import withLitSSR from '@lit-labs/nextjs'

/**
 * Lit SSR runs during Next's render so custom elements arrive with their
 * shadow roots already attached, as declarative shadow DOM. Without it the
 * tags and light-DOM content prerender but the shadow root does not, so every
 * component is unstyled until the bundle upgrades it.
 */
const withLit = withLitSSR({ addDeclarativeShadowDomPolyfill: true })

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Helix ships ESM from workspace packages; Next has to compile it rather
  // than treat it as prebuilt CommonJS.
  transpilePackages: ['@helix-io/core', '@helix-io/headless', '@helix-io/react', '@helix-io/web'],
}

export default withLit(config)

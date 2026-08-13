/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Helix ships TypeScript-adjacent ESM from workspace packages; Next has to
  // compile them rather than treat them as prebuilt CommonJS.
  transpilePackages: ['@helix-io/web', '@helix-io/react', '@helix-io/core', '@helix-io/headless'],
}

export default config

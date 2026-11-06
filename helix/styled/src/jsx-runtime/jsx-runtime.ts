/**
 * `@fusion.dev/helix/jsx-runtime` on the web: React's own runtime.
 *
 * The web draws each `helix-*` tag as the element itself, so the web needs
 * nothing of its own here. The React Native module,
 * `native/jsx-runtime/index.native.ts`, draws each tag as the native component
 * of that name. With both, an app sets `jsxImportSource` to
 * `@fusion.dev/helix` once, and its pages draw on the web and on a phone.
 *
 * @packageDocumentation
 */
export * from 'react/jsx-runtime'

/* Babel, on the web and on a phone.

   **Your own files take their JSX from `@fusion.dev/helix`.** On a phone,
   `@fusion.dev/helix/jsx-runtime` draws each `helix-*` tag as the native
   component of that name. On the web it is React's own runtime, and each tag
   is the web element. Packages keep React's runtime.

   The test is a function, because Metro first loads this file with no file
   to compile, and Babel refuses a path pattern then. */
const { join, sep } = require('node:path')

const own = ['app', 'src'].map((folder) => join(__dirname, folder) + sep)

module.exports = (api) => {
  api.cache(true)
  return {
    overrides: [
      {
        presets: [['babel-preset-expo', { jsxImportSource: '@fusion.dev/helix' }]],
        test: (file) => file !== undefined && own.some((folder) => file.startsWith(folder)),
      },
    ],
    presets: ['babel-preset-expo'],
  }
}

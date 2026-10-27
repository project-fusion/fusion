import { expect, test } from 'bun:test'
import * as reactDev from 'react/jsx-dev-runtime'
import * as react from 'react/jsx-runtime'
import * as helixDev from '../jsx-dev-runtime/jsx-dev-runtime.js'
import * as helix from './jsx-runtime.js'

/* One `jsxImportSource` for both platforms only works if the web's runtime is
   React's, function for function. */
test("the web runtime is React's own", () => {
  expect(helix.jsx).toBe(react.jsx)
  expect(helix.jsxs).toBe(react.jsxs)
  expect(helix.Fragment).toBe(react.Fragment)
  expect(helixDev.jsxDEV).toBe(reactDev.jsxDEV)
  expect(helixDev.Fragment).toBe(reactDev.Fragment)
})

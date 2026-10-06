import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let createSheet: typeof import('./create-sheet.js')['createSheet']

/* Imported after registration, because `create-sheet.js` loads Lit, and Lit
   captures whichever `document` is global when it is evaluated. Specs share one
   module cache, and this file can run before any DOM spec has registered
   happy-dom. A static import here gave every later DOM spec a Lit that holds
   a placeholder document, and their renders failed with "l.createComment is
   not a function". */
beforeAll(async () => {
  registerDom()
  ;({ createSheet } = await import('./create-sheet.js'))
})

/**
 * One line wrapping `unsafeCSS`, and the test is that it stays that way.
 *
 * There is nothing here to get wrong today, which is the point: every compiled
 * `.css.ts` in `helix/styled` hands a whole stylesheet through this, so anything
 * that escaped, trimmed or re-parsed the text would silently unstyle the entire
 * library. Lit's `css` tagged template *does* reject most of what a real sheet
 * contains, so "improving" this to use it is a plausible edit, and this is what
 * refuses it.
 */
describe('the text a stylesheet was authored with', () => {
  test('arrives exactly as written, braces, tokens and all', () => {
    const text = ':host{color:var(--helix-color-foreground);padding:var(--card-padding,1rem)}'
    expect(createSheet(text).cssText).toBe(text)
  })

  /* The three Lit's `css` tag refuses or mangles, which is the substitution
     this is guarding against. */
  test('including the parts a tagged template would refuse', () => {
    for (const text of ['@media (min-width:40rem){:host{display:grid}}', '/* a note */', '']) {
      expect(createSheet(text).cssText).toBe(text)
    }
  })
})

import { describe, expect, test } from 'bun:test'
import { NUMERIC_STRING } from './elements.js'
import { MANIFEST } from './fixture.js'
import { renderVue } from './vue.js'

const text = renderVue(MANIFEST, '@x/y')

describe('renderVue', () => {
  test('imports the class and its event type, and no platform event', () => {
    expect(text).toContain('import type { HelixBeforeCheckEvent, HelixThing } from "@x/y";')
    expect(text).not.toContain('ToggleEvent,')
  })

  /* `vue-tsc` reads `default-page="2"` as `defaultPage`, and reads the kebab
     entry only for an attribute with no value. */
  test('takes the string form of a number on the attribute and on the property', () => {
    expect(text).toContain(
      `"default-page"?: HelixThing["defaultPage"] | ${NUMERIC_STRING} | undefined;`,
    )
    expect(text).toContain(
      `"defaultPage"?: HelixThing["defaultPage"] | ${NUMERIC_STRING} | undefined;`,
    )
  })

  test('refuses it on a same-named attribute, which Vue assigns to the property', () => {
    expect(text).toContain('"total"?: HelixThing["total"] | undefined;')
  })

  test('keeps the kebab entry, which an attribute with no value is read as', () => {
    expect(text).toContain('"line-numbers"?: HelixThing["lineNumbers"] | undefined;')
  })

  test('types an attribute that names no field by its own type', () => {
    expect(text).toContain('"aria-label"?: string | undefined;')
    expect(text).not.toContain('"undefined"')
  })

  test('keys events by their own names, with a typed handler', () => {
    expect(text).toContain('"helix-before-check": HelixThingHelixBeforeCheckElementEvent;')
    expect(text).toContain('"change": HelixThingElementEvent;')
  })

  test('declares the tag with its description, under every module Vue reads it from', () => {
    expect(text).toContain(
      '"helix-thing": DefineCustomElement<HelixThing, HelixThingVueProps, HelixThingVueEvents>;',
    )
    expect(text).toContain('* A second paragraph about the thing.')
    for (const module of ['@vue/runtime-core', '@vue/runtime-dom', 'vue']) {
      expect(text).toContain(`declare module "${module}"`)
    }
  })
})

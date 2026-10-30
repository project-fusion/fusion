import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { NUMERIC_STRING } from './elements.js'
import { MANIFEST } from './fixture.js'
import { REACT_CASING, renderJsx } from './jsx.js'

const text = renderJsx(MANIFEST, '@x/y')

describe('renderJsx', () => {
  test('imports the class and its event type, and nothing a description names', () => {
    expect(text).toContain('import type { HelixBeforeCheckEvent, HelixThing } from "@x/y";')
  })

  test('writes an attribute under its own name and its property under its own', () => {
    expect(text).toContain(
      `"default-page"?: HelixThing["defaultPage"] | ${NUMERIC_STRING} | undefined;`,
    )
    expect(text).toContain('"defaultPage"?: HelixThing["defaultPage"] | undefined;')
    expect(text).toContain('"tone"?: HelixThing["tone"] | undefined;')
    expect(text).not.toContain(`"tone"?: HelixThing["tone"] | ${NUMERIC_STRING}`)
  })

  test('takes the string form of a count beside its keywords, and not of a same-named attribute', () => {
    expect(text).toContain(`"per-view"?: HelixThing["perView"] | ${NUMERIC_STRING} | undefined;`)
    expect(text).toContain('"total"?: HelixThing["total"] | undefined;')
  })

  test('types an attribute that names no field by its own type, and adds no prop called undefined', () => {
    expect(text).toContain('"aria-label"?: string | undefined;')
    expect(text).not.toContain('"undefined"')
    expect(text).not.toContain('prop:undefined')
  })

  test('leaves out a getter, a static, a protected field, and a method, and keeps a settable field', () => {
    const [, props] = /export type HelixThingProps = \{\n([\s\S]*?)\n\};/.exec(text) ?? []
    expect(props).toContain('"items"?: HelixThing["items"] | undefined;')
    for (const name of ['count', 'styles', 'namedBy', 'focus']) {
      expect(props).not.toContain(`"${name}"?:`)
    }
  })

  test('says a description whole on the attribute, and one paragraph on the property beside it', () => {
    expect(text).toContain(
      '/** The first page.\n\nStill the first page after a reset. */\n  "default-page"?:',
    )
    expect(text).toContain('/** The first page. */\n  "defaultPage"?:')
  })

  test('writes a handler for each event, under an alias where the event has a type of its own', () => {
    expect(text).toContain(
      'export type HelixThingHelixBeforeCheckElementEvent = HelixThingElementEvent<HelixBeforeCheckEvent>;',
    )
    expect(text).toContain(
      '"onhelix-before-check"?: ((e: HelixThingHelixBeforeCheckElementEvent) => void) | undefined;',
    )
    expect(text).toContain('"onchange"?: ((e: HelixThingElementEvent) => void) | undefined;')
  })

  test("writes Solid's spellings", () => {
    expect(text).toContain('"prop:tone"?: HelixThing["tone"] | undefined;')
    expect(text).toContain(
      `"attr:default-page"?: HelixThing["defaultPage"] | ${NUMERIC_STRING} | undefined;`,
    )
    expect(text).toContain('"bool:line-numbers"?: HelixThing["lineNumbers"] | undefined;')
    expect(text).toContain('"on:helix-before-check"?:')
    expect(text).not.toContain('"attr:tone"')
  })

  test('adds a handler for a native event the list lacks, in React’s casing and the platform’s type', () => {
    expect(text).toContain(
      'onToggle?: ((event: ToggleEvent & { currentTarget: T }) => void) | undefined;',
    )
    expect(text).toContain(
      'onTimeUpdate?: ((event: Event & { currentTarget: T }) => void) | undefined;',
    )
    expect(text).toContain(
      'onChange?: ((event: Event & { currentTarget: T }) => void) | undefined;',
    )
    expect(text.match(/\bonChange\?:/g)).toHaveLength(1)
  })

  test('has the corrections the generators needed from the first line', () => {
    expect(text).toContain('popovertarget?: string | undefined;')
    expect(text).not.toContain('onKeyPressed')
    expect(text).not.toContain('(default: `undefined`)')
    expect(text).toContain('onPointerEnter?:')
  })

  test('reads each framework only in its own JSX', () => {
    expect(text).toContain('interface IntrinsicElements extends CustomElements<"react"> {}')
    expect(text).toContain('interface IntrinsicElements extends CustomElements<"preact"> {}')
    expect(text).toContain('declare module "solid-js/jsx-runtime"')
    expect(text).toContain('declare module "solid-js/h/jsx-runtime"')
    expect(text).toContain('// @ts-ignore: React')
  })

  test('writes the tag once, with its doc, and both maps over it', () => {
    expect(text.match(/"helix-thing":/g)).toHaveLength(1)
    expect(text).toContain('[Tag in keyof Tags]: Tags[Tag]["props"] &')
    expect(text).toContain(
      '"helix-thing": { element: HelixThing; props: HelixThingProps; solid: HelixThingSolidJsProps };',
    )
  })

  test('lists the API on the tag by its first paragraphs', () => {
    expect(text).toContain('* - `default-page`/`defaultPage`: The first page.\n')
    expect(text).toContain('* - `items`: Set by script. (property only)\n')
    expect(text).toContain('* - `(default)`: The body.\n')
    expect(text).toContain('* - `focus(options: FocusOptions) => void`\n')
    expect(text).toContain('* - `--thing-fill`: The fill.\n')
  })

  test('closes no comment early', () => {
    const closing = renderJsx(
      {
        modules: [
          {
            declarations: [
              {
                attributes: [{ description: 'Matches */ here.', fieldName: 'a', name: 'a' }],
                customElement: true,
                description: 'Ends */ here.',
                members: [{ kind: 'field', name: 'a' }],
                name: 'HelixA',
                tagName: 'helix-a',
              },
            ],
          },
        ],
      },
      '@x/y',
    )
    expect(closing).toContain('Ends *\\/ here.')
    expect(closing).toContain('Matches *\\/ here.')
  })
})

/* The element binds the prop core's table names on a hydrated page, so the
   typings have to offer the same spelling. They cannot share the table: this
   package is a build tool core depends on, so it cannot import core. */
describe('REACT_CASING', () => {
  test('is the table core binds by', async () => {
    const bridge = join(import.meta.dir, '../../../core/src/helix-element/react-bridge.ts')
    const core = (await import(bridge)) as { REACT_CASING: Record<string, string> }
    expect(REACT_CASING).toEqual(core.REACT_CASING)
  })
})

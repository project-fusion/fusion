import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jsxDeclaredEvents } from './jsx-declared-events.js'

/**
 * The plugin rewrites a file the generator wrote, so the test writes one.
 *
 * A fixture rather than the real `jsx.d.ts`, for the reason
 * `jsx-optional-undefined.spec.ts` gives: that file is 40,000 lines and rebuilt
 * by `analyze`, so asserting against it would test whether somebody had run the
 * build. This asserts the transform.
 */
const scene = (
  source: string,
  events: (string | { name: string; type: string })[],
  fileName = 'jsx.d.ts',
): string => {
  const dir = mkdtempSync(join(tmpdir(), 'jsx-declared-'))
  writeFileSync(join(dir, fileName), source)
  const manifest = {
    modules: [
      {
        declarations: [
          {
            events: events.map((event) =>
              typeof event === 'string'
                ? { name: event }
                : { name: event.name, type: { text: event.type } },
            ),
          },
        ],
      },
    ],
  }
  const was = process.cwd()
  process.chdir(dir)
  try {
    jsxDeclaredEvents().packageLinkPhase?.({ customElementsManifest: manifest } as never)
    return readFileSync(join(dir, fileName), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

const BAG = 'type BaseEvents<T = HTMLElement> = {\n  onClick?: (event: MouseEvent) => void;\n};\n'

describe('handlers for events the manifest declares', () => {
  test('adds one the generator does not emit', () => {
    const next = scene(BAG, ['toggle'])
    expect(next).toContain('onToggle?: (event: Event & { currentTarget: T }) => void;')
  })

  /* `onToggle={(event) => event.newState}` did not compile, the handler taking
     a bare `Event` while every element sends a `ToggleEvent`. */
  test('takes the platform type every element declares', () => {
    const next = scene(BAG, [
      { name: 'toggle', type: 'ToggleEvent' },
      { name: 'toggle', type: 'ToggleEvent' },
    ])
    expect(next).toContain('onToggle?: (event: ToggleEvent & { currentTarget: T }) => void;')
  })

  test('falls back to Event where elements disagree, or the type is not the platform one', () => {
    const mixed = scene(BAG, [
      { name: 'toggle', type: 'ToggleEvent' },
      { name: 'toggle', type: 'Event' },
    ])
    expect(mixed).toContain('onToggle?: (event: Event & { currentTarget: T }) => void;')
    const own = scene(BAG, [{ name: 'close', type: 'HelixCloseEvent' }])
    expect(own).toContain('onClose?: (event: Event & { currentTarget: T }) => void;')
  })

  test('leaves a handler the generator already emits alone', () => {
    /* The generator types `onClick` as taking a `MouseEvent`, which is better
       than the `Event` the manifest records, so a second entry would replace a
       precise type with a vague one. */
    const next = scene(BAG, ['click'])
    expect(next).toContain('onClick?: (event: MouseEvent) => void;')
    expect(next.match(/onClick\?:/g)).toHaveLength(1)
  })

  test('ignores a prefixed event, which is not an identifier and is typed per element', () => {
    expect(scene(BAG, ['helix-input'])).toBe(BAG)
  })

  test('writes nothing when every declared event is already there', () => {
    expect(scene(BAG, ['click'])).toBe(BAG)
  })

  test('leaves a package with no JSX types alone', () => {
    /* Every private package in this repository, and the normal case rather than
       an error: the plugin runs in a shared configuration. */
    const dir = mkdtempSync(join(tmpdir(), 'jsx-declared-'))
    const was = process.cwd()
    process.chdir(dir)
    try {
      expect(() =>
        jsxDeclaredEvents().packageLinkPhase?.({ customElementsManifest: {} } as never),
      ).not.toThrow()
    } finally {
      process.chdir(was)
      rmSync(dir, { force: true, recursive: true })
    }
  })

  test('sorts what it adds, so a rerun writes the same bytes', () => {
    const next = scene(BAG, ['play', 'ended', 'close'])
    const order = ['onClose', 'onEnded', 'onPlay'].map((name) => next.indexOf(name))
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })
})

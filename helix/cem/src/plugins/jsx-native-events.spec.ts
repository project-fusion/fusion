import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jsxNativeEvents } from './jsx-native-events.js'

/**
 * The plugin rewrites a file the generator wrote, so the test writes one.
 *
 * A fixture rather than the real `jsx.d.ts`, which is 40,000 lines and rebuilt
 * by `analyze`: asserting against it would test whether somebody had run the
 * build. This asserts the transform.
 */
const GENERATED = `type BaseProps<T> = {
  ref?: T;
};

type BaseEvents = {
  /** Triggered when the element is clicked. */
  onClick?: (event: MouseEvent) => void;
  /** Fired when the value changes. */
  onChange?: (event: Event) => void;
};

export type CustomElements = {
  "helix-select": Partial<
    HelixSelectProps & BaseProps<HelixSelect> & BaseEvents
  >;
};
`

const scene = (source = GENERATED): string => {
  const dir = mkdtempSync(join(tmpdir(), 'jsx-native-'))
  writeFileSync(join(dir, 'jsx.d.ts'), source)
  const was = process.cwd()
  process.chdir(dir)
  try {
    jsxNativeEvents().packageLinkPhase?.({} as never)
    return readFileSync(join(dir, 'jsx.d.ts'), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

afterEach(() => {})

describe('typing a native handler to the element it is written on', () => {
  test('makes the handler bag generic and defaults it, so nothing it misses breaks', () => {
    expect(scene()).toContain('type BaseEvents<T = HTMLElement> = {')
  })

  test('types `currentTarget` on every handler, not only the ones a form sends', () => {
    const next = scene()
    expect(next).toContain('onChange?: (event: Event & { currentTarget: T }) => void;')
    expect(next).toContain('onClick?: (event: MouseEvent & { currentTarget: T }) => void;')
  })

  test('passes each tag its own element, read from the `BaseProps` beside it', () => {
    expect(scene()).toContain('BaseProps<HelixSelect> & BaseEvents<HelixSelect>')
  })

  test('leaves a file it has already rewritten alone', () => {
    /* `analyze` runs on every build and the plugin runs after the generator,
       which usually means a fresh file. It does not always: a build that fails
       between the two leaves a rewritten one on disk, and a second pass would
       type `currentTarget` as `T & { currentTarget: T }`. */
    const once = scene()
    expect(scene(once)).toBe(once)
  })

  /* The generator writes no pointer or touch handler, so `onPointerEnter` on
     a Helix element failed to typecheck in React. */
  test('adds the pointer and touch handlers the generator leaves out, typed to the element', () => {
    const next = scene()
    expect(next).toContain('onPointerEnter?: (event: PointerEvent & { currentTarget: T }) => void;')
    expect(next).toContain(
      'onLostPointerCapture?: (event: PointerEvent & { currentTarget: T }) => void;',
    )
    expect(next).toContain('onTouchStart?: (event: TouchEvent & { currentTarget: T }) => void;')
    // Inside the bag, before it closes.
    expect(next.indexOf('onTouchCancel?:')).toBeLessThan(
      next.indexOf('};', next.indexOf('type BaseEvents')),
    )
  })

  test('keeps a handler the generator already wrote, once and as it wrote it', () => {
    const next = scene(
      GENERATED.replace(
        '  onChange?:',
        '  /** Its own words. */\n  onPointerDown?: (event: PointerEvent) => void;\n  onChange?:',
      ),
    )
    expect(next.match(/onPointerDown\?:/g)).toHaveLength(1)
    expect(next).toContain('/** Its own words. */')
  })

  test('says nothing about a package that ships no elements', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jsx-native-'))
    const was = process.cwd()
    process.chdir(dir)
    try {
      expect(() => jsxNativeEvents().packageLinkPhase?.({} as never)).not.toThrow()
    } finally {
      process.chdir(was)
      rmSync(dir, { force: true, recursive: true })
    }
  })
})

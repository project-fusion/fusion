import { describe, expect, test } from 'bun:test'
import { stripMapComment } from './strip-map-comment.mjs'

describe('the comment naming a source map', () => {
  test('is taken off a file whose last line it is', () => {
    expect(stripMapComment('export const a = 1;\n//# sourceMappingURL=a.js.map\n')).toBe(
      'export const a = 1;',
    )
    expect(stripMapComment('export {};\n//# sourceMappingURL=a.d.ts.map')).toBe('export {};')
  })

  /* `compile.js` in `@fusion.dev/helix`'s sandbox, as the compiler writes it:
     the comment a module it builds ends with sits inside a template literal. */
  test('is left inside code, so the file still parses', () => {
    const code = [
      'export const withMap = (code, map) => {',
      /* biome-ignore lint/suspicious/noTemplateCurlyInString: this string is
         a template literal in the built file under test, not in this one. */
      '    return `${code}\\n//# sourceMappingURL=data:application/json;charset=utf-8,${encodeURIComponent(map)}`;',
      '};',
      '//# sourceMappingURL=compile.js.map',
      '',
    ].join('\n')
    const stripped = stripMapComment(code)
    expect(stripped).toContain('//# sourceMappingURL=data:application/json')
    expect(stripped).not.toContain('compile.js.map')
    expect(() => new Function(stripped.replace('export const', 'const'))).not.toThrow()
  })

  test('leaves a file with none as it was', () => {
    expect(stripMapComment('export const a = 1;\n')).toBe('export const a = 1;\n')
  })
})

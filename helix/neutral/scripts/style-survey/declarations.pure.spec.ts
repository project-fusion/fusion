import { describe, expect, test } from 'bun:test'
import { classifyDeclaration } from './declarations.js'
import { type Declaration, parseSheet } from './syntax.js'
import { type Verdict, verdictOf } from './verdict.js'

const declarationOf = (css: string): Declaration => {
  const [rule] = parseSheet(`a { ${css} }`).sheet.children
  const [declaration] = rule?.type === 'Rule' ? rule.block.children : []
  if (declaration?.type !== 'Declaration') {
    throw new Error(`no declaration in ${css}`)
  }
  return declaration
}

const verdict = (css: string, motion = false): Verdict =>
  verdictOf(classifyDeclaration(declarationOf(css), { hookPrefix: '--button-', motion }))

const codes = (css: string, motion = false): string[] =>
  verdict(css, motion).reasons.map(({ code }) => code)

describe('a declaration the language names', () => {
  test.each([
    ['display: inline-flex', ['set:box']],
    ['position: absolute', ['set:position']],
    ['inline-size: 100%', ['set:size']],
    ['padding-inline: 1rem 0.5em', ['set:spacing']],
    ['inset-block-start: 0', ['set:inset']],
    ['border-start-start-radius: 4px', ['set:border']],
    ['font-variant-numeric: tabular-nums', ['set:text']],
    ['rotate: 45deg', ['set:transform']],
    ['grid-template-columns: repeat(2, minmax(0, 1fr))', ['set:columns', 'value:tracks']],
    ['--_button-tone: var(--helix-color-primary)', ['value:token', 'values']],
    ['--icon-size: 1.15em', ['set:inherited']],
    ['color: var(--button-color, var(--_button-tone))', ['set:color', 'value:hook', 'value:own']],
    ['color: var(--list-rail-color, #000)', ['set:color', 'value:reference']],
    [
      'background-color: color-mix(in oklab, var(--_tone) 6%, transparent)',
      ['set:color', 'value:mix', 'value:own'],
    ],
    ['inline-size: calc(100% / 3 - 2px * 2)', ['set:size', 'value:calc']],
    ['inline-size: clamp(1rem, 50%, 20rem)', ['set:size', 'value:min-max-clamp']],
    [
      'background-image: linear-gradient(to right, #fff, transparent)',
      ['set:background-image', 'value:linear-gradient'],
    ],
    ['background: transparent', ['set:background']],
    ['transform: translateY(-50%) scale(0.9)', ['set:transform', 'value:transform']],
    [
      'transition: opacity var(--helix-duration-fast) cubic-bezier(0.2, 0, 0, 1)',
      ['set:transition', 'value:bezier', 'value:token'],
    ],
    ['animation: spin 1s linear infinite', ['set:animation']],
  ])('%s', (css, constructs) => {
    expect(verdict(css)).toEqual({ category: 'expressible', constructs, reasons: [] })
  })

  test('a frame may animate what every platform animates', () => {
    expect(verdict('opacity: 0', true).category).toBe('expressible')
  })
})

describe('a declaration the web keeps', () => {
  test.each([
    ['cursor: pointer', 'web:cursor'],
    ['appearance: none', 'web:appearance'],
    ['scrollbar-width: none', 'web:scrollbar'],
    ['touch-action: none', 'web:touch-action'],
    ['print-color-adjust: exact', 'web:print-color-adjust'],
    ['scroll-snap-type: x mandatory', 'web:scroll-snap'],
    ['content: counter(item)', 'web:generated-content'],
    ['grid-template-areas: "a b"', 'web:template-areas'],
    ['grid-area: label', 'web:template-areas'],
    ['position: fixed', 'web:position-fixed'],
    ['position: sticky', 'web:position-sticky'],
    ['outline-color: CanvasText', 'web:system-color'],
    ['grid-template-rows: subgrid', 'web:subgrid'],
    ['transition: opacity 1s, display 1s allow-discrete', 'web:discrete-transition'],
  ])('%s', (css, construct) => {
    const result = verdict(css)
    expect(result.category).toBe('web-only')
    expect(result.constructs).toContain(construct)
  })
})

describe('a declaration the language cannot say', () => {
  test.each([
    ['stroke: currentColor', 'property:svg-paint'],
    ['all: unset', 'property:all'],
    ['grid-column: 1 / -1', 'property:grid-placement'],
    ['clip-path: inset(50%)', 'property:clip-and-mask'],
    ['left: 50%', 'property:physical-inset'],
    ['width: 1px', 'property:physical-size'],
    ['--helix-size-control: var(--helix-size-control-sm)', 'property:token-override'],
    ['background: url(x.png) no-repeat', 'property:background-layers'],
    ['vertical-align: middle', 'property:vertical-align'],
    ['display: inline-block', 'value:display'],
    ['color: inherit', 'value:css-wide-keyword'],
    ['inline-size: 100vw', 'value:viewport-unit'],
    ['inline-size: 3ch', 'value:font-relative-unit'],
    ['inline-size: 100cqi', 'value:container-unit'],
    ['inline-size: calc(100% / var(--count))', 'value:calc-division'],
    ['color: color-mix(in srgb, red 10%, white)', 'value:color-space'],
    ['color: hsl(0 0% 0%)', 'value:color-function'],
    ['color: oklch(from var(--x) l c h)', 'value:relative-color'],
    ['color: light-dark(#000, #fff)', 'value:light-dark'],
    ['background-image: radial-gradient(circle, #000, transparent)', 'value:gradient-kind'],
    ['transform: rotateX(45deg)', 'value:transform-3d'],
    ['animation-timing-function: steps(4)', 'value:steps-easing'],
    ['transition: grid-template-rows 1s', 'motion:not-animatable'],
    ['transition: all 1s', 'motion:all'],
    ['transition: 1s', 'motion:all'],
    ['color: red !important', 'declaration:important'],
  ])('%s', (css, code) => {
    expect(verdict(css).category).toBe('not-expressible')
    expect(codes(css)).toContain(code)
  })

  test('a frame that moves an inset cannot animate on every platform', () => {
    expect(codes('inset-inline-start: 0', true)).toEqual(['motion:not-animatable'])
  })

  test('a frame animating a property outside the grammar reports the property alone', () => {
    expect(codes('stroke-dashoffset: 0', true)).toEqual(['property:svg-paint'])
  })

  test('a property outside the grammar names the property, not its value', () => {
    expect(verdict('clip-path: inset(var(--x))').reasons).toEqual([
      { code: 'property:clip-and-mask', text: 'clip-path' },
    ])
  })

  test('a transition names the property that cannot animate', () => {
    expect(verdict('transition: opacity 1s, backdrop-filter 1s').reasons).toEqual([
      { code: 'motion:not-animatable', text: 'backdrop-filter' },
    ])
  })
})

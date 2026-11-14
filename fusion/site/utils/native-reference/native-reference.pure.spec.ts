import { describe, expect, test } from 'bun:test'
import { type ApiRecord, nativeFamilies, type PackageRecord } from './native-reference'

/** A component with no props, which is all `nativeFamilies` reads of one. */
const component = (name: string, tag: string, constant: string): string[] => [
  `const ${constant}: Family = {"tag":"${tag}"}`,
  `export type ${name}Props = {`,
  '}',
  '/**',
  ` * \`${tag}\` drawn natively from its intermediate form.`,
  ' */',
  `export const ${name} = element(${constant}, behaviorFor(${constant})) as ComponentType<${name}Props>`,
]

const MODULE = [
  "import { behaviorFor, element, type Family } from '@fusion.dev/helix-native'",
  ...component('HelixTabs', 'helix-tabs', 'rootForm'),
  ...component('HelixTab', 'helix-tab', 'tabForm'),
].join('\n')

const API: ApiRecord = {
  families: [
    {
      elements: [{ tagName: 'helix-accordion' }],
      platforms: {},
      slug: 'accordion',
    },
    {
      elements: [
        { platforms: { 'react-native': { component: 'HelixTab' } }, tagName: 'helix-tab' },
        { platforms: { 'react-native': { component: 'HelixTabs' } }, tagName: 'helix-tabs' },
        { tagName: 'helix-headless-tabs' },
      ],
      platforms: { 'react-native': { status: 'experimental' } },
      slug: 'tabs',
    },
  ],
}

const PACKAGE: PackageRecord = {
  exports: { './tabs': { 'react-native': { default: './dist/tabs/index.native.js' } } },
  name: '@fusion.dev/helix',
}

describe('the families drawn natively', () => {
  test('are the ones api.json says, with their entry and status', () => {
    const families = nativeFamilies(API, PACKAGE, { tabs: MODULE })
    expect(families.map((one) => [one.slug, one.entry, one.status, one.runtime])).toEqual([
      ['tabs', '@fusion.dev/helix/tabs', 'experimental', '@fusion.dev/helix-native'],
    ])
  })

  test('each need a module', () => {
    expect(() => nativeFamilies(API, PACKAGE, {})).toThrow('has no native module')
  })

  test('each need a react-native condition on their entry', () => {
    const plain = { ...PACKAGE, exports: { './tabs': './dist/tabs/index.js' } }
    expect(() => nativeFamilies(API, plain, { tabs: MODULE })).toThrow(
      'no `react-native` condition',
    )
  })

  test('each declare the components api.json names', () => {
    const one = MODULE.slice(0, MODULE.indexOf('const tabForm'))
    expect(() => nativeFamilies(API, PACKAGE, { tabs: one })).toThrow(
      'api.json names HelixTab, HelixTabs and the module declares HelixTabs',
    )
  })
})

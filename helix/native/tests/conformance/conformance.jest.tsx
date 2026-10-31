/*
 * The React Native half of Helix's conformance suite. Each scenario in
 * `@fusion.dev/helix-testing/conformance` is drawn with the generated
 * components, and what each intent did is written to
 * `.local/conformance/react-native.json` with the events each element's form
 * declares and the differences `known.ts` lists. The web half writes what the
 * browsers did, and the comparison holds the two records to each other once
 * both exist. A test here fails only where the harness could not run a
 * scenario.
 *
 * The run ends with what the scenarios covered of each machine.
 */
/* Node's types, for the file this writes. They reach the tests' program
   alone, and `tsconfig.json` still checks the runtime with no global types. */
/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type DeclaredEvent,
  keyOf,
  type Recording,
  SCENARIOS,
  type Scenario,
  type Setup,
  type Written,
} from '@fusion.dev/helix-testing/conformance'
import { afterAll, beforeAll, describe, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import '../../src/families/accordion/index.native'
import '../../src/families/announcement/index.native'
import '../../src/families/app-header/index.native'
import '../../src/families/button/index.native'
import '../../src/families/button-group/index.native'
import '../../src/families/callout/index.native'
import '../../src/families/checkbox/index.native'
import '../../src/families/checkbox-group/index.native'
import '../../src/families/color-input/index.native'
import '../../src/families/color-picker/index.native'
import '../../src/families/copy-button/index.native'
import '../../src/families/dialog/index.native'
import '../../src/families/drawer/index.native'
import '../../src/families/drilldown/index.native'
import '../../src/families/file-input/index.native'
import '../../src/families/tree/index.native'
import '../../src/families/virtual-list/index.native'
import '../../src/families/format-date/index.native'
import '../../src/families/image/index.native'
import '../../src/families/input/index.native'
import '../../src/families/list/index.native'
import '../../src/families/loader/index.native'
import '../../src/families/motion-toggle/index.native'
import '../../src/families/outline/index.native'
import '../../src/families/megamenu/index.native'
import '../../src/families/menu/index.native'
import '../../src/families/navigation/index.native'
import '../../src/families/number-input/index.native'
import '../../src/families/pin-input/index.native'
import '../../src/families/popover/index.native'
import '../../src/families/qr-code/index.native'
import '../../src/families/rating/index.native'
import '../../src/families/scroll-area/index.native'
import '../../src/families/slider/index.native'
import '../../src/families/speed-dial/index.native'
import '../../src/families/splitter/index.native'
import '../../src/families/switch/index.native'
import '../../src/families/tabs/index.native'
import '../../src/families/tag/index.native'
import '../../src/families/textarea/index.native'
import '../../src/families/text/index.native'
import '../../src/families/timeline/index.native'
import '../../src/families/toast/index.native'
import '../../src/families/toggle/index.native'
import '../../src/families/toolbar/index.native'
import '../../src/families/tooltip/index.native'
import '../../src/families/tour/index.native'
import { HelixRoot, pauseMotion } from '../../src/index'
import { setPictureView } from '../../src/render/picture'
import { countFor, coverageOf } from './coverage'
import { formOf, isElement } from './forms'
import { run } from './harness'
import { FakePicture } from './images'
import { KNOWN } from './known'

/* `element` hands each generated component to the harness with its form,
   and the runner hands each machine to the coverage count. */
jest.mock('@fusion.dev/helix-native', () => {
  const actual = jest.requireActual<typeof import('../../src/index')>('../../src/index')
  const { remember, watched } = jest.requireActual<typeof import('./forms')>('./forms')
  return {
    ...actual,
    element: (...made: Parameters<typeof actual.element>) =>
      remember(made[0], actual.element(made[0], watched(made[1]))),
  }
})
/* A section's scroll view is the page `sections.ts` lays out, which hears
   what the setup's scroll view reports, while a setup with sections is
   drawn. */
jest.mock('../../src/capabilities/scroll', () => {
  type MockScroll = typeof import('../../src/capabilities/scroll')
  const actual = jest.requireActual<MockScroll>('../../src/capabilities/scroll')
  const { laid, PAGE } = jest.requireActual<typeof import('./page')>('./page')
  const mirrored =
    <Args extends unknown[]>(own: (view: never, ...rest: Args) => void) =>
    (view: never, ...rest: Args) => {
      own(view, ...rest)
      if (laid.on) {
        own(PAGE as never, ...rest)
      }
    }
  return {
    ...actual,
    glides: mirrored(actual.glides),
    scrolled: mirrored(actual.scrolled),
    scrollViewAbove: (node: never) => actual.scrollViewAbove(node) ?? (laid.on ? PAGE : null),
    settled: mirrored(actual.settled),
    sizedScroll: mirrored(actual.sizedScroll),
  }
})
jest.mock('@fusion.dev/helix-core/machines/runner', () => {
  const actual = jest.requireActual<typeof import('@fusion.dev/helix-core/machines/runner')>(
    '@fusion.dev/helix-core/machines/runner',
  )
  const { watch } = jest.requireActual<typeof import('./coverage')>('./coverage')
  return {
    ...actual,
    run: (...given: Parameters<typeof actual.run>) => watch(actual.run, ...given),
  }
})

/** Where the record is written: `.local/conformance` at the root of the repository. */
const OUT = join(__dirname, '../../../../.local/conformance/react-native.json')

/** Every tag the scenarios draw, in the order they first appear. */
const tagsOf = (scenarios: readonly Scenario[]): string[] => {
  const tags = new Set<string>()
  const visit = (setup: Setup) => {
    if (isElement(setup.tag)) {
      tags.add(setup.tag)
    }
    for (const child of setup.children ?? []) {
      if (typeof child !== 'string') {
        visit(child)
      }
    }
  }
  for (const scenario of scenarios) {
    visit(scenario.setup)
  }
  return [...tags]
}

/** The machines a family's elements bind, by the tags its scenarios draw. */
const machinesOf = (scenarios: readonly Scenario[]): string[] =>
  [
    ...new Set(
      tagsOf(scenarios).flatMap((tag) => (formOf(tag).machines ?? []).map((use) => use.machine)),
    ),
  ].sort()

/**
 * The events each tag's form declares, with the detail fields each carries,
 * which the comparison keeps of both records. Read from the forms the
 * components draw, as the harness reads them.
 */
const declaredBy = (scenarios: readonly Scenario[]): Record<string, DeclaredEvent[]> =>
  Object.fromEntries(
    tagsOf(scenarios)
      .sort()
      .map((tag) => [
        tag,
        (formOf(tag).api?.events ?? []).map((event) => ({
          detail: [...event.detail],
          name: event.name,
        })),
      ]),
  )

const recorded: { [key: string]: Recording[string] } = {}

beforeAll(async () => {
  /* `HelixRoot` installs the native capabilities the first time it draws, so
     it draws once before the fakes each scenario sets. */
  const once = await render(<HelixRoot />)
  await once.unmount()
  /* Each picture answers as the fake image source says. */
  setPictureView(FakePicture)
})

describe.each(Object.entries(SCENARIOS))('%s conformance', (family, scenarios) => {
  for (const scenario of scenarios) {
    test(scenario.name, async () => {
      countFor(family)
      /* The app's motion is one choice for every scenario, as a page's is,
         so each starts with it running. */
      pauseMotion(false)
      try {
        recorded[keyOf(scenario)] = await run(scenario)
      } finally {
        countFor(undefined)
      }
    })
  }
})

/* After every scenario, since Jest runs the tests of a file in the order they
   are written. A scenario the harness could not run has failed above and is
   left out, and the comparison names it as missing. */
test('the record is written for the comparison', () => {
  const written: Written = {
    declared: declaredBy(Object.values(SCENARIOS).flat()),
    known: KNOWN,
    platform: 'react-native',
    record: recorded,
  }
  mkdirSync(join(OUT, '..'), { recursive: true })
  writeFileSync(OUT, `${JSON.stringify(written, null, 2)}\n`)
})

afterAll(() => {
  const lines = ['', 'Conformance: what the scenarios took of each machine']
  for (const [family, scenarios] of Object.entries(SCENARIOS)) {
    for (const one of coverageOf(family, machinesOf(scenarios))) {
      const total = one.taken.length + one.missed.length
      lines.push(`  ${family}, ${one.machine}: ${one.taken.length} of ${total} transitions taken`)
      lines.push(...one.taken.map((taken) => `      ${taken}`))
    }
  }
  lines.push('', `Conformance: the record is in ${OUT.slice(OUT.indexOf('.local'))}`)
  process.stdout.write(`${lines.join('\n')}\n`)
})

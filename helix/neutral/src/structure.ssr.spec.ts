import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html, unsafeStatic } from 'lit/static-html.js'
import '@fusion.dev/helix/accordion'
import '@fusion.dev/helix/announcement'
import '@fusion.dev/helix/app-header'
import '@fusion.dev/helix/avatar'
import '@fusion.dev/helix/badge'
import '@fusion.dev/helix/blockquote'
import '@fusion.dev/helix/breadcrumbs'
import '@fusion.dev/helix/button'
import '@fusion.dev/helix/button-group'
import '@fusion.dev/helix/callout'
import '@fusion.dev/helix/card'
import '@fusion.dev/helix/checkbox'
import '@fusion.dev/helix/checkbox-group'
import '@fusion.dev/helix/code'
import '@fusion.dev/helix/copy-button'
import '@fusion.dev/helix/description-list'
import '@fusion.dev/helix/dialog'
import '@fusion.dev/helix/divider'
import '@fusion.dev/helix/drawer'
import '@fusion.dev/helix/drilldown'
import '@fusion.dev/helix/empty'
import '@fusion.dev/helix/flex'
import '@fusion.dev/helix/format-date'
import '@fusion.dev/helix/grid'
import '@fusion.dev/helix/icon'
import '@fusion.dev/helix/icon-button'
import '@fusion.dev/helix/image'
import '@fusion.dev/helix/kbd'
import '@fusion.dev/helix/list'
import '@fusion.dev/helix/loader'
import '@fusion.dev/helix/megamenu'
import '@fusion.dev/helix/menu'
import '@fusion.dev/helix/meter'
import '@fusion.dev/helix/motion-toggle'
import '@fusion.dev/helix/navigation'
import '@fusion.dev/helix/outline'
import '@fusion.dev/helix/popover'
import '@fusion.dev/helix/progress'
import '@fusion.dev/helix/qr-code'
import '@fusion.dev/helix/quote'
import '@fusion.dev/helix/radio'
import '@fusion.dev/helix/scroll-area'
import '@fusion.dev/helix/skeleton'
import '@fusion.dev/helix/skip-link'
import '@fusion.dev/helix/speed-dial'
import '@fusion.dev/helix/steps'
import '@fusion.dev/helix/stat'
import '@fusion.dev/helix/switch'
import '@fusion.dev/helix/tabs'
import '@fusion.dev/helix/tag'
import '@fusion.dev/helix/text'
import '@fusion.dev/helix/timeline'
import '@fusion.dev/helix/toast'
import '@fusion.dev/helix/toggle'
import '@fusion.dev/helix/toolbar'
import '@fusion.dev/helix/tooltip'
import '@fusion.dev/helix/tour'
import '@fusion.dev/helix/trend'
import { drawnPlaces, type Place, parse } from './drawn.js'
import accordionItem from './families/accordion/item/headless.js'
import accordion from './families/accordion/root/headless.js'
import announcement from './families/announcement/root/headless.js'
import appHeader from './families/app-header/root/headless.js'
import avatarGroup from './families/avatar/group/headless.js'
import avatar from './families/avatar/root/headless.js'
import badge from './families/badge/root/headless.js'
import blockquote from './families/blockquote/root/headless.js'
import breadcrumb from './families/breadcrumbs/breadcrumb/headless.js'
import breadcrumbs from './families/breadcrumbs/root/headless.js'
import button from './families/button/root/headless.js'
import buttonGroup from './families/button-group/root/headless.js'
import callout from './families/callout/root/headless.js'
import card from './families/card/root/headless.js'
import checkbox from './families/checkbox/root/headless.js'
import checkboxGroup from './families/checkbox-group/root/headless.js'
import code from './families/code/root/headless.js'
import copyButton from './families/copy-button/root/headless.js'
import descriptionListItem from './families/description-list/item/headless.js'
import descriptionList from './families/description-list/root/headless.js'
import dialog from './families/dialog/root/headless.js'
import divider from './families/divider/root/headless.js'
import drawer from './families/drawer/root/headless.js'
import drilldownItem from './families/drilldown/item/headless.js'
import drilldown from './families/drilldown/root/headless.js'
import empty from './families/empty/root/headless.js'
import flex from './families/flex/root/headless.js'
import formatDate from './families/format-date/root/headless.js'
import grid from './families/grid/root/headless.js'
import icon from './families/icon/root/headless.js'
import iconButton from './families/icon-button/root/headless.js'
import image from './families/image/root/headless.js'
import kbd from './families/kbd/root/headless.js'
import listItem from './families/list/item/headless.js'
import list from './families/list/root/headless.js'
import loader from './families/loader/root/headless.js'
import megamenuGroup from './families/megamenu/group/headless.js'
import megamenuItem from './families/megamenu/item/headless.js'
import megamenu from './families/megamenu/root/headless.js'
import menuItem from './families/menu/item/headless.js'
import menu from './families/menu/root/headless.js'
import menuSection from './families/menu/section/headless.js'
import meter from './families/meter/root/headless.js'
import meterSegment from './families/meter/segment/headless.js'
import motionToggle from './families/motion-toggle/root/headless.js'
import navigationItem from './families/navigation/item/headless.js'
import navigation from './families/navigation/root/headless.js'
import outline from './families/outline/root/headless.js'
import popover from './families/popover/root/headless.js'
import progress from './families/progress/root/headless.js'
import qrCode from './families/qr-code/root/headless.js'
import quote from './families/quote/root/headless.js'
import radioGroup from './families/radio/group/headless.js'
import radio from './families/radio/root/headless.js'
import scrollArea from './families/scroll-area/root/headless.js'
import skeleton from './families/skeleton/root/headless.js'
import skipLink from './families/skip-link/root/headless.js'
import speedDialGroup from './families/speed-dial/group/headless.js'
import speedDialItem from './families/speed-dial/item/headless.js'
import speedDial from './families/speed-dial/root/headless.js'
import statGroup from './families/stat/group/headless.js'
import stat from './families/stat/root/headless.js'
import steps from './families/steps/root/headless.js'
import step from './families/steps/step/headless.js'
import switchRoot from './families/switch/root/headless.js'
import tabPanel from './families/tabs/panel/headless.js'
import tabs from './families/tabs/root/headless.js'
import tab from './families/tabs/tab/headless.js'
import tagGroup from './families/tag/group/headless.js'
import text from './families/text/root/headless.js'
import timelineGroup from './families/timeline/group/headless.js'
import timelineItem from './families/timeline/item/headless.js'
import timeline from './families/timeline/root/headless.js'
import toastItem from './families/toast/item/headless.js'
import toast from './families/toast/root/headless.js'
import toggleGroup from './families/toggle/group/headless.js'
import toolbar from './families/toolbar/root/headless.js'
import tooltip from './families/tooltip/root/headless.js'
import tour from './families/tour/root/headless.js'
import tourStop from './families/tour/stop/headless.js'
import trend from './families/trend/root/headless.js'
import { treePlaces, wrapsOf } from './structure-tree.js'
import type { Headless, Node } from './tree.js'

/*
 * **The structural judge: each web element draws its tree.** The web elements
 * are still written by hand, so a template can drift from the tree the native
 * renderer draws. This renders each element on the server and holds what it
 * draws to its tree: every part and region sits under the same part, a region
 * carries its part, a node carries its role, and the element draws no part the
 * tree lacks. Each `when` that an attribute turns on is rendered turned on too.
 *
 * **What is drawn by default.** A `when` draws while its prop is set, a `wrap`
 * draws its box only while it has somewhere to go, and a `live` node with
 * `while` speaks only while its prop holds, so none of those is expected in a
 * plain render. A node marked `platform: 'web'` is the web element's own
 * business, such as a drag preview drawn during a drag: it is held to its place
 * where it is drawn, and is not required. A node marked `platform: 'native'` is
 * a phone's alone, and the web element draws it some other way, and a wrap
 * marked so draws its children where it stands. An `unless()` draws while its
 * prop is not set.
 *
 * **What the server does not show.** A top part's role may sit on the host,
 * through `ElementInternals`, which server markup does not carry, so a top part
 * drawn with no role passes. A `<button>` is a button unless it is hidden from
 * assistive technology, and a node the tree marks `decorative` must be hidden,
 * itself or by a part around it.
 *
 * **What an element needs to draw anything.** An icon draws nothing until it
 * has a name, so it is drawn with one from the set.
 *
 * **Toggle is not judged here.** A server cannot tell whether a group holds a
 * toggle, so it draws the radio a group holds, and the tree is the toggle
 * button on its own that a phone draws. **Neither is Tag**: the web draws its
 * `cell` only in a group, where it is a row's one cell, and the tree is the
 * one press a phone draws for every tag.
 */

/**
 * An element's source with its tree. A source holds its tree as JSX that
 * nothing runs, so its tree is the compiled one, from the native module
 * `helix family components` writes and `check:families` holds to a fresh
 * compile.
 */
const withTree = (family: Headless): Headless => {
  const native = new URL('../../styled/native/', import.meta.url)
  for (const folder of readdirSync(native)) {
    const module = readFileSync(new URL(`${folder}/index.native.ts`, native), 'utf8')
    for (const line of module.split('\n')) {
      const form = /^const \w+Form: Family = (.*)$/.exec(line)?.[1]
      const compiled = form === undefined ? undefined : (JSON.parse(form) as Compiled)
      if (compiled?.tag === `helix-${family.name}`) {
        return { ...family, tree: compiled.tree }
      }
    }
  }
  throw new Error(`no native module holds the compiled form of helix-${family.name}`)
}

/** What of a compiled form the judge reads. */
interface Compiled {
  readonly tag: string
  readonly tree: readonly Node[]
}

/** The attributes an element is drawn with before any `when` is turned on, by its family. */
const GIVEN: Readonly<Record<string, string>> = { icon: 'name="gear"' }

/** Whether what the element draws at a place is what the tree says. */
const agrees = (want: Place, there: Place): boolean =>
  want.parent === there.parent &&
  want.part === there.part &&
  (want.role === there.role || want.role === '*' || (want.parent === '' && there.role === '')) &&
  (!want.hidden || there.hidden)

/** Where what an element draws parts from its tree, one sentence each. */
const differences = (family: Headless, set: ReadonlySet<string>): string[] => {
  const tag = `helix-${family.name}`
  const element = unsafeStatic(tag)
  const on = unsafeStatic([GIVEN[family.name] ?? '', ...set].join(' ').trim())
  const markup = withoutStyles(ssr(html`<${element} ${on}></${element}>`))
  const drawn = drawnPlaces(
    parse(rendered(markup, tag)),
    '',
    false,
    new Map(),
    wrapsOf(family.tree),
  )
  const expected = treePlaces(family, family.tree, { hidden: false, parent: '', set }, new Map())
  const found: string[] = []
  for (const [key, place] of expected) {
    const there = drawn.get(key)
    if (there === undefined) {
      if (!place.optional) {
        found.push(`${key}: the tree draws it and the element does not`)
      }
    } else if (!agrees(place, there)) {
      found.push(
        `${key}: the tree has ${JSON.stringify(place)} and the element ${JSON.stringify(there)}`,
      )
    }
  }
  for (const key of drawn.keys()) {
    if (!expected.has(key)) {
      found.push(`${key}: the element draws it and the tree does not`)
    }
  }
  return found
}

/** The boolean attributes that turn on a `when` in the tree, each rendered on its own. */
const switches = (family: Headless): string[] => {
  const names = new Set<string>()
  const visit = (nodes: readonly Node[]) => {
    for (const node of nodes) {
      const prop = family.props.find((one) => one.name === node.name)
      if (node.kind === 'when' && prop?.type === 'boolean' && prop.attribute !== false) {
        names.add(node.name)
      }
      visit(node.children ?? [])
    }
  }
  visit(family.tree)
  return [...names].sort()
}

describe('the structural judge', () => {
  for (const family of [
    accordion,
    accordionItem,
    announcement,
    appHeader,
    avatar,
    avatarGroup,
    badge,
    blockquote,
    breadcrumb,
    breadcrumbs,
    button,
    buttonGroup,
    callout,
    card,
    checkbox,
    checkboxGroup,
    code,
    copyButton,
    descriptionList,
    descriptionListItem,
    dialog,
    divider,
    drawer,
    drilldown,
    drilldownItem,
    empty,
    flex,
    formatDate,
    grid,
    icon,
    iconButton,
    image,
    kbd,
    list,
    loader,
    listItem,
    megamenu,
    megamenuGroup,
    megamenuItem,
    menu,
    menuItem,
    menuSection,
    meter,
    meterSegment,
    motionToggle,
    navigation,
    navigationItem,
    outline,
    popover,
    progress,
    qrCode,
    quote,
    radio,
    radioGroup,
    scrollArea,
    skeleton,
    skipLink,
    speedDial,
    speedDialGroup,
    speedDialItem,
    step,
    steps,
    stat,
    statGroup,
    switchRoot,
    tab,
    tabPanel,
    tabs,
    tagGroup,
    text,
    timeline,
    timelineGroup,
    timelineItem,
    toast,
    toastItem,
    toggleGroup,
    toolbar,
    tooltip,
    tour,
    tourStop,
    trend,
  ].map(withTree)) {
    test(`helix-${family.name} draws its tree`, () => {
      expect(differences(family, new Set())).toEqual([])
    })

    for (const name of switches(family)) {
      test(`helix-${family.name} draws its tree with \`${name}\` set`, () => {
        expect(differences(family, new Set([name]))).toEqual([])
      })
    }
  }
})

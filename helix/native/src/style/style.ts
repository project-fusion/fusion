/**
 * Applies a family's intermediate form on React Native.
 *
 * **One runtime for every family.** `helix system build` writes each family's
 * rules as data, and this reads any of them, so a family needs no native code
 * of its own for its look.
 *
 * **Rules apply in the browser's order: specificity, then source order.** Each
 * rule carries the specificity of the selector the web output writes for it,
 * so a hover that outranks an emphasis on the web outranks it here.
 *
 * **What has no native meaning is dropped and named.** A cursor, a sticky
 * position, and a rule written with the web's own selectors are reported in
 * `dropped`, so the gap between the platforms can be counted.
 *
 * **A CSS idiom a view reads differently is translated here, once.** A grid of
 * one track per axis is a flex line, a one-color gradient sized to an edge is
 * a line along it, and a percentage of a box sized by its content is a stretch
 * or a grow.
 */

import { cascade } from './conditions.js'
import type { Context } from './context.js'
import { deferFrom } from './deferred.js'
import { finisherFor } from './finish.js'
import type { Family, Rule, Value } from './form.js'
import { movesOf, regional } from './regions.js'
import { resolverFor } from './resolve.js'
import {
  BLOCK,
  type Layout,
  type Resolution,
  type Resolved,
  type Slotted,
  type Transition,
} from './resolved.js'
import { held, lineage, named, oneColumn, REGIONS, tracks } from './tree.js'

/**
 * Whether a part laid along `within` is as wide as its content: its parent
 * lays it along a row, and its own style neither grows it nor sets its
 * width or its basis, as a flex item with an automatic basis is on the web.
 */
const hugs = (within: Layout, style: Resolved['style']): boolean =>
  within.flex &&
  within.row &&
  !(Number(style.flexGrow ?? 0) > 0) &&
  style.flex === undefined &&
  style.width === undefined &&
  style.flexBasis === undefined

/** A region and a tag, as `spanning` keys what spans every column. */
const spanKey = (region: string | undefined, tag: string): string => `${region ?? ''} ${tag}`

/** Whether a `grid-column` runs from the first line to the last, as `1 / -1` does. */
const spansAll = (value: Resolution): boolean =>
  /^1\s*\/\s*-1$/.test((Array.isArray(value) ? value.join(' ') : String(value)).trim())

/**
 * What a part gives the content passed into it, with each child that spans
 * every column of a wrapping row as wide as the row, so it takes a line of
 * its own.
 */
const spanned = (
  given: Readonly<Record<string, Slotted>>,
  region: string | undefined,
  spans: ReadonlySet<string>,
): Record<string, Slotted> =>
  Object.fromEntries(
    Object.entries(given).map(([tag, one]) => [
      tag,
      spans.has(spanKey(region, tag)) ? { ...one, style: { ...one.style, width: '100%' } } : one,
    ]),
  )

/**
 * One part's style under a context, its regions' style, its motion, and the
 * private values its content inherits.
 *
 * **A private value inherits down the part tree, as a custom property does.**
 * A value set on the host reaches every part, one set on a part reaches the
 * parts inside it, and an inner one wins over an outer one whatever their
 * specificity. Values from the element around this one come in as
 * `inherited`, under all of them.
 */
export const style = (family: Family, part: string, context: Context): Resolved => {
  const levels = ['host', ...lineage(family.tree ?? [], part)]
  const rules = cascade(family, context, levels.slice(1, -1))
  /* **A grid whose only content is one region lays it out with the native
     grid**, as Grid's host does. */
  const content =
    part === 'host' ? (family.tree ?? []) : (named(family.tree ?? [], part)?.children ?? [])
  const lone = content.length === 1 && content[0]?.kind === 'region'
  /* A rule for this part, or for a part it is as well. A rule on a region is
     the content's, which `contents` gives it. */
  const plain = (rule: Rule) => rule.region === undefined
  /* **A rule that is `exact` is on the part alone**, and not on a node that
     is another part as well, as `[part="skeleton"]` misses a paragraph's
     `skeleton line`. */
  const alone = (rule: Rule) => rule.exact !== true || (context.also ?? []).length === 0
  const aimed = (rule: Rule) =>
    plain(rule) &&
    alone(rule) &&
    (rule.target === part || (context.also ?? []).includes(rule.target))
  const own = new Map<string, Value>()
  for (const level of levels) {
    for (const rule of rules) {
      if (rule.target === level && rule.slotted === undefined && plain(rule)) {
        for (const [name, value] of rule.values) {
          own.set(name, value)
        }
      }
    }
  }
  const dropped: string[] = []
  const declare = (inner: string | undefined, slotted?: string) => {
    const declared = new Map<string, Value>()
    for (const rule of rules) {
      if (!aimed(rule) || rule.inner !== inner || rule.slotted !== slotted) {
        if (
          rule.target === part &&
          inner === undefined &&
          rule.inner !== REGIONS &&
          rule.inner !== undefined &&
          rule.inner !== '::before' &&
          rule.inner !== '::after' &&
          rule.inner !== '::backdrop'
        ) {
          dropped.push(`${rule.inner}: written with the web's own selectors`)
        }
        continue
      }
      for (const [property, value] of rule.set) {
        declared.delete(property)
        declared.set(property, value)
      }
    }
    return declared
  }
  const resolver = resolverFor({
    aimed,
    context,
    family,
    levels,
    own,
    part,
    plain,
    rules,
  })
  const { custom, resolve, valued } = resolver
  /* **What `target` gives the content passed into it that spans every
     column**, as `grid-column: 1 / -1` does, by the region and the tag each
     rule names, the last rule for each winning. */
  const spanning = (target: string): ReadonlySet<string> => {
    const last = new Map<string, Resolution>()
    for (const rule of rules) {
      if (rule.target !== target || rule.slotted === undefined || rule.inner !== undefined) {
        continue
      }
      for (const [property, value] of rule.set) {
        if (property === 'grid-column') {
          last.set(spanKey(rule.region, rule.slotted), resolve(value))
        }
      }
    }
    return new Set([...last].filter(([, value]) => spansAll(value)).map(([key]) => key))
  }
  /* How a part lays out what it holds, from the display, direction, and
     tracks its own rules declare. */
  const layoutOf = (target: string): Layout => {
    const found = new Map<string, Value>()
    for (const rule of rules) {
      if (
        rule.target === target &&
        plain(rule) &&
        rule.inner === undefined &&
        rule.slotted === undefined
      ) {
        for (const [property, value] of rule.set) {
          found.set(property, value)
        }
      }
    }
    const read = (property: string) => {
      const value = found.get(property)
      return value === undefined ? undefined : resolve(value)
    }
    const display = read('display')
    const grid = display === 'grid' || display === 'inline-grid'
    if (!grid && display !== 'flex' && display !== 'inline-flex') {
      return BLOCK
    }
    const template = read('grid-template-columns')
    const columns = oneColumn(template) ? undefined : template
    /* **A grid drawn as a row wraps where content passed in spans every
       column**, so that content takes a line of its own, as on the web. A
       grid whose only content is one region is the native grid's, which
       places a span itself. */
    const holding =
      target === 'host' ? (family.tree ?? []) : (named(family.tree ?? [], target)?.children ?? [])
    const gridded = holding.length === 1 && holding[0]?.kind === 'region'
    return grid
      ? {
          flex: true,
          row: columns !== undefined,
          tracks: tracks(columns ?? read('grid-template-rows')),
          ...(columns !== undefined && !gridded && spanning(target).size > 0
            ? { wraps: true }
            : {}),
        }
      : { flex: true, row: (read('flex-direction') ?? 'row') === 'row', tracks: [] }
  }
  const path = lineage(family.tree ?? [], part)
  const parent = part === 'host' ? undefined : (path[path.length - 2] ?? 'host')
  const within = parent === undefined ? (context.within ?? BLOCK) : layoutOf(parent)
  const siblings = held(
    parent === 'host' || parent === undefined
      ? (family.tree ?? [])
      : (named(family.tree ?? [], parent)?.children ?? []),
  )
  /* **Whether the parent's box is its content's size**, which a full length
     inside it then is too: an inline box shrinks to its content, and so does
     a box laid along a flex row, which grows only where it says so, by its
     own rules or by what the element around gives the host. */
  const shrinks = (() => {
    if (parent === undefined) {
      return false
    }
    const drawn = {
      ...style(family, parent, { ...context, part: {} }).style,
      ...(parent === 'host' ? context.given : undefined),
    }
    const around =
      parent === 'host' ? (context.within ?? BLOCK) : layoutOf(path[path.length - 3] ?? 'host')
    return (
      drawn.alignSelf === 'flex-start' ||
      (around.flex &&
        around.row &&
        drawn.flexGrow === undefined &&
        drawn.flex === undefined &&
        drawn.width === undefined)
    )
  })()
  /* **A track of `1fr` grows, and an `auto` one is its content's size.** */
  const track = within.tracks[siblings.indexOf(part)] ?? ''
  const grows = /\b1fr\b/.test(track)
  /* **A track whose least is its content is never narrower than it.** */
  const holds = /^(minmax\(\s*)?max-content\b/.test(track)
  const finish = finisherFor({
    context,
    dropped,
    family,
    grows,
    holds,
    lone,
    resolver,
    shrinks,
    within,
  })
  const animation = new Map<string, Resolution>()
  /* What the element around gives the host that reads the host's own
     private values, resolved here, over the host's own rules. */
  const hosted = declare(undefined)
  if (part === 'host') {
    for (const [property, value] of context.deferred ?? []) {
      hosted.delete(property)
      hosted.set(property, value)
    }
  }
  const main = finish(hosted, animation, true)
  const regions = finish(declare(REGIONS)).out
  /* What the part gives the content passed into it: on the host, the
     children of a tag; on a region's part, `*`, whatever is passed in. */
  const children: Record<string, Slotted> = {}
  for (const rule of rules) {
    const tag = rule.slotted
    if (tag !== undefined && aimed(rule) && children[tag] === undefined) {
      const values: Record<string, Resolution> = {}
      for (const each of rules) {
        if (each.slotted === tag && aimed(each)) {
          for (const [name, value] of each.values) {
            values[name] = resolve(value)
          }
        }
      }
      /* **A percentage in a child's `calc()` basis is of the host's measured
         width**, as a switch's is: a flex item's basis is a share of its
         container's line. Nothing before the host is laid out. */
      const set = declare(undefined, tag)
      const deferred = deferFrom(set, resolve)
      const given = finish(set, undefined, false, context.width)
      children[tag] = {
        counting: given.counting,
        custom: given.custom,
        ...(deferred.length === 0 ? {} : { deferred }),
        ...(given.marker === undefined ? {} : { marker: given.marker }),
        ...(given.placement === undefined ? {} : { placement: given.placement }),
        style: given.out,
        ...movesOf(context, given.transitions),
        values,
      }
    }
  }
  const contents = part === 'host' ? regional(family, context, finish, resolve) : {}
  /* **A grid drawn as a row that wraps** lets its line wrap, and what it
     gives content that spans every column makes that content as wide as the
     row. */
  const layout = layoutOf(part)
  const spans = layout.wraps === true ? spanning(part) : new Set<string>()
  if (layout.wraps === true) {
    main.out.flexWrap = 'wrap'
  }
  const values: Record<string, Resolution> = { ...context.inherited }
  for (const name of own.keys()) {
    values[name] = valued(name, undefined)
  }
  /* Each move takes no time where the reader asks for reduced motion. */
  const still = (moves: Readonly<Record<string, Transition>>) =>
    context.reducedMotion
      ? Object.fromEntries(
          Object.entries(moves).map(([key, move]) => [key, { ...move, duration: 0 }]),
        )
      : moves
  /* **`::before` content is words ahead of what the part holds**, as a rail
     draws its number, and **empty `content` draws a box**, as a radio's dot.
     `::after` draws a box, with its words where its `content` says some.
     `none` draws nothing. */
  /* **A quotation mark is words**, the reader's locale's at the depth the
     part is drawn at, and **a `no-` mark draws nothing**: it only counts a
     level. A mark whose `alt` is empty is drawn and not read. */
  const quoted = (content: Value | undefined) =>
    content !== undefined && 'quote' in content ? content.quote : undefined
  const pseudo = (inner: '::after' | '::before') => {
    const declared = declare(inner)
    const content = declared.get('content')
    declared.delete('content')
    const said =
      content === undefined ? undefined : resolve('web' in content ? content.web : content)
    const mark = quoted(content)
    if (
      typeof said !== 'string' ||
      said === 'none' ||
      said === 'normal' ||
      (mark !== undefined && said === '')
    ) {
      return undefined
    }
    const words = mark === undefined ? said.replace(/^["']|["']$/g, '') : said
    const drawn = finish(declared, new Map())
    const alt = mark?.alt === undefined ? undefined : resolve(mark.alt)
    return {
      ...(drawn.moving === undefined ? {} : { motion: drawn.moving }),
      style: drawn.out,
      transitions: still(drawn.transitions),
      ...(alt === '' || alt === '""' ? { unread: true } : {}),
      ...(words === '' ? {} : { words }),
    }
  }
  const first = pseudo('::before')
  const opening = quoted(declare('::before').get('content'))?.mark
  const opens = opening === 'open' || opening === 'no-open'
  /* **Words with a look of their own are a box**, as a pull quote's large
     mark is, and words alone are drawn ahead of what the part holds. */
  const before =
    first?.words !== undefined && Object.keys(first.style).length === 0 && !first.unread
      ? first.words
      : undefined
  const generated = {
    ...(first === undefined || before !== undefined ? {} : { before: first }),
    ...(() => {
      const after = pseudo('::after')
      return after === undefined ? {} : { after }
    })(),
  }
  /* **A layer's `::backdrop` is the scrim the layer host draws under it**,
     moved by the transitions its rules name. */
  const scrim = declare('::backdrop')
  const backdrop = scrim.size === 0 ? undefined : finish(scrim, new Map())
  return {
    ...(backdrop === undefined
      ? {}
      : { backdrop: { style: backdrop.out, transitions: still(backdrop.transitions) } }),
    ...(before === undefined ? {} : { before }),
    ...(main.blur === undefined ? {} : { blur: main.blur }),
    children: spanned(children, undefined, spans),
    ...(main.clip === undefined ? {} : { clip: main.clip }),
    contents: Object.fromEntries(
      Object.entries(contents).map(([region, content]) => [
        region,
        { ...content, children: spanned(content.children, region, spans) },
      ]),
    ),
    ...(main.inline ? { inline: true } : {}),
    ...(opens ? { opens: true } : {}),
    counting: main.counting,
    custom: Object.fromEntries(custom()),
    dropped,
    ...(main.fit === undefined ? {} : { fit: main.fit }),
    ...(main.invisible ? { invisible: true } : {}),
    ...(main.shown === undefined ? {} : { shown: main.shown }),
    ...(Object.keys(generated).length === 0 ? {} : { generated }),
    ...(main.gridded === undefined ? {} : { grid: main.gridded }),
    layout,
    ...(main.moving === undefined ? {} : { motion: main.moving }),
    regions,
    ...(main.rule === undefined ? {} : { rule: main.rule }),
    ...(main.scheme === undefined ? {} : { scheme: main.scheme }),
    ...(main.scrolls === undefined ? {} : { scrolls: main.scrolls }),
    ...(main.scrolls === 'x' && hugs(within, main.out) ? { hugs: true } : {}),
    ...(within.flex && within.row && grows && holds && main.out.flexGrow === 1
      ? { shares: true }
      : {}),
    style: main.out,
    transitions: still(main.transitions),
    values,
  }
}

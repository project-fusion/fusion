/**
 * A phone's map's layers: which are shown, the layers menu's tiles and map
 * types, and the list a screen reader reads, as the web's frame writes them.
 *
 * **A tile shows or hides its layers on the phone**, a group's tile every
 * layer in the group, over each layer's own `hidden`. The web's layer
 * elements send `before-check` and `check` from themselves; a phone's layers
 * draw nothing and send nothing, so the frame keeps the choice.
 */
import type { MapLayerSpec, MapType } from '@fusion.dev/helix-core/map'
import { useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { wordsIn } from './date-picker-read'
import { type childrenOf, layerKindOf } from './map-read'
import { boundTo, tell } from './props'

type Element = ReturnType<typeof childrenOf>[number]

/** The map types, in the order the menu offers them. */
const MAP_TYPES: readonly MapType[] = ['standard', 'hybrid', 'satellite']

/** A layer's picture in the menu, by what it draws, as the web's `iconOf`. */
const ICONS: Readonly<Record<string, string>> = {
  area: 'polygon',
  buildings: 'buildings',
  contours: 'target',
  landcover: 'leaf',
  points: 'dots-nine',
  raster: 'cloud-rain',
  route: 'path',
  terrain: 'mountains',
}

/** A layer's id: its kind and where it is written among the frame's children. */
export const layerIdOf = (kind: string, at: number): string => `${kind}-${at}`

/** Which layers are hidden: each layer's own `hidden`, then what the menu chose. */
export const useShown = (children: readonly Element[]) => {
  const [chosen, setChosen] = useState<Readonly<Record<string, boolean>>>({})
  const ids = useMemo(
    () =>
      children.flatMap((child, at) => {
        const kind = layerKindOf(child)
        return kind === undefined
          ? []
          : [
              {
                group: wordsIn(child.props.group),
                hidden: child.props.hidden === true,
                id: layerIdOf(kind, at),
              },
            ]
      }),
    [children],
  )
  const hidden = useMemo(
    () => new Set(ids.filter((one) => chosen[one.id] ?? one.hidden).map((one) => one.id)),
    [chosen, ids],
  )
  /** Shows a tile's layers where none is shown, and hides them where any is. */
  const toggle = (key: string) => {
    const layers = ids.filter((one) => (one.group || one.id) === key)
    const show = layers.every((one) => hidden.has(one.id))
    setChosen((was) => ({ ...was, ...Object.fromEntries(layers.map((one) => [one.id, !show])) }))
  }
  return { hidden, toggle }
}

/** The map type chosen: the page's `map-type`, until the menu chooses another through the request a page can refuse. */
export const useMapType = (
  family: Family,
  props: Props,
  use: MachineUse,
  read: (name: string) => unknown,
) => {
  const asked = wordsIn(read('map-type'))
  const [own, setOwn] = useState<MapType | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  const chosen: MapType = own ?? (asked === 'hybrid' || asked === 'satellite' ? asked : 'standard')
  const choose = (type: string) => {
    if (type === chosen || !MAP_TYPES.includes(type as MapType)) {
      return
    }
    const before = boundTo(use, 'onBeforeChange', 'event')
    if (before !== undefined && !tell(family, props, before, { value: type })) {
      return
    }
    setOwn(type as MapType)
    const after = boundTo(use, 'onChange', 'event')
    if (after !== undefined) {
      tell(family, props, after, {})
    }
  }
  return [chosen, choose] as const
}

/** A layer's name, its label or its built-in name. */
const nameOf = (child: Element): string =>
  wordsIn(child.props.label) || wordsIn(child.props.fallbackLabel) || fallbackOf(child)

/** The built-in names, where the element's own default is not among its props. */
const FALLBACKS: Readonly<Record<string, string>> = {
  area: 'Area',
  buildings: '3D buildings',
  contours: 'Contour lines',
  landcover: 'Land cover',
  points: 'Places',
  raster: 'Overlay',
  route: 'Route',
  terrain: 'Terrain',
}

const fallbackOf = (child: Element): string => FALLBACKS[layerKindOf(child) ?? ''] ?? ''

/** The menu's tiles and map types, and the list of shown layers a screen reader reads. */
export const menuOf = (
  children: readonly Element[],
  drawn: readonly { readonly element: Element; readonly spec: MapLayerSpec }[],
  shown: { readonly hidden: ReadonlySet<string> },
  mapType: MapType,
  read: (name: string) => unknown,
) => {
  const listed = new Set<Element>()
  const layers = drawn.flatMap(({ element, spec }) => {
    if (listed.has(element)) {
      return []
    }
    listed.add(element)
    const description = wordsIn(element.props.description)
    return [{ key: spec.id, text: `${nameOf(element)}${description ? `, ${description}` : ''}` }]
  })
  const tiles = new Map<string, { icon: string; key: string; name: string; shown: boolean }>()
  let imagery = false
  children.forEach((child, at) => {
    const kind = layerKindOf(child)
    if (kind === undefined) {
      return
    }
    if (kind === 'raster' && child.props.ground === true) {
      imagery = true
      return
    }
    const id = layerIdOf(kind, at)
    const key = wordsIn(child.props.group) || id
    const had = tiles.get(key)
    const on = !shown.hidden.has(id)
    tiles.set(key, {
      icon: had?.icon ?? ICONS[kind] ?? 'stack',
      key,
      name: had?.name ?? nameOf(child),
      shown: (had?.shown ?? false) || on,
    })
  })
  const types = imagery
    ? MAP_TYPES.map((type) => ({
        chosen: type === mapType,
        key: type,
        name: wordsIn(read(`${type}-label`)),
      }))
    : []
  return { entries: [...tiles.values()], layers, types }
}

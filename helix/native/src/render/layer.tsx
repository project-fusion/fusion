/**
 * Draws a `layer` node: what the element opens, drawn in the layer host
 * `HelixRoot` draws over the app, with the contexts it carries provided again
 * there, its scrim under it, and its place against its anchor.
 *
 * **A layer is drawn through its exit.** It stays in the host while its
 * transitions move it to its closed look, as the web's dialog stays in the
 * top layer through `overlay`'s transition, and leaves once they are done.
 * **Its first frame is `entering`**, so its rules under `entering` give the
 * values its transitions move away from, as `@starting-style` does on the
 * web, each time it opens.
 */
import { timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type ReactNode, useEffect, useLayoutEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { cornerOf } from '../machines/layer-arrow'
import { useLayerHost } from '../root/layers'
import type { Node } from '../style/form'
import type { GeneratedBox, Motion, Style, Transition } from '../style/resolved'
import { Box } from './box'
import { type Carried, provideCarried, useCarried } from './carry'
import { useOpenPhase } from './fit'
import { type Layered, LayerStopsContext, SwipeScrollerContext } from './layered'
import { warnOnce } from './shared-code'
import { fromText, resolve, type Scope } from './styles'
import { ToolbarAxisContext, ToolbarStopsContext } from './toolbar'

/** Draws a node as the box it is, under a scope of its own. */
export type DrawBox = (scope: Scope, node: Node, text: Style, inside: Node | 'host') => ReactNode

/** The longest of the moves a layer's look and its scrim make, which its exit lasts. */
const longest = (
  ...moves: readonly (Readonly<Record<string, Transition>> | undefined)[]
): Transition | undefined => {
  let found: Transition | undefined
  const length = (move: Transition) => move.duration + (move.delay ?? 0)
  for (const move of moves.flatMap((each) => Object.values(each ?? {}))) {
    if (found === undefined || length(move) > length(found)) {
      found = move
    }
  }
  return found
}

/** A scrim under the layer: its rules' look, and for a modal layer what a press on it does. */
const Scrim = ({
  backdrop,
  layered,
}: {
  readonly backdrop: GeneratedBox | undefined
  readonly layered: Layered
}) => {
  /* A sheet's scrim takes the touches outside it, as a modal layer's does,
     so a press beside a sheet dismisses it and reaches nothing under it. */
  const takes = layered.modal || layered.sheet
  if (backdrop === undefined && !takes) {
    return null
  }
  const look =
    backdrop === undefined ? null : (
      <Box
        style={{ ...backdrop.style, ...FILL }}
        transitions={backdrop.transitions}
        view={{ pointerEvents: 'none' }}
      />
    )
  return takes ? (
    <Pressable
      accessible={false}
      importantForAccessibility="no"
      onPress={layered.backdrop}
      style={StyleSheet.absoluteFill}
    >
      {look}
    </Pressable>
  ) : (
    look
  )
}

/** The whole window, as a style. */
const FILL = { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 } as const

/**
 * Where the layer's view stands: along the window's bottom edge as a sheet,
 * against its anchor once placed, across the window under it as a band,
 * along the edge its node names, as a drawer does, or in the middle of the
 * window.
 */
const placing = (layered: Layered) =>
  layered.sheet
    ? styles.sheet
    : layered.anchored
      ? placedAt(layered)
      : layered.edge === undefined
        ? styles.centered
        : styles[layered.edge]

/** Where an anchored layer stands once placed, a band as wide as the window, and out of sight before. */
const placedAt = ({ at, band, viewport }: Layered) =>
  at === undefined
    ? styles.measuring
    : {
        left: at.left,
        position: 'absolute' as const,
        top: at.top,
        ...(band === true ? { width: viewport.width } : {}),
      }

/** What the host draws for a layer: its scrim, and the layer in its place. */
const framed = (
  layered: Layered,
  content: ReactNode,
  backdrop: GeneratedBox | undefined,
  carried: Carried,
): ReactNode =>
  provideCarried(
    carried,
    <ToolbarAxisContext.Provider value={undefined}>
      <ToolbarStopsContext.Provider value={undefined}>
        <LayerStopsContext.Provider value={layered.stops}>
          <SwipeScrollerContext.Provider value={layered.scroller}>
            <View
              pointerEvents={
                !layered.open ? 'none' : layered.modal || layered.sheet ? 'auto' : 'box-none'
              }
              style={StyleSheet.absoluteFill}
            >
              <Scrim backdrop={backdrop} layered={layered} />
              <View
                collapsable={false}
                pointerEvents="box-none"
                ref={layered.floating}
                style={placing(layered)}
              >
                {content}
              </View>
            </View>
          </SwipeScrollerContext.Provider>
        </LayerStopsContext.Provider>
      </ToolbarStopsContext.Provider>
    </ToolbarAxisContext.Provider>,
  )

/** What `LayerPortal` takes. */
interface PortalProps {
  readonly backdrop: GeneratedBox | undefined
  /** Draws what the layer holds, at its first frame or after it. */
  readonly draw: (entering: boolean) => ReactNode
  readonly layered: Layered
  readonly move: Transition | undefined
  /** How long the layer's animation runs, in milliseconds: 0 where it has none or runs for ever. */
  readonly runs: number
}

/** How long one animation runs to its end, in milliseconds, and 0 where it never ends. */
const runOf = (motion: Motion | undefined): number =>
  motion === undefined || !Number.isFinite(motion.iterations)
    ? 0
    : motion.delay + motion.duration * motion.iterations

/**
 * Ends a refusal once the motion it starts has run, and at once where the
 * layer's rules give it none, as under reduced motion, as the web clears
 * `data-refused` on `animationend`, or at once where no animation runs.
 */
const useRefusal = (refused: (() => void) | undefined, runs: number): void => {
  useEffect(() => {
    if (refused === undefined) {
      return undefined
    }
    if (runs === 0) {
      refused()
      return undefined
    }
    return timers().timeout(runs, refused)
  }, [refused, runs])
}

/**
 * Hands a layer to the host while it is drawn, as it stands at each render,
 * with the contexts it carries read where its element is drawn.
 */
const LayerPortal = ({ backdrop, draw, layered, move, runs }: PortalProps) => {
  const host = useLayerHost()
  useRefusal(layered.refused, runs)
  const carried = useCarried()
  const phase = useOpenPhase(layered.open, move)
  const drawn = layered.open || phase !== 'closed'
  const [shown, setShown] = useState(false)
  useEffect(() => setShown(drawn), [drawn])
  const content = drawn ? framed(layered, draw(!shown), backdrop, carried) : null
  const { key } = layered
  useLayoutEffect(() => {
    if (host === undefined) {
      return
    }
    if (content === null) {
      host.remove(key)
      return
    }
    const { decorative = false, modal, notice = false, outside } = layered
    host.place(key, {
      content,
      decorative,
      modal,
      notice,
      ...(outside === undefined ? {} : { outside }),
    })
  })
  useLayoutEffect(() => () => host?.remove(key), [host, key])
  if (host !== undefined || content === null) {
    return null
  }
  warnOnce(
    'a layer is drawn where its element is, since no HelixRoot is around it to draw it over the app.',
  )
  return content
}

/**
 * Draws a layer node: nothing while it is closed, and the box it is, in the
 * host, while it is open and through its exit, under the window it is placed
 * in and the lengths it measures.
 */
export const drawLayer = (
  scope: Scope,
  node: Node,
  text: Style,
  inside: Node | 'host',
  drawBox: DrawBox,
): ReactNode => {
  const layered = scope.behavior.parts[node.name]?.layer
  if (layered === undefined) {
    return null
  }
  const under = (entering: boolean): Scope => ({
    ...scope,
    base: {
      ...scope.base,
      entering,
      measured: { ...scope.base.measured, ...layered.measured },
      viewport: layered.viewport,
    },
  })
  const resolved = resolve(under(false), node, fromText(text))
  /* The corners its rules draw, which its arrow keeps clear of. */
  layered.corner(cornerOf(resolved.style))
  return (
    <LayerPortal
      backdrop={resolved.backdrop}
      draw={(entering) => drawBox(under(entering), node, text, inside)}
      key={node.name}
      layered={layered}
      move={longest(resolved.transitions, resolved.backdrop?.transitions)}
      runs={runOf(resolved.motion)}
    />
  )
}

const styles = StyleSheet.create({
  /* Along an edge, stretched along it, as a drawer stands: its rules give
     it its size across. `start` and `end` turn with the writing direction. */
  bottom: { ...FILL, alignItems: 'stretch', justifyContent: 'flex-end' },
  centered: { ...FILL, alignItems: 'center', justifyContent: 'center' },
  end: { ...FILL, alignItems: 'stretch', flexDirection: 'row', justifyContent: 'flex-end' },
  measuring: { left: 0, opacity: 0, position: 'absolute', top: 0 },
  /* Stretched across the window and standing on its bottom edge, where the
     rules under `sheet` give it its width and its look. */
  sheet: { ...FILL, alignItems: 'stretch', justifyContent: 'flex-end' },
  start: { ...FILL, alignItems: 'stretch', flexDirection: 'row', justifyContent: 'flex-start' },
  top: { ...FILL, alignItems: 'stretch', justifyContent: 'flex-start' },
})

import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { motion } from '@fusion.dev/helix-core/capabilities/motion'
import { frameOf } from '@fusion.dev/helix-core/machines/reorder/glide'
import {
  type ReactNode,
  type RefCallback,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  type AccessibilityActionEvent,
  type HostInstance,
  type LayoutChangeEvent,
  View,
} from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Reanimated from 'react-native-reanimated'
import { layoutChanged } from '../capabilities/measure'
import { useDrag } from '../drivers/gesture'
import { useMotion } from '../drivers/motion'
import type { Behavior, PartBinding } from '../render/behavior'
import type { Family } from '../style/form'
import type { Joined } from './join'
import type { ReorderOffer, Standing } from './reorder'
import { keyOf, type ReorderViews } from './reorder-moves'

/** The views an item holds for a move, each `null` until it is drawn. */
interface Nodes {
  drag: HostInstance | null
  grip: HostInstance | null
  item: HostInstance | null
  slot: HostInstance | null
}

/** What the item's callbacks read, as its latest render has it. */
interface Latest {
  readonly key: string
  readonly offer: ReorderOffer | undefined
}

/** Where an item stands outside a set that moves its items. */
const AT_REST: Standing = {
  grip: undefined,
  lifted: false,
  move: undefined,
  room: 0,
  settles: true,
}

/** Nothing bound, for an item whose set moves nothing. */
const NONE: Behavior = { marks: [], parts: {} }

/** The adjustments a screen reader offers on a grip, which move its item a place. */
const ADJUST = [{ name: 'increment' }, { name: 'decrement' }]

/** The place of a lifted item, drawn over the places beside it. */
const OVER = { zIndex: 1 }

/**
 * Keeps `node` as the item's view `name`, and registers it with a driver
 * through `register`, until React lets go of it.
 */
const kept = (
  nodes: Nodes,
  name: 'drag' | 'item',
  node: HostInstance | null,
  register: RefCallback<HostInstance>,
): (() => void) | undefined => {
  nodes[name] = node
  if (node === null) {
    return undefined
  }
  const release = register(node)
  return () => {
    if (nodes[name] === node) {
      nodes[name] = null
    }
    if (typeof release === 'function') {
      release()
    }
  }
}

/** Keeps `node` as the item's grip, and hands the set the keys pressed on it, until React lets go of it. */
const gripped = (
  nodes: Nodes,
  node: HostInstance | null,
  latest: { readonly current: Latest },
): (() => void) | undefined => {
  nodes.grip = node
  if (node === null) {
    return undefined
  }
  const stop = keys().listen(node, (press) => {
    const { key, offer } = latest.current
    return offer?.key(key, press) ?? false
  })
  return () => {
    if (nodes.grip === node) {
      nodes.grip = null
    }
    stop()
  }
}

/**
 * Moves the item aside by the room it makes, as that changes: gliding while
 * the others move, and at once where the layout has moved it there. An item
 * whose set offers no moves is drawn at rest, in views made again once the
 * set offers them.
 */
const useRoom = (offer: ReorderOffer | undefined, standing: Standing, nodes: Nodes): void => {
  const had = useRef(0)
  useLayoutEffect(() => {
    if (offer === undefined) {
      had.current = 0
      return
    }
    if (standing.room === had.current) {
      return
    }
    had.current = standing.room
    const node = nodes.item
    if (node === null) {
      return
    }
    const to = frameOf(offer.axis, standing.room)
    if (standing.settles) {
      motion().place(node, to)
    } else {
      motion().glide(node, to, offer.transition, () => undefined)
    }
  })
}

/** The conditions the item's parts read: its grip's name, and its place in a move the keys hold. */
const statesOf = (
  grip: string,
  standing: Standing,
): Readonly<Record<string, boolean | string>> => ({
  ...(standing.grip === undefined ? {} : { [grip]: standing.grip }),
  ...(standing.move === undefined ? {} : { [standing.move]: true }),
})

/**
 * Draws an item of a set that moves its items, by its grip: the part the
 * form's `item.grip` names, which is also the prop the set fills with the
 * grip's name. `joined` is the set the item joined.
 *
 * **The item is drawn in three views.** The outermost is its place, which
 * the layout puts it at and nothing moves, so the set measures it for where
 * the item stands. Inside it, the gesture driver's view follows a pointer
 * that drags the grip, and inside that, the item's own view glides through
 * the motion driver: on to its new place, back to its own, or aside to make
 * room. Each driver sets a transform, so each has a view of its own.
 *
 * **The grip is what moves the item.** A pointer drags it, the keys pressed
 * on it go to the set, and a screen reader adjusts it, which moves the item
 * a place and says where it went.
 *
 * **While its set lets no item move, the item draws as a plain view**: no
 * place, no drag view, and a host drawn without Reanimated. Every hook runs
 * at every render all the same, in the same order, so turning `reorderable`
 * on or off changes only the views. React mounts each item's views again
 * with what they hold, so a component inside an item starts again with
 * fresh state.
 */
export const useReorderItem = (family: Family, joined: Joined | undefined): Behavior => {
  const grip = family.api?.item?.grip ?? ''
  const drag = useDrag()
  const moving = useMotion()
  const offer = joined?.offer?.reorder
  const key = joined === undefined ? '' : keyOf(joined)
  const standing = offer?.standing(key) ?? AT_REST
  const latest = useRef<Latest>({ key, offer })
  latest.current = { key, offer }
  const [nodes] = useState<Nodes>(() => ({ drag: null, grip: null, item: null, slot: null }))
  const [views] = useState<ReorderViews>(() => ({
    drag: () => nodes.drag,
    grip: () => nodes.grip,
    item: () => nodes.item,
    slot: () => nodes.slot,
  }))
  const hold = offer?.hold
  useLayoutEffect(
    () => (hold === undefined || key === '' ? undefined : hold(key, views)),
    [hold, key, views],
  )
  useRoom(offer, standing, nodes)
  const toSlot = useCallback(
    (node: HostInstance | null) => {
      nodes.slot = node
    },
    [nodes],
  )
  const toDrag = useCallback(
    (node: HostInstance | null) => kept(nodes, 'drag', node, drag.ref),
    [drag.ref, nodes],
  )
  const toItem = useCallback(
    (node: HostInstance | null) => kept(nodes, 'item', node, moving.ref),
    [moving.ref, nodes],
  )
  const toGrip = useCallback((node: HostInstance | null) => gripped(nodes, node, latest), [nodes])
  const laidOut = useCallback(
    (event: LayoutChangeEvent) => {
      if (nodes.slot !== null) {
        layoutChanged(nodes.slot, event.nativeEvent.layout)
      }
      latest.current.offer?.moved()
    },
    [nodes],
  )
  const adjust = useCallback((event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent
    if (actionName === 'increment' || actionName === 'decrement') {
      latest.current.offer?.nudge(latest.current.key, actionName === 'increment')
    }
  }, [])

  if (offer === undefined) {
    return NONE
  }
  const raised = standing.lifted ? offer.raised : undefined
  const host: PartBinding = {
    animated: true,
    states: statesOf(grip, standing),
    view: { ref: toItem, style: raised === undefined ? moving.style : [moving.style, raised] },
    wrap: (view: ReactNode) => (
      <View
        collapsable={false}
        onLayout={laidOut}
        ref={toSlot}
        style={standing.lifted ? OVER : undefined}
      >
        <Reanimated.View ref={toDrag} style={drag.style}>
          {view}
        </Reanimated.View>
      </View>
    ),
  }
  const handle: PartBinding =
    standing.grip === undefined
      ? {}
      : {
          view: {
            accessibilityActions: ADJUST,
            accessibilityRole: 'adjustable',
            onAccessibilityAction: adjust,
            ref: toGrip,
          },
          wrap: (view: ReactNode) => (
            <GestureDetector gesture={drag.gesture}>{view}</GestureDetector>
          ),
        }
  return { marks: [], parts: { [grip]: handle, host } }
}

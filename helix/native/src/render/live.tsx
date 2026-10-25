/*
 * Live words: what the web says in a live region, a phone says through the
 * announce capability. This is the runtime's one way to say words as an
 * element arrives or as something in it changes.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { type ReactNode, useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import type { Node } from '../style/form'
import type { Behavior } from './behavior'
import { wordsIn } from './host'
import { bound, type Scope } from './styles'

/** The states a binder gives a part while it is pressed. */
const PRESSED = ['active', 'pressed']

/** Whether a part of the element is pressed, as the element's marks or a binding's states say. */
const pressedIn = (behavior: Behavior): boolean =>
  PRESSED.some((name) => behavior.marks.includes(name)) ||
  Object.values(behavior.parts).some(({ states }) => PRESSED.some((name) => states?.[name]))

/** When live words are said. */
export type Said =
  /** As the element arrives, each time it is drawn anew. */
  | { readonly on: 'arrival' }
  /**
   * As the value it follows changes after the first render, and a flag only
   * as it turns on, as an event that follows a value is sent.
   */
  | { readonly on: 'change'; readonly follows: unknown }
  /** As `while` turns on, after a press on the element. */
  | { readonly on: 'press'; readonly pressed: boolean }

/** What `Live` takes. */
export type LiveProps = Said & {
  /** Whether the words may be said: what the node's `while` reads, and `true` without one. */
  readonly open: boolean
  /** The words: what the node's `says` reads, or content whose words it holds. */
  readonly says: unknown
  /** Whether the words are said assertively, ahead of what the screen reader is saying. */
  readonly urgent?: boolean
}

/** The words of what a live node says, on one line. */
const wordsOf = (says: unknown): string => wordsIn(says).replace(/\s+/g, ' ').trim()

/** A followed value as words, which is how a change is told. */
const keyOf = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : wordsIn(value)

/**
 * Live words, which draw nothing. They are said politely, queued after what
 * the screen reader is saying, and assertively where the node is `urgent`,
 * as a toast's `danger` message is:
 *
 * - **On arrival**, as the element is drawn, and again each time it is drawn
 *   anew, as an empty view says its heading. A render that redraws it says
 *   nothing.
 * - **On a change**, as the value it follows changes after the first
 *   render, as a meter says its reading in a new band. A flag says only as it
 *   turns on, as a bar says it is complete once it arrives at its end, and an
 *   element that arrives in a state has not moved into it.
 * - **After a press**, as `while` turns on, as a button says it is pending.
 *   Said only to the person who pressed: a phone cannot ask where its reader
 *   is.
 */
export const Live = (props: LiveProps) => {
  const latest = useRef(props)
  latest.current = props
  const heard = useRef(false)
  const pressed = props.on === 'press' && props.pressed
  useEffect(() => {
    if (pressed) {
      heard.current = true
    }
  }, [pressed])
  const say = () => {
    const words = wordsOf(latest.current.says)
    if (latest.current.open && words !== '') {
      announce().say(words, latest.current.urgent === true ? 'assertive' : 'polite')
    }
  }
  const arrives = props.on === 'arrival'
  // biome-ignore lint/correctness/useExhaustiveDependencies: said once, as the element arrives
  useEffect(() => {
    if (arrives) {
      say()
    }
  }, [])
  const followed = props.on === 'change' ? props.follows : undefined
  const key = keyOf(followed)
  const before = useRef<string | undefined>(undefined)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the value is read again through `key`
  useEffect(() => {
    const was = before.current
    before.current = key
    if (props.on !== 'change' || was === undefined || was === key) {
      return
    }
    if (typeof followed !== 'boolean' || followed) {
      say()
    }
  }, [key])
  const open = props.on === 'press' && props.open
  // biome-ignore lint/correctness/useExhaustiveDependencies: said as `while` turns on
  useEffect(() => {
    if (open && heard.current) {
      say()
    }
  }, [open])
  return null
}

/**
 * A live node of the tree: said on arrival where it `arrives`, as the value
 * it `follows` changes where it follows one, and after a press otherwise.
 */
export const drawLive = (scope: Scope, node: Node): ReactNode => {
  const read = (name: string): unknown => bound(scope, node.attributes?.[name], node.name)
  const open = node.attributes?.while === undefined ? true : Boolean(read('while'))
  const says = read('says')
  const urgent = Boolean(read('urgent'))
  if (node.attributes?.arrives === true) {
    return <Live key={node.name} on="arrival" open={open} says={says} urgent={urgent} />
  }
  if (node.attributes?.follows !== undefined) {
    return (
      <Live
        follows={read('follows')}
        key={node.name}
        on="change"
        open={open}
        says={says}
        urgent={urgent}
      />
    )
  }
  return (
    <Live
      key={node.name}
      on="press"
      open={open}
      pressed={pressedIn(scope.behavior)}
      says={says}
      urgent={urgent}
    />
  )
}

/**
 * **A status says its new words on iOS**, which has no live region of a
 * view's own, as TalkBack says them through the view's
 * `accessibilityLiveRegion`. The view's props say whether it is one.
 */
export const saidStatus = (view: Readonly<Record<string, unknown>>): ReactNode =>
  Platform.OS === 'ios' && view.accessibilityLiveRegion === 'polite' ? (
    <Live
      follows={view.accessibilityLabel}
      key="status-said"
      on="change"
      open
      says={view.accessibilityLabel}
    />
  ) : null

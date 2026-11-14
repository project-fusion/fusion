/**
 * The form capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's does nothing,
 * so the slot is safe to call anywhere, and no platform's code reaches a
 * bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 *
 * **The slot holds the contract over `unknown`**, since each platform's
 * implementation takes its own handle for a part: an element on the web. A
 * host hands it the parts its platform draws.
 */
import type { Form } from './contract.generated.js'
import { serverForm } from './server.js'

let current: Form<unknown> = serverForm

/** The implementation in use. */
export const form = (): Form<unknown> => current

/**
 * Replaces the implementation in use, as an adapter does once at its start and
 * an app does to take over. Generic, so an implementation that takes one
 * platform's parts can be set.
 */
export const setForm = <N>(next: Form<N>): void => {
  current = next as Form<unknown>
}

export type { Form } from './contract.generated.js'

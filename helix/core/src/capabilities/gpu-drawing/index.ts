/**
 * The GPU drawing capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's draws
 * nothing, so the slot is safe to call anywhere, and no platform's code
 * reaches a bundle that does not set it: the web's and the native adapter's
 * implementations are imported only where they are set.
 */
import type { GpuDrawing } from './contract.generated.js'
import { serverGpuDrawing } from './server.js'

let current: GpuDrawing = serverGpuDrawing

/** The implementation in use. */
export const gpuDrawing = (): GpuDrawing => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setGpuDrawing = (next: GpuDrawing): void => {
  current = next
}

export type { GpuDrawing } from './contract.generated.js'

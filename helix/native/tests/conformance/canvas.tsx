import type { Setup } from '@fusion.dev/helix-testing/conformance'
import type { ReactElement } from 'react'
import { camel } from '../../src/machines/props'

/**
 * A connection a board reads, which no generated component draws, since it
 * draws nothing: the board finds it among its children by its tag, as the
 * gallery's `helix-canvas-edge` is found.
 */
const CanvasEdge = Object.assign((_: Readonly<Record<string, unknown>>) => null, {
  tag: 'helix-canvas-edge',
})

/** Whether a setup's child is a board's connection. */
export const isCanvasEdge = (child: Setup): boolean => child.tag === 'helix-canvas-edge'

/** A board's connection, its attributes as props in camel case. */
export const canvasEdge = (child: Setup): ReactElement => {
  const props = Object.fromEntries(
    Object.entries(child.props ?? {}).map(([name, value]) => [camel(name), value]),
  )
  return (
    <CanvasEdge
      key={`${String(props.from)}-${String(props.to)}-${String(props.name ?? '')}`}
      {...props}
    />
  )
}

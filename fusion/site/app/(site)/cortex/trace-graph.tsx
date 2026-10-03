'use client'

import type { HelixGraph } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'
import {
  cascadeOf,
  TRACE_DELETED,
  TRACE_LINKS,
  TRACE_NODES,
  type TraceNode,
} from '@/content/cortex/trace-example'
import styles from './trace-graph.module.css'

/** What the deleted memory is called, for the button that deletes it. */
const DELETED = TRACE_NODES.find((node) => node.id === TRACE_DELETED)?.label ?? ''

/**
 * The trace as the frame is handed it: whole, or without the deleted memory
 * and everything derived from it, as Trace deletes, and nothing it was
 * derived from.
 */
const traceOf = (deleted: boolean) => {
  const removed = deleted ? cascadeOf(TRACE_DELETED, TRACE_LINKS) : new Set<string>()
  return {
    links: TRACE_LINKS.filter((link) => !removed.has(link.source) && !removed.has(link.target)),
    nodes: TRACE_NODES.filter((node) => !removed.has(node.id)) as TraceNode[],
  }
}

/**
 * An example trace, drawn with Helix Graph by Sigma.js: three answers and
 * everything each was derived from, and a button that deletes a memory the
 * way Trace does, with everything derived from it.
 *
 * **Made when it is nearly in view**, so a reader who never scrolls this far
 * loads no renderer.
 */
export function TraceGraph() {
  const frame = useRef<HelixGraph>(null)
  const box = useRef<HTMLDivElement>(null)
  const [deleted, setDeleted] = useState(false)
  /* Read when the graph is first given its notes, in case the button was pressed before it loaded. */
  const deletedNow = useRef(deleted)
  deletedNow.current = deleted
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = frame.current
    const drawing = box.current
    if (!host || !drawing) {
      return
    }
    let live = true
    let stop = (): void => undefined
    const start = async (): Promise<void> => {
      await customElements.whenDefined('helix-graph')
      const [{ connectGraph }, { sigmaDriver }, { default: Graph }, { default: Sigma }] =
        await Promise.all([
          import('@fusion.dev/helix-graph'),
          import('@fusion.dev/helix-graph/sigma'),
          import('graphology'),
          import('sigma'),
        ])
      if (!live) {
        return
      }
      const trace = traceOf(deletedNow.current)
      host.nodes = trace.nodes
      host.links = trace.links
      const sigma = new Sigma(new Graph(), drawing, { allowInvalidContainer: true })
      const connection = connectGraph(
        host,
        /* Every note is placed in its column, so no layout runs. */
        sigmaDriver(sigma, { labels: 'all', material: 'glass' }),
      )
      stop = () => {
        connection.disconnect()
        sigma.kill()
      }
    }
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          near.disconnect()
          start().catch((error: unknown) => {
            console.error(error)
            if (live) {
              setFailed(true)
            }
          })
        }
      },
      { rootMargin: '400px' },
    )
    near.observe(drawing)
    return () => {
      live = false
      near.disconnect()
      stop()
    }
  }, [])

  /* **The memory deleted as Trace deletes it**, the frame handed the trace
     without it, which draws only what changed. Nothing to hand before the
     graph has loaded, which reads the choice itself. */
  useEffect(() => {
    const host = frame.current
    /* Before the element is defined it has no `nodes` at all. */
    if (!host?.nodes?.length) {
      return
    }
    const trace = traceOf(deleted)
    host.nodes = trace.nodes
    host.links = trace.links
  }, [deleted])

  return (
    <div className={styles.trace}>
      <helix-graph
        class={styles.traceFrame}
        gestures="cooperative"
        label="An example trace of three answers"
        no-panel
        ref={frame}
      >
        <div className={styles.traceCanvas} ref={box} />
        {failed ? (
          <helix-text slot="footer" variant="caption">
            The trace could not load. Reload the page to try again.
          </helix-text>
        ) : null}
      </helix-graph>
      <helix-flex align-items="center" gap="sm" wrap>
        <helix-button disabled={deleted || undefined} onClick={() => setDeleted(true)}>
          Delete “{DELETED}”
        </helix-button>
        <helix-button
          disabled={!deleted || undefined}
          emphasis="subtle"
          onClick={() => setDeleted(false)}
        >
          Restore the trace
        </helix-button>
      </helix-flex>
      <helix-text aria-live="polite" emphasis="subtle" variant="caption">
        {deleted
          ? `Deleted “${DELETED}”, the context built from it, and the answer that context produced. The sources it came from remain.`
          : 'Press an answer to see what it was derived from, or open the list with the Notes button. The superseded price stays in the trace, since an answer given while it was current is explained by it.'}
      </helix-text>
    </div>
  )
}

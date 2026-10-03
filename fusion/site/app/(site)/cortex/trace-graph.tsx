'use client'

import type { HelixGraph } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'
import {
  boxFor,
  TRACE_DELETED,
  TRACE_LINKS,
  TRACE_NODES,
  TRACE_REMOVED,
  type TraceLayout,
  traceIn,
} from '@/content/cortex/trace-example'
import styles from './trace-graph.module.css'

/** What the deleted memory is called, for the button that deletes it. */
const DELETED = TRACE_NODES.find((node) => node.id === TRACE_DELETED)?.label ?? ''

/**
 * The trace as the frame is handed it: whole, or without what Trace's
 * `delete_cascade` removed with the deleted memory.
 */
const traceOf = (deleted: boolean, layout: TraceLayout) => {
  const removed = deleted ? TRACE_REMOVED : new Set<string>()
  return {
    links: TRACE_LINKS.filter((link) => !removed.has(link.source) && !removed.has(link.target)),
    nodes: traceIn(layout).filter((node) => !removed.has(node.id)),
  }
}

/** Where the trace turns from columns to rows: a phone's width, as the page's own narrow layout. */
const NARROW = '(max-width: 40rem)'

/**
 * An example trace, drawn with Helix Graph by Sigma.js: four answers and
 * everything each was derived from, and a button that deletes a memory the
 * way Trace does, with everything derived from it. Pressing a note lights
 * everything upstream of it, all it was derived from.
 *
 * **Made when it is nearly in view**, so a reader who never scrolls this far
 * loads no renderer.
 */
export function TraceGraph() {
  const frame = useRef<HelixGraph>(null)
  const box = useRef<HTMLDivElement>(null)
  /* The renderer, once made, which is told the box to fit when the layout changes. */
  const renderer = useRef<import('sigma').default | null>(null)
  const [deleted, setDeleted] = useState(false)
  /* In rows on a narrow screen, and in columns otherwise, read once the page can ask. */
  const [layout, setLayout] = useState<TraceLayout>('columns')
  useEffect(() => {
    const query = matchMedia(NARROW)
    const follow = (): void => setLayout(query.matches ? 'rows' : 'columns')
    follow()
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [])
  /* Read when the graph is first given its notes, in case either changed before it loaded. */
  const now = useRef({ deleted, layout })
  now.current = { deleted, layout }
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
      const trace = traceOf(now.current.deleted, now.current.layout)
      host.nodes = trace.nodes
      host.links = trace.links
      const sigma = new Sigma(new Graph(), drawing, { allowInvalidContainer: true })
      sigma.setCustomBBox(boxFor(now.current.layout))
      renderer.current = sigma
      const connection = connectGraph(
        host,
        /* Every note is placed in its column, so no layout runs. */
        sigmaDriver(sigma, { labels: 'all', material: 'glass' }),
        { reach: 'upstream' },
      )
      stop = () => {
        renderer.current = null
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
    renderer.current?.setCustomBBox(boxFor(layout))
    const trace = traceOf(deleted, layout)
    host.nodes = trace.nodes
    host.links = trace.links
  }, [deleted, layout])

  return (
    <div className={styles.trace}>
      <helix-graph
        class={styles.traceFrame}
        gestures="cooperative"
        label="An example trace of four answers"
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
          ? `Deleted “${DELETED}”, the context built from it, and the answer that context produced. The facts it cited and the sources they came from remain.`
          : 'Press an answer to light everything it was derived from, through the facts in Engram to the sources they came from. The September answer cites the superseded price, which is why Engram keeps it.'}
      </helix-text>
    </div>
  )
}

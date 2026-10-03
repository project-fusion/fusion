'use client'

import type { HelixGraph } from '@fusion.dev/helix'
import { graphSnapshot } from '@fusion.dev/helix-graph/snapshot'
import { useEffect, useRef, useState } from 'react'
import {
  boxFor,
  derivedFrom,
  TRACE_DELETED,
  TRACE_LINKS,
  TRACE_NODES,
  TRACE_REMOVED,
  type TraceLayout,
  traceIn,
  WHY_ORDER,
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

/** The four answers, which the reader chooses between. */
const ANSWERS = TRACE_NODES.filter((node) => node.group === 'Outputs')

/** The answer chosen when the page loads, so its derivation is lit before anything is pressed. */
const FIRST = 'o-price'

/** A note's name, by its id. */
const nameOf = (id: string): string => TRACE_NODES.find((node) => node.id === id)?.label ?? id

/**
 * **The trace drawn before Sigma loads**, in each layout, at the size the
 * frame is drawn: 34rem tall beside the text, and a 390-pixel phone's width
 * in rows. Lit for the first answer, as the drawing opens. CSS shows the one
 * for the screen, and the connection fades both once Sigma has drawn.
 */
const SNAPSHOTS = (['columns', 'rows'] as const).map((layout) => ({
  layout,
  markup: graphSnapshot(traceIn(layout), TRACE_LINKS, {
    active: FIRST,
    bounds: boxFor(layout),
    height: layout === 'rows' ? 990 : 542,
    labels: 'all',
    reach: 'upstream',
    width: layout === 'rows' ? 340 : 1280,
  }),
}))

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
  /* **The note whose derivation is shown**, an answer at first, so the graph
     opens lit rather than waiting for a reader to guess that pressing does
     something. Pressing a note in the drawing chooses it too. */
  const [active, setActive] = useState(FIRST)
  /* Read when the graph is first given its notes, in case any changed before it loaded. */
  const now = useRef({ active, deleted, layout })
  now.current = { active, deleted, layout }
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
        /* A note's whole derivation lights, not only its neighbors. */
        { center: false, reach: 'upstream' },
      )
      host.active = now.current.active
      /* A note pressed in the drawing is the one the list below explains. */
      const pressed = (event: Event): void =>
        setActive((event as CustomEvent<{ value: string }>).detail.value)
      host.addEventListener('helix-activate', pressed)
      stop = () => {
        host.removeEventListener('helix-activate', pressed)
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

  /* The choice handed to the frame, which lights it. */
  useEffect(() => {
    const host = frame.current
    if (host?.nodes?.length && host.active !== active) {
      host.active = active
    }
  }, [active])

  /* **A deleted answer cannot stay chosen**, so the choice moves to the first
     answer the trace still holds. */
  const removed = deleted ? TRACE_REMOVED : new Set<string>()
  const answers = ANSWERS.filter((answer) => !removed.has(answer.id))
  useEffect(() => {
    if (removed.has(active)) {
      setActive(answers[0]?.id ?? '')
    }
  }, [active, answers, removed])

  /* What the chosen note was derived from, by kind, nearest first. */
  const links = TRACE_LINKS.filter((link) => !removed.has(link.source) && !removed.has(link.target))
  const why = active ? derivedFrom(active, links) : new Set<string>()
  const kinds = WHY_ORDER.map((group) => ({
    group,
    names: TRACE_NODES.filter((node) => node.group === group && why.has(node.id)).map(
      (node) => node.label,
    ),
  })).filter((kind) => kind.names.length > 0)

  return (
    <div className={styles.trace}>
      {/* **Choose an answer, and see what it came from.** The four answers are
          the way in, since an answer is what a reader asks about. */}
      <helix-radio-group
        label="Choose an answer"
        onChange={(event) => setActive(event.currentTarget.value)}
        orientation="horizontal"
        value={answers.some((answer) => answer.id === active) ? active : ''}
      >
        {answers.map((answer) => (
          <helix-radio key={answer.id} value={answer.id}>
            {answer.label}
          </helix-radio>
        ))}
      </helix-radio-group>
      <helix-text emphasis="subtle" variant="caption">
        {layout === 'rows' ? 'Read from the top down' : 'Read from left to right'}: what came in,
        the facts Engram kept from it, what was retrieved and looked up, the context the model was
        given, and the answer it gave. The chosen answer is lit back to where it came from.
      </helix-text>
      <helix-graph
        class={styles.traceFrame}
        gestures="cooperative"
        label="An example trace of four answers"
        no-panel
        ref={frame}
      >
        <div className={styles.traceCanvas} ref={box} />
        {SNAPSHOTS.map((snapshot) => (
          <div
            className={styles[snapshot.layout]}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: an SVG Helix Graph drew from this file's own trace, its names escaped
            dangerouslySetInnerHTML={{ __html: snapshot.markup }}
            data-helix-graph-snapshot=""
            key={snapshot.layout}
          />
        ))}
        {failed ? (
          <helix-text slot="footer" variant="caption">
            The trace could not load. Reload the page to try again.
          </helix-text>
        ) : null}
      </helix-graph>
      {/* The derivation in words, the same walk the drawing lights. */}
      <helix-card>
        <helix-flex direction="column" gap="sm">
          <helix-text as="h3" variant="subheading">
            {active ? `What ${nameOf(active)} came from` : 'Choose an answer'}
          </helix-text>
          {kinds.length > 0 ? (
            <helix-description-list>
              {kinds.map((kind) => (
                <helix-description-list-item key={kind.group} label={kind.group}>
                  {kind.names.join(', ')}
                </helix-description-list-item>
              ))}
            </helix-description-list>
          ) : (
            <helix-text emphasis="muted">
              {active
                ? 'Nothing in this trace. It came in from outside.'
                : 'Choose an answer above, or press a note in the trace.'}
            </helix-text>
          )}
        </helix-flex>
      </helix-card>
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
          : 'Deleting a memory removes everything derived from it, as Trace does. The September answer cites the superseded price, which is why Engram keeps it.'}
      </helix-text>
    </div>
  )
}

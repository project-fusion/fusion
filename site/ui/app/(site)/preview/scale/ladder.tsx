'use client'

import { useEffect, useState } from 'react'
import '../../../preview.css'

interface Rung {
  /**
   * What sovereignty means at this subject.
   */
  body: string
  /**
   * Plate under `/media/scale`.
   */
  plate: string
  /**
   * Index in the ladder, shown as a tracked figure.
   */
  rung: string
  /**
   * The subject.
   */
  title: string
}

const RUNGS: Rung[] = [
  {
    body: 'Your own keys, your own data, your own hardware. The model runs where you put it and the memory it accumulates is a file you hold. Nothing about your working life is recoverable by a company that changes its pricing.',
    plate: 'personal',
    rung: '01',
    title: 'Personal',
  },
  {
    body: 'The same properties with more people and an audit trail. A company that cannot be held hostage by a vendor roadmap, because the substrate is one it runs and the data is one it holds.',
    plate: 'organizational',
    rung: '02',
    title: 'Organizational',
  },
  {
    body: 'The same properties again, with the stakes that follow from a country running its capability on infrastructure it does not control. This rung is a written thesis and not a product, and we say so.',
    plate: 'national',
    rung: '03',
    title: 'National',
  },
]

/**
 * The ladder as a picture that changes distance, not as three stacked essays.
 *
 * Terafab's Kardashev block keeps one visual on the right and lets the types
 * speak on the left. Fusion's types are subjects, not civilizations, and the
 * plate is the same sun at three altitudes.
 */
export function ScaleLadder() {
  const [active, setActive] = useState(RUNGS[0]?.title ?? 'Personal')

  useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>('[data-rung]')]
    if (nodes.length === 0) {
      return
    }
    const ratios = new Map<Element, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio)
        }
        let best: Element | null = null
        let bestRatio = 0
        for (const [node, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = node
            bestRatio = ratio
          }
        }
        const title = best?.getAttribute('data-rung')
        if (title) {
          setActive(title)
        }
      },
      { threshold: [0, 0.15, 0.35, 0.55, 0.75] },
    )
    for (const node of nodes) {
      observer.observe(node)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <section className="scLadder">
      <div className="scLadderCopy">
        <helix-flex direction="column" gap="xl">
          <helix-text appearance="label" class="scKicker">
            The ladder
          </helix-text>
          <helix-text as="h2" class="scSceneTitle">
            The same stack. A larger subject each time.
          </helix-text>
        </helix-flex>
        <ol className="scRungs">
          {RUNGS.map((rung) => (
            <li
              className="scRungItem"
              data-active={active === rung.title ? '' : undefined}
              data-rung={rung.title}
              key={rung.title}
            >
              <button className="scRungButton" onClick={() => setActive(rung.title)} type="button">
                <span className="scRungIndex">{rung.rung}</span>
                <span className="scRungName">{rung.title}</span>
              </button>
              <p className="scRungBody">{rung.body}</p>
            </li>
          ))}
        </ol>
      </div>
      <div aria-hidden="true" className="scLadderStage">
        {RUNGS.map((rung) => (
          // biome-ignore lint/performance/noImgElement: painted plate, not a content image
          <img
            alt=""
            className="scLadderPlate"
            data-active={active === rung.title ? '' : undefined}
            decoding="async"
            key={rung.plate}
            src={`/media/scale/${rung.plate}.jpg`}
          />
        ))}
      </div>
    </section>
  )
}

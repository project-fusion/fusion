'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ThemeTry } from '@/components/theme-try/theme-try'
import { GRAPH } from '@/content/graph/graph'
import { stageAppearance } from '@/content/verticals/verticals'
import { type Mode, useScopeTheme } from '@/utils/scope-theme/use-scope-theme'
import styles from './graph.module.css'
import { GraphDemo } from './graph-demo'

/**
 * The top of the Graph page, as the top of Maps is: the graph the whole width
 * of the page, what it is over its start, and a bar that re-themes it.
 *
 * **The controls theme a scope, not the graph.** A brand is derived by the
 * same engine the theme builder runs and painted onto the element around the
 * frame, and a mode sets that element's mode, so the frame's list and
 * buttons change with the drawing. The connector hears it the way it hears
 * the site's own theme change, and recolors the notes.
 */
export function GraphHero() {
  const [intro] = GRAPH.blocks
  const scope = useRef<HTMLDivElement>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('site')
  /* Whether thoughts pass between the notes, which the bar's last control
     pauses: anything that moves by itself beside the rest of a page needs a
     way to stop it. */
  const [passing, setPassing] = useState(true)
  /* A reader who asked for less motion sees each thought as its link lit for
     a moment, which is not motion to pause. */
  const [still, setStill] = useState(false)
  useEffect(() => {
    setStill(matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])
  useScopeTheme(scope, { brand, mode })

  return (
    <div className={styles.graphHero} ref={scope}>
      {/* **The pitch, set on the graph's ground**: the site's hero type at
          the start, the drawing clear of it to the end. First in the reading
          order, before the graph it is about. */}
      <div className={styles.graphIntro}>
        <helix-flex align-items="center" data-density="sm" gap="xs">
          <helix-tag>Helix</helix-tag>
          <helix-tag tone={stageAppearance('Building')}>Building</helix-tag>
        </helix-flex>
        <helix-text as="h1" class={styles.graphTitle}>
          {intro?.title}
        </helix-text>
        <helix-text as="p" class={styles.graphLede} data-measure emphasis="muted">
          {intro?.body?.[0]}
        </helix-text>
        <helix-flex class={`siteActions ${styles.graphActions}`} data-density="lg" gap="sm" wrap>
          <Link data-button="solid" data-button-tone="primary" href="#get-started">
            Get started
          </Link>
          <Link data-button="subtle" href="/helix/theme">
            Build your theme
          </Link>
        </helix-flex>
      </div>
      {/* **A mind on a model of a brain**, each region in its lobe, with
          thoughts passing between its notes: the three things the page goes
          on to show, in one graph. */}
      <GraphDemo
        canvasClassName={styles.graphHeroCanvas}
        className={styles.graphHeroFrame}
        kind="mind"
        paused={!passing}
      />
      <ThemeTry
        brand={brand}
        className={styles.graphTry}
        label="Customize the graph"
        mode={mode}
        onBrand={setBrand}
        onMode={setMode}
      >
        {still ? null : (
          <helix-toggle-group
            label="Thoughts"
            onChange={(event) => setPassing(event.currentTarget.value === 'passing')}
            value={passing ? 'passing' : 'paused'}
          >
            <helix-toggle value="passing">Passing</helix-toggle>
            <helix-toggle value="paused">Paused</helix-toggle>
          </helix-toggle-group>
        )}
      </ThemeTry>
    </div>
  )
}

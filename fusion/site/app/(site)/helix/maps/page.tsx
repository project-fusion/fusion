import { GOOGLE_FACES } from '@/content/faces/faces.generated'
import { MAP_STACK, MAPS } from '@/content/maps/maps'
import { stageAppearance } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import { type Params, queryFrom, settingsFrom } from '@/utils/theme-defaults/theme-defaults'
import { serverTheme } from '@/utils/theme-engine/theme-engine.server'
import styles from './maps.module.css'
import { MapsHero } from './maps-hero'
import { mapIntent, propertiesOf } from './maps-theme'

export const metadata = pageMetadata({
  description: MAPS.lede,
  path: '/helix/maps',
  title: MAPS.title,
})

/**
 * Maps, a part of Helix at a real address under it.
 *
 * **A page rather than a component's example**, because what is being shown
 * is more than a component: a frame, a connector, a style and, later, tiles
 * and layers. `/helix/components/map` stays the frame's reference.
 *
 * **The parts are a stack, not a grid of cards.** They are layers, each
 * resting on the one under it, and a grid read them as five features of equal
 * standing, with the one part that is somebody else's missing altogether.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const [, stack] = MAPS.blocks
  /* **A theme the builder sent, derived here so it is in the first paint.**
     The link carries the builder's own query, read by the builder's own
     `settingsFrom`, so every value is validated the same way and falls back
     on its own. Written back out by `queryFrom`, which keeps only departures
     from what ships: a link that carried nothing a theme is made of, or only
     values it refused, is a page with no sent theme rather than one showing
     the shipped defaults as though somebody had chosen them. */
  const settings = settingsFrom(await searchParams, GOOGLE_FACES)
  const query = queryFrom(settings)
  const sent = query ? { query, settings } : undefined
  const painted = sent
    ? propertiesOf((await serverTheme()).derive(mapIntent(settings, settings.scheme)))
    : undefined
  return (
    <>
      <MapsHero painted={painted} sent={sent} />
      <helix-flex class={styles.mapsShell} data-shell direction="column" gap="lg">
        <helix-flex direction="column" gap="xs">
          <helix-text as="h2" variant="title">
            {stack?.title}
          </helix-text>
          {stack?.body?.map((line) => (
            <helix-text emphasis="muted" key={line}>
              {line}
            </helix-text>
          ))}
        </helix-flex>
        <ol className={styles.mapsStack}>
          {MAP_STACK.map((layer) => (
            <li
              className={styles.mapsLayer}
              data-owned={layer.owner ? 'false' : 'true'}
              key={layer.title}
            >
              <helix-text class={styles.mapsLayerRole} emphasis="subtle" variant="caption">
                {layer.role}
              </helix-text>
              <div className={styles.mapsLayerText}>
                <helix-text as="h3" variant="title">
                  {layer.title}
                </helix-text>
                <helix-text emphasis="muted">{layer.body}</helix-text>
              </div>
              <helix-tag
                class={styles.mapsLayerStage}
                tone={layer.stage ? stageAppearance(layer.stage) : 'neutral'}
              >
                {layer.stage ?? layer.owner}
              </helix-tag>
            </li>
          ))}
        </ol>
      </helix-flex>
    </>
  )
}

import { MAP_STACK, MAPS } from '@/content/maps/maps'
import { stageAppearance } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import styles from './maps.module.css'
import { MapsHero } from './maps-hero'

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
export default function Page() {
  const [, stack] = MAPS.blocks
  return (
    <>
      <MapsHero />
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

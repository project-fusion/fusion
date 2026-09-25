import { MAP_PARTS, MAPS } from '@/content/maps/maps'
import { stageAppearance } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import styles from './maps.module.css'
import { MapsDemo } from './maps-demo'

export const metadata = pageMetadata({
  description: MAPS.lede,
  path: '/helix/maps',
  title: MAPS.title,
})

/** The parts in a band, each with the stage it is at. */
function Parts({ declared, title }: { declared: boolean; title: string | undefined }) {
  return (
    <helix-flex direction="column" gap="md">
      <helix-text as="h2" variant="title">
        {title}
      </helix-text>
      <helix-grid columns={3} gap="lg" min="18rem">
        {MAP_PARTS.filter((part) => (part.stage === 'Declared') === declared).map((part) => (
          <helix-card key={part.title} separation="outlined">
            <helix-flex align-items="center" gap="sm" justify-content="between" slot="header">
              <helix-text as="h3" variant="title">
                {part.title}
              </helix-text>
              <helix-tag tone={stageAppearance(part.stage)}>{part.stage}</helix-tag>
            </helix-flex>
            <helix-text emphasis="muted">{part.body}</helix-text>
          </helix-card>
        ))}
      </helix-grid>
    </helix-flex>
  )
}

/**
 * Maps, a part of Helix at a real address under it.
 *
 * **A page rather than a component's example**, because what is being shown
 * is more than a component: a frame, a connector, a style and, later, tiles
 * and layers. `/helix/components/map` stays the frame's reference.
 *
 * **Built and next are two bands rather than one grid of five**, which at
 * three columns left the last two on a row of their own and read the two
 * that are not started as the same kind of thing as the three that are.
 */
export default function Page() {
  const [map, built, next] = MAPS.blocks
  return (
    <helix-flex class={styles.mapsShell} data-shell direction="column" gap="xl">
      <helix-flex direction="column" gap="sm">
        <helix-flex align-items="center" data-density="sm" gap="xs">
          <helix-tag>Helix</helix-tag>
          <helix-tag tone={stageAppearance('Building')}>Building</helix-tag>
        </helix-flex>
        <helix-text as="h1">{MAPS.title}</helix-text>
        <helix-text as="p" class={styles.mapsLede} emphasis="muted">
          {MAPS.lede}
        </helix-text>
      </helix-flex>
      <helix-flex direction="column" gap="sm">
        <MapsDemo />
        {map?.body?.map((line) => (
          <helix-text emphasis="subtle" key={line} variant="caption">
            {line}
          </helix-text>
        ))}
      </helix-flex>
      <Parts declared={false} title={built?.title} />
      <Parts declared title={next?.title} />
    </helix-flex>
  )
}

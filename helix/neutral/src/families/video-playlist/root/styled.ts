import { native, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Video Playlist's styled tier.
 *
 * **The player and the list in one grid**, a column by default, which
 * `--video-playlist-layout` sets side by side. The list scrolls past
 * `--video-playlist-size`, capped rather than matched to the player, which is
 * only as tall as it in one arrangement. Print leaves it out.
 */
export default styles(
  root,
  {
    prefix: 'video-playlist',
    hooks: {
      emptyColor: token('color-foreground-muted'),
      emptyPadding: token('space-md'),
      gap: token('space-md'),
      itemsGap: token('space-2xs'),
      layout: '1fr',
      size: '26rem',
    },
    stylesheet: 'video-playlist/root/video-playlist-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ display: 'grid', gap: hook.gap, gridTemplateColumns: hook.layout }),
      /* A phone stacks the player over the list. */
      native([rule({ display: 'flex', flexDirection: 'column' })]),
      rule({ print: true }, { display: 'none' }),
    ]),
    on('items', [
      rule({
        display: 'flex',
        flexDirection: 'column',
        gap: hook.itemsGap,
        maxBlockSize: hook.size,
        overflowY: 'auto',
      }),
    ]),
    on('empty', [
      rule({
        color: hook.emptyColor,
        fontSize: token('text-sm'),
        padding: hook.emptyPadding,
        textAlign: 'center',
      }),
    ]),
  ],
)

import { native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import menu from './headless.js'

/**
 * Video Playlist Menu's styled tier.
 *
 * **A control on the bar like the player's own**: its trigger a glyph in a
 * box the size of a loose icon, in the bar's color. Each row leads with its
 * poster, a sixteen by nine still twice a loose icon wide.
 */
export default styles(
  menu,
  {
    prefix: 'video-playlist-menu',
    hooks: {
      color: 'inherit',
      poster: product(token('size-icon-loose'), 2),
      size: token('size-icon-tight'),
    },
    stylesheet: 'video-playlist/menu/video-playlist-menu.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [rule({ display: 'flex', flex: [0, 0, 'auto'] })]),
    on('trigger', [
      web([rule({ all: 'unset' })]),
      rule({
        '--icon-size': hook.size,
        alignItems: 'center',
        borderRadius: token('radii-sm'),
        boxSizing: 'border-box',
        color: hook.color,
        display: 'flex',
        flex: [0, 0, 'auto'],
        justifyContent: 'center',
        minBlockSize: token('size-icon-loose'),
        minInlineSize: token('size-icon-loose'),
        web: { cursor: 'pointer' },
      }),
      web([
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
    ]),
    on('trigger-mark', [
      native([
        rule({
          blockSize: hook.size,
          color: token('color-foreground'),
          inlineSize: hook.size,
        }),
      ]),
    ]),
    on('entry', [rule({ '--menu-item-start': hook.poster })]),
    /* Written out: a row's own part inside the menu row it draws. */
    on({ part: 'entry', selector: ':host [part="entry"]::part(item)' }, [
      web([rule({ paddingBlock: token('space-2xs') })]),
    ]),
    on('poster', [
      rule({
        aspectRatio: '16 / 9',
        borderRadius: token('radii-sm'),
        display: 'block',
        inlineSize: '100%',
        objectFit: 'cover',
      }),
    ]),
  ],
)

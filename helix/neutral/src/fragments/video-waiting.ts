import { mix, native, token, web } from '../style.js'
import { fragment } from '../table.js'

/** The ring turns at Loader's own pace, so two spinners on one page agree. */
const SPIN = '0.8s'

/**
 * Video's messages over the picture while it waits for data and once it
 * fails, in the middle of the picture, the loading one with a ring that
 * turns, and holds still where the reader asked for less motion. The web draws
 * the ring on the message, and a phone in a box of its own. Video's table
 * takes them in where they stand in its cascade, and declares `video-spin`.
 */
export default fragment(
  'video-waiting',
  { parts: ['failure', 'loading', 'loading-ring'] },
  ({ on, rule }) => [
    on(
      ['loading', 'failure'],
      [
        rule({
          alignItems: 'center',
          backgroundColor: mix(token('color-surface-media'), 72, 'transparent'),
          borderRadius: token('radii-md'),
          color: token('color-foreground-media'),
          display: 'flex',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          gap: token('space-xs'),
          padding: [token('space-xs'), token('space-sm')],
          position: 'absolute',
        }),
        web([
          rule({ insetBlockStart: '50%', insetInlineStart: '50%', translate: ['-50%', '-50%'] }),
        ]),
        native([rule({ flexDirection: 'row' })]),
      ],
    ),
    /* The ring that turns, on the message, still where the reader asked for less motion. */
    on({ before: 'loading' }, [
      web([
        rule({
          animation: ['video-spin', SPIN, 'linear', 'infinite'],
          blockSize: token('size-icon-tight'),
          border: [
            token('border-thick'),
            'solid',
            mix(token('color-foreground-media'), 30, 'transparent'),
          ],
          borderBlockStartColor: token('color-foreground-media'),
          borderRadius: token('radii-full'),
          content: '""',
          flex: [0, 0, 'auto'],
          inlineSize: token('size-icon-tight'),
        }),
        rule({ reducedMotion: true }, { animation: 'none' }),
      ]),
    ]),
    on('loading-ring', [
      native([
        rule({
          animation: ['video-spin', SPIN, 'linear', 'infinite'],
          blockSize: token('size-icon-tight'),
          borderColor: mix(token('color-foreground-media'), 30, 'transparent'),
          borderStyle: 'solid',
          borderBlockStartColor: token('color-foreground-media'),
          borderWidth: token('border-thick'),
          borderRadius: token('radii-full'),
          inlineSize: token('size-icon-tight'),
        }),
        rule({ reducedMotion: true }, { animation: 'none' }),
      ]),
    ]),
  ],
)

import { mix, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * The private colors each of Icon Button's tones sets, which every rule of
 * its emphases reads. The tones are Button's, and an icon button rests in the
 * muted ink, lifting to the full foreground under a pointer. Copy Button,
 * which is drawn with Icon Button's rules, takes them in too.
 */
export default fragment(
  'icon-button-tones',
  {
    parts: [],
    own: [
      'icon-button-crawl',
      'icon-button-edge',
      'icon-button-fill',
      'icon-button-fill-hover',
      'icon-button-ink',
      'icon-button-ink-hover',
      'icon-button-on-tone',
      'icon-button-tone',
      'icon-button-tone-hover',
      'icon-button-turn',
    ],
    props: ['tone'],
  },
  ({ on, own, rule }) => [
    on('host', [
      rule({
        own: {
          iconButtonEdge: token('color-border'),
          /* Loader's own turn and crawl, so two rings on one page agree. */
          iconButtonCrawl: '4s',
          iconButtonTurn: '0.8s',
          iconButtonInk: token('color-foreground-muted'),
          iconButtonInkHover: token('color-foreground'),
          /* The solid fill is separate from the tone, and it has to be. One
             value for both put this control's glyph at 3.20 against its own fill
             on the contact page, while the Button sharing its edge sat at 6.44. */
          iconButtonFill: own.iconButtonTone,
          iconButtonFillHover: own.iconButtonToneHover,
          iconButtonOnTone: token('color-background'),
          iconButtonTone: token('color-foreground'),
          iconButtonToneHover: mix(token('color-foreground'), 86, token('color-background')),
        },
      }),
      rule(
        { tone: 'primary' },
        {
          own: {
            iconButtonEdge: token('color-primary'),
            iconButtonInk: token('color-primary'),
            iconButtonInkHover: token('color-primary'),
            iconButtonFill: token('color-primary-surface'),
            iconButtonFillHover: token('color-primary-surface-hover'),
            iconButtonOnTone: token('color-foreground-on-primary'),
            iconButtonTone: token('color-primary'),
            iconButtonToneHover: token('color-primary-hover'),
          },
        },
      ),
      rule(
        { tone: 'accent' },
        {
          own: {
            iconButtonEdge: token('color-accent'),
            iconButtonInk: token('color-accent'),
            iconButtonInkHover: token('color-accent'),
            iconButtonFill: token('color-accent-surface'),
            iconButtonFillHover: token('color-accent-surface-hover'),
            iconButtonOnTone: token('color-foreground-on-accent'),
            iconButtonTone: token('color-accent'),
            iconButtonToneHover: token('color-accent-hover'),
          },
        },
      ),
      rule(
        { tone: 'danger' },
        {
          own: {
            iconButtonEdge: token('color-danger'),
            iconButtonInk: token('color-danger'),
            iconButtonInkHover: token('color-danger'),
            iconButtonFill: token('color-danger-surface'),
            iconButtonFillHover: token('color-danger-surface-hover'),
            iconButtonOnTone: token('color-foreground-on-status'),
            iconButtonTone: token('color-danger'),
            iconButtonToneHover: mix(token('color-danger'), 86, token('color-foreground')),
          },
        },
      ),
    ]),
  ],
)

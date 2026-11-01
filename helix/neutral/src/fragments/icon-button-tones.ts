import { mix, scheme, token } from '../style.js'
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
    own: {
      iconButtonCrawl: null,
      iconButtonEdge: null,
      iconButtonFill: null,
      iconButtonFillHover: null,
      iconButtonInk: null,
      iconButtonInkHover: null,
      iconButtonOnTone: null,
      iconButtonTone: null,
      iconButtonToneHover: null,
      iconButtonTurn: null,
    },
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
          /* Two whole colors, since a scheme is not valid in a percentage. Each
             moves at least 1.3:1 from rest, from a fill with nothing past it. */
          iconButtonToneHover: scheme(
            mix(token('color-foreground'), 72, token('color-background')),
            mix(token('color-foreground'), 90, token('color-background')),
          ),
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
      rule(
        { tone: 'info' },
        {
          own: {
            iconButtonEdge: token('color-info'),
            iconButtonInk: token('color-info'),
            iconButtonInkHover: token('color-info'),
            iconButtonFill: token('color-info-surface'),
            iconButtonFillHover: token('color-info-surface-hover'),
            iconButtonOnTone: token('color-foreground-on-status'),
            iconButtonTone: token('color-info'),
            iconButtonToneHover: mix(token('color-info'), 86, token('color-foreground')),
          },
        },
      ),
      rule(
        { tone: 'success' },
        {
          own: {
            iconButtonEdge: token('color-success'),
            iconButtonInk: token('color-success'),
            iconButtonInkHover: token('color-success'),
            iconButtonFill: token('color-success-surface'),
            iconButtonFillHover: token('color-success-surface-hover'),
            iconButtonOnTone: token('color-foreground-on-status'),
            iconButtonTone: token('color-success'),
            iconButtonToneHover: mix(token('color-success'), 86, token('color-foreground')),
          },
        },
      ),
      rule(
        { tone: 'warning' },
        {
          own: {
            iconButtonEdge: token('color-warning'),
            iconButtonInk: token('color-warning'),
            iconButtonInkHover: token('color-warning'),
            iconButtonFill: token('color-warning-surface'),
            iconButtonFillHover: token('color-warning-surface-hover'),
            iconButtonOnTone: token('color-foreground-on-status'),
            iconButtonTone: token('color-warning'),
            iconButtonToneHover: mix(token('color-warning'), 86, token('color-foreground')),
          },
        },
      ),
    ]),
  ],
)

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
    own: {
      iconButtonCrawl: null,
      iconButtonEdge: null,
      iconButtonFill: null,
      iconButtonFillHover: null,
      iconButtonFillPress: null,
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
          /* Loader's own turn and crawl, the two motion tokens, so two rings on one
             page agree. */
          iconButtonCrawl: token('duration-crawl'),
          iconButtonTurn: token('duration-turn'),
          iconButtonInk: token('color-foreground-muted'),
          iconButtonInkHover: token('color-foreground'),
          /* The solid fill is separate from the tone, and it has to be. One
             value for both put this control's glyph at 3.20 against its own fill
             on the contact page, while the Button sharing its edge sat at 6.44. */
          iconButtonFill: own.iconButtonTone,
          iconButtonFillHover: own.iconButtonToneHover,
          iconButtonFillPress: token('color-neutral-surface-active'),
          iconButtonOnTone: token('color-background'),
          iconButtonTone: token('color-foreground'),
          /* Every hover and press is a token, so Button and the `data-button` recipe
             move the same way. */
          iconButtonToneHover: token('color-neutral-surface-hover'),
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
            iconButtonFillPress: token('color-primary-surface-active'),
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
            iconButtonFillPress: token('color-accent-surface-active'),
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
            iconButtonFillPress: token('color-danger-surface-active'),
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
            iconButtonFillPress: token('color-info-surface-active'),
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
            iconButtonFillPress: token('color-success-surface-active'),
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
            iconButtonFillPress: token('color-warning-surface-active'),
            iconButtonOnTone: token('color-foreground-on-status'),
            iconButtonTone: token('color-warning'),
            iconButtonToneHover: mix(token('color-warning'), 86, token('color-foreground')),
          },
        },
      ),
    ]),
  ],
)

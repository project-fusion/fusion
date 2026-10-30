import {
  difference,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * Toast Item's styled tier.
 *
 * **A floating surface with a shadow and a hairline edge**, at the dense
 * control step, so an action beside the dismiss button is the same height.
 * The tone is the mark and the bar that counts down a timed message, never a
 * fill behind the words, so the words keep their contrast. `info` is drawn in
 * the primary color.
 *
 * **Everything in the first line is centered on it**: the mark, and the
 * dismiss button, which stands out of the flow in the corner, with room kept
 * for it. The actions go on a row of their own under the words.
 *
 * **It arrives from the edge the stack stands along**, and leaves toward it,
 * fading as it moves and taking its place in the stack with it. The bar
 * keeps draining under reduced motion, since it tells how long is left, and
 * stops while the clock is held. **A width of 22rem**, and the whole width of
 * the stack where the stack is narrow, as the stack says.
 *
 * A phone draws nothing of a message once it has faded out, and leaves its
 * place in the stack at once.
 */
export default styles(
  item,
  {
    prefix: 'toast',
    hooks: ({ own }) => ({
      backgroundColor: token('color-surface-overlay'),
      borderColor: token('color-border'),
      borderWidth: token('border-floating'),
      color: token('color-foreground'),
      descriptionColor: token('color-foreground-muted'),
      dismissColor: token('color-foreground-muted'),
      fontSize: token('text-sm'),
      headingWeight: token('weight-semibold'),
      inlineSize: own.toastWidth('22rem'),
      itemPadding: token('space-sm'),
      radius: token('radii-sm'),
      shadow: token('shadow-floating'),
      swipeX: 0,
      swipeY: 0,
      timerSize: token('space-2xs'),
      toneColor: own.toastSeverity(token('color-foreground-muted')),
    }),
    own: {
      toastEnter: null,
      toastGap: null,
      toastLine: null,
      toastMost: null,
      toastSeverity: null,
      toastWidth: null,
    },
    stylesheet: 'toast/item/toast-item.generated.css',
  },
  ({ hook, keyframes, on, own, rule, variants }) => {
    const normal = token('duration-normal')
    const decelerate = token('easing-decelerate')
    const accelerate = token('easing-accelerate')
    const padding = hook.itemPadding
    const tone = hook.toneColor
    const enter = own.toastEnter(token('space-lg'))
    const drain = ['helix-toast-drain', measured('toast-duration', '0ms'), 'linear', 'forwards']
    return [
      on('host', [
        rule({
          '--helix-size-icon': token('size-icon-sm'),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--helix-size-control': token('size-control-sm'),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-control-tight': product(token('size-control'), 0.8),
          own: { toastLine: product(hook.fontSize, token('leading-normal')) },
          display: 'grid',
          web: { gridTemplateRows: 'minmax(0, 1fr)' },
          marginBlockStart: own.toastGap(token('space-xs')),
          transition: list(
            ['grid-template-rows', normal, decelerate],
            ['margin-block-start', normal, decelerate],
            ['opacity', normal, decelerate],
            ['translate', normal, decelerate],
          ),
          inlineSize: hook.inlineSize,
          maxInlineSize: own.toastMost('100%'),
        }),
        native([rule({ maxInlineSize: '100%' })]),
        /* Color on the mark and the bar, never a fill behind the words. */
        variants('tone', {
          danger: { own: { toastSeverity: token('color-danger') } },
          info: { own: { toastSeverity: token('color-primary') } },
          success: { own: { toastSeverity: token('color-success') } },
          warning: { own: { toastSeverity: token('color-warning') } },
        }),
        /* Held back by the stack's `max-visible`, until a message before it goes. */
        rule({ waiting: true }, { display: 'none' }),
        /* Gone, and its place in the stack with it. */
        rule(
          { closed: true },
          {
            web: { gridTemplateRows: 'minmax(0, 0fr)' },
            marginBlockStart: 0,
            opacity: 0,
            translate: [0, enter],
            visibility: 'hidden',
            transition: list(
              ['grid-template-rows', normal, accelerate],
              ['margin-block-start', normal, accelerate],
              ['opacity', normal, accelerate],
              ['translate', normal, accelerate],
              ['visibility', normal, 'step-end'],
            ),
          },
        ),
        /* A phone fades the message out toward the edge, then draws nothing of it. */
        native([
          rule(
            { exiting: true },
            {
              opacity: 0,
              translate: [0, enter],
              transition: list(['opacity', normal, accelerate], ['translate', normal, accelerate]),
            },
          ),
          rule(
            { entering: true },
            {
              transition: list(['opacity', normal, decelerate], ['translate', normal, decelerate]),
            },
          ),
          rule({ startingStyle: true, entering: true }, { opacity: 0 }),
          rule({ closed: true }, { display: 'none' }),
        ]),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      /* Hidden and still laid out while it leaves. A waiting message takes no box. */
      /* Written out: the vocabulary names no value an attribute does not hold beside a state. */
      on(
        {
          part: 'host',
          selector: ':host([hidden]:not([hidden="until-found"], :state(waiting)))',
        },
        [web([rule({ display: 'grid' })])],
      ),
      on('item', [
        rule({
          alignItems: 'start',
          display: 'grid',
          gridTemplateColumns: ['auto', '1fr'],
          backgroundColor: hook.backgroundColor,
          borderRadius: hook.radius,
          border: [hook.borderWidth, 'solid', hook.borderColor],
          boxShadow: hook.shadow,
          boxSizing: 'border-box',
          color: hook.color,
          fontFamily: token('font-sans'),
          fontSize: hook.fontSize,
          lineHeight: token('leading-normal'),
          padding,
          paddingInlineEnd: sum(token('space-sm'), token('size-control'), token('space-2xs')),
          minBlockSize: 0,
          position: 'relative',
          overflow: 'hidden',
        }),
        /* The page's own panning stays on, here and on each part inside, and
           the swipe takes the rest. */
        web([rule({ touchAction: 'pan-y' })]),
        /* A phone lays the mark and the words in a line, and the actions on
           a line of their own under the words, as the web's two columns do. */
        native([rule({ flexWrap: 'wrap' })]),
        /* Under the finger while a swipe moves it, and back to rest as it lets go. */
        rule(
          { part: { 'data-swiping': true } },
          {
            transition: 'none',
            translate: [hook.swipeX, hook.swipeY],
            web: { userSelect: 'none' },
          },
        ),
        /* It arrives from the edge the stack stands along. */
        rule(
          { reducedMotion: false },
          { animation: ['helix-toast-in', normal, decelerate, 'backwards'] },
        ),
        rule(
          { closed: true },
          { paddingBlock: 0, transition: ['padding-block', normal, accelerate] },
        ),
        rule({ reducedMotion: true }, { animation: 'none' }),
        rule({ reducedMotion: true, closed: true }, { transition: 'none' }),
      ]),
      /* The mark, centered on the first line, with its own gap after it. */
      on('icon', [
        rule({
          color: tone,
          display: 'inline-flex',
          gridArea: '1 / 1',
          marginInlineEnd: token('space-sm'),
          marginBlockStart: quotient(difference(own.toastLine, token('size-icon')), 2),
        }),
        web([rule({ touchAction: 'pan-y' })]),
      ]),
      on('icon-mark', [rule({ blockSize: token('size-icon'), inlineSize: token('size-icon') })]),
      /* A mark passed in is sized like the tone's. */
      on({ region: 'icon', slotted: '*' }, [
        rule({
          '--icon-size': token('size-icon'),
          blockSize: token('size-icon'),
          inlineSize: token('size-icon'),
        }),
      ]),
      on('content', [
        rule({ gridArea: '1 / 2', minInlineSize: 0 }),
        /* Never quite nothing wide, so the actions' whole line never fits
           beside it, and they wrap under it with no mark before it too. */
        native([rule({ flex: '1 1 0', minInlineSize: 1 })]),
        web([rule({ touchAction: 'pan-y' })]),
      ]),
      /* A block holding the words lays them out as the region does, and keeps the swipe. */
      on({ part: 'content', inner: '> slot' }, [
        web([rule({ display: 'block', touchAction: 'pan-y' })]),
      ]),
      /* A title in a heavier weight, and a line of detail quieter under it. */
      on({ region: 'heading', slotted: '*' }, [
        rule({ display: 'block', fontWeight: hook.headingWeight }),
      ]),
      on({ region: 'description', slotted: '*' }, [
        rule({
          color: hook.descriptionColor,
          display: 'block',
        }),
      ]),
      /* The actions' own row, in the words' column. */
      on('actions', [
        rule({ display: 'flex', gap: token('space-2xs'), gridArea: '2 / 2' }),
        native([
          rule({ flexBasis: '100%' }),
          rule(
            { tone: ['danger', 'info', 'success', 'warning'] },
            { paddingInlineStart: sum(token('size-icon'), token('space-sm')) },
          ),
        ]),
        web([rule({ touchAction: 'pan-y' })]),
      ]),
      on({ region: 'actions', slotted: '*' }, [rule({ marginBlockStart: token('space-xs') })]),
      /* The close, in the corner and out of the flow, centered on the first line. */
      on('dismiss', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          boxSizing: 'border-box',
          position: 'absolute',
          insetBlockStart: sum(
            padding,
            quotient(difference(own.toastLine, token('size-control')), 2),
          ),
          insetInlineEnd: token('space-sm'),
          blockSize: token('size-control'),
          borderRadius: token('radii-sm'),
          color: hook.dismissColor,
          display: 'inline-flex',
          flex: '0 0 auto',
          inlineSize: token('size-control'),
          placeContent: 'center',
          placeItems: 'center',
          transition: ['color', token('duration-fast'), token('easing-standard')],
        }),
        web([rule({ touchAction: 'pan-y' })]),
        rule(
          { hover: true },
          {
            backgroundColor: mix(token('color-foreground'), 8, 'transparent'),
            color: token('color-foreground'),
          },
        ),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      on('dismiss-mark', [rule({ blockSize: token('size-icon'), inlineSize: token('size-icon') })]),
      /* How long is left, along the top edge and edge to edge, clipped to the corners. */
      on('timer', [
        rule({
          animation: drain,
          backgroundColor: tone,
          blockSize: hook.timerSize,
          insetBlockStart: 0,
          insetInline: 0,
          position: 'absolute',
          transformOrigin: '0 50%',
        }),
        web([rule({ touchAction: 'pan-y' })]),
        rule({ dir: 'rtl' }, { transformOrigin: '100% 50%' }),
        /* Under reduced motion as well: the bar is the one place that says how long is left. */
        rule({ reducedMotion: true }, { animation: drain }),
        rule({ paused: true }, { animationPlayState: 'paused' }),
      ]),
      keyframes('helix-toast-drain', { to: { scale: '0 1' } }),
      keyframes('helix-toast-in', { from: { opacity: 0, translate: [0, enter] } }),
    ]
  },
)

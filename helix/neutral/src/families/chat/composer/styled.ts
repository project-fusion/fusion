import { fn, list, mix, native, product, quotient, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import composer from './headless.js'

const FIELD_INSET = sum(
  token('space-sm'),
  product(token('space-xs'), '-1'),
  product(token('border-thin'), '-1'),
)

const STEP_DOWN = {
  '--helix-size-control': token('size-control-sm'),
  '--helix-size-control-loose': product(token('size-control'), '1.2'),
  '--helix-size-control-tight': product(token('size-control'), '0.8'),
  '--helix-size-icon': token('size-icon-sm'),
  '--helix-size-icon-loose': product(token('size-icon'), '1.2'),
  '--helix-size-icon-tight': product(token('size-icon'), '0.8'),
} as const

/**
 * Chat Composer's styled tier: one box with one edge, holding what the draft
 * carries, the field, and a row of tools.
 *
 * **The field owns no edge and no ground**: it is the inside of the box, and its
 * inline padding tops the box's inset up to a bubble's, so the caret starts where a
 * bubble's words do.
 *
 * **The send button is `Button`'s ghost, value for value**, so it lights up as the
 * tools beside it do, and a notch inside their step, since it sits inside a control.
 *
 * **Under `glow` a light runs once around the edge as focus arrives**, and a steady
 * edge stands in for the ring. The element's script moves the light at one speed.
 * That is the web's, as the rolling examples are, each a second field placed on the
 * field's own box by anchor positioning.
 */
export default styles(
  composer,
  {
    prefix: 'chat-composer',
    hooks: {
      backgroundColor: token('color-surface'),
      borderWidth: token('border-thin'),
      glowColor: token('color-primary'),
      maxBlockSize: '12rem',
    },
    own: {
      chatComposerBloom: null,
      chatComposerBloomIn: null,
      chatComposerBloomInto: null,
      chatComposerBloomOut: null,
      chatComposerHeld: null,
      chatComposerLightX: null,
      chatComposerLightY: null,
      chatComposerReachX: null,
      chatComposerReachY: null,
    },
    stylesheet: 'chat/composer/chat-composer.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      web([
        rule(
          { glow: true, invalid: true },
          { '--chat-composer-glow-color': token('color-danger') },
        ),
      ]),
    ]),
    on('composer', [
      rule({
        backgroundColor: hook.backgroundColor,
        border: [hook.borderWidth, 'solid', token('color-border')],
        borderRadius: token('radii-md'),
        display: 'grid',
        gap: token('space-2xs'),
        padding: token('space-xs'),
      }),
      native([rule({ display: 'flex', flexDirection: 'column' })]),
      rule(
        { focusWithin: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: 0,
        },
      ),
      rule(
        { invalid: true },
        { borderColor: token('color-danger'), outlineColor: token('color-danger') },
      ),
    ]),
    /* Under `glow`, the steady edge comes in behind the light, a beat later, so the
       light is seen traveling. */
    on('composer', [
      web([
        rule(
          { glow: true },
          {
            own: {
              chatComposerReachX: '5rem',
              chatComposerReachY: '2.5rem',
            },
            position: 'relative',
            transition: ['box-shadow', token('duration-normal'), token('easing-standard')],
          },
        ),
        rule(
          { focusWithin: true, glow: true },
          {
            boxShadow: list(
              ['0', '0', '0', token('border-thin'), mix(hook.glowColor, 60, 'transparent')],
              ['0', '0', '1.25rem', '-0.25rem', mix(hook.glowColor, 45, 'transparent')],
            ),
            outline: 'none',
            transition: [
              'box-shadow',
              token('duration-slow'),
              token('easing-standard'),
              token('duration-normal'),
            ],
          },
        ),
        rule({ focusWithin: true, glow: true, reducedMotion: true }, { transitionDelay: '0s' }),
        rule(
          { focusWithin: true, forcedColors: true, glow: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: 0,
          },
        ),
      ]),
    ]),
    /* The light is a soft spot cut to a ring by two masks, so it follows whatever
       radius the box has. The element's script moves it. */
    on({ before: 'composer' }, [
      web([
        rule(
          { glow: true },
          {
            background: fn(
              'radial-gradient',
              [
                fn('min', '5rem', own.chatComposerReachX),
                fn('min', '2.5rem', own.chatComposerReachY),
                'at',
                own.chatComposerLightX('0px'),
                own.chatComposerLightY('0px'),
              ],
              mix(hook.glowColor, 60, 'white'),
              [hook.glowColor, '35%'],
              'transparent 100%',
            ),
            borderRadius: 'inherit',
            content: '""',
            inset: 0,
            mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
            opacity: 0,
            own: { chatComposerLightX: '0px', chatComposerLightY: '0px' },
            padding: token('border-thick'),
            pointerEvents: 'none',
            position: 'absolute',
          },
        ),
      ]),
    ]),
    /* The light's bloom across the edge, faded at both sides: the fade out of the
       box on each axis, intersected with the union of the fades into it. */
    on({ after: 'composer' }, [
      web([
        rule(
          { glow: true },
          {
            background: fn(
              'radial-gradient',
              [
                fn('min', '5rem', own.chatComposerReachX),
                fn('min', '2.5rem', own.chatComposerReachY),
                'at',
                sum(own.chatComposerLightX('0px'), own.chatComposerBloom),
                sum(own.chatComposerLightY('0px'), own.chatComposerBloom),
              ],
              mix(hook.glowColor, 70, 'transparent'),
              'transparent 100%',
            ),
            content: '""',
            inset: product(own.chatComposerBloom, '-1'),
            mask: list(
              fn('linear-gradient', 'to right', own.chatComposerBloomOut),
              fn('linear-gradient', 'to bottom', own.chatComposerBloomOut),
              fn('linear-gradient', 'to right', own.chatComposerBloomInto),
              fn('linear-gradient', 'to bottom', own.chatComposerBloomInto),
            ),
            maskComposite: 'intersect, intersect, add, add',
            opacity: 0,
            own: {
              chatComposerBloom: token('space-sm'),
              chatComposerBloomIn: token('space-xs'),
              chatComposerBloomInto: list(
                ['#000', own.chatComposerBloom],
                [
                  'rgb(0 0 0 / 0.45)',
                  sum(own.chatComposerBloom, quotient(own.chatComposerBloomIn, '3')),
                ],
                ['transparent', sum(own.chatComposerBloom, own.chatComposerBloomIn)],
                [
                  'transparent',
                  sum(
                    '100%',
                    product(own.chatComposerBloom, '-1'),
                    product(own.chatComposerBloomIn, '-1'),
                  ),
                ],
                [
                  'rgb(0 0 0 / 0.45)',
                  sum(
                    '100%',
                    product(own.chatComposerBloom, '-1'),
                    product(quotient(own.chatComposerBloomIn, '3'), '-1'),
                  ),
                ],
                ['#000', sum('100%', product(own.chatComposerBloom, '-1'))],
              ),
              chatComposerBloomOut: list(
                'transparent',
                ['rgb(0 0 0 / 0.25)', quotient(own.chatComposerBloom, '3')],
                ['rgb(0 0 0 / 0.6)', product(quotient(own.chatComposerBloom, '3'), '2')],
                ['#000', own.chatComposerBloom],
                ['#000', sum('100%', product(own.chatComposerBloom, '-1'))],
                [
                  'rgb(0 0 0 / 0.6)',
                  sum('100%', product(quotient(own.chatComposerBloom, '3'), '-2')),
                ],
                [
                  'rgb(0 0 0 / 0.25)',
                  sum('100%', product(quotient(own.chatComposerBloom, '3'), '-1')),
                ],
                'transparent',
              ),
              chatComposerLightX: '0px',
              chatComposerLightY: '0px',
            },
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: token('layer-beneath'),
          },
        ),
      ]),
    ]),
    on('feedback', [
      rule({
        color: token('color-danger'),
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontWeight: token('weight-medium'),
        lineHeight: token('leading-normal'),
        margin: token('space-none'),
        marginBlockStart: token('space-2xs'),
      }),
    ]),
    on('field', [
      rule({
        backgroundColor: 'transparent',
        border: 'none',
        color: token('color-foreground'),
        fontFamily: token('font-sans'),
        fontSize: web(fn('max', token('text-field-min'), token('text-sm'))),
        lineHeight: token('leading-normal'),
        maxBlockSize: hook.maxBlockSize,
        paddingBlock: token('space-2xs'),
        paddingInline: FIELD_INSET,
        web: { fieldSizing: 'content', resize: 'none' },
      }),
      native([rule({ fontSize: token('text-sm') })]),
      web([rule({ focusVisible: true }, { outline: 'none' })]),
    ]),
    /* The examples under `placeholders` roll into each other: a second field placed
       on the field's box, whose own placeholder turns transparent behind it and stays
       the one a screen reader hears. Without anchor positioning, the field's own
       placeholder fades from one example to the next. */
    on('composer', [web([rule({ supports: '(anchor-name: --a)' }, { position: 'relative' })])]),
    on('field', [
      web([
        rule(
          { supports: '(anchor-name: --a)' },
          {
            anchorName: '--_chat-composer-field',
            minBlockSize: own.chatComposerHeld,
            own: { chatComposerHeld: 'auto' },
          },
        ),
      ]),
    ]),
    /* Written out: the vocabulary names no sibling and no `:placeholder-shown`. */
    on({ part: 'field', selector: '[part="field"]:has(+ [part~="example"])::placeholder' }, [
      web([rule({ supports: '(anchor-name: --a)' }, { color: 'transparent' })]),
    ]),
    on('example', [
      web([
        rule(
          { supports: '(anchor-name: --a)' },
          {
            backgroundColor: 'transparent',
            blockSize: 'anchor-size(--_chat-composer-field block)',
            border: 'none',
            color: token('color-foreground'),
            fieldSizing: 'fixed',
            fontFamily: token('font-sans'),
            fontSize: fn('max', token('text-field-min'), token('text-sm')),
            inlineSize: 'anchor-size(--_chat-composer-field inline)',
            insetBlockStart: 'anchor(--_chat-composer-field start)',
            insetInlineStart: 'anchor(--_chat-composer-field start)',
            lineHeight: token('leading-normal'),
            margin: token('space-none'),
            overflow: 'hidden',
            paddingBlock: token('space-2xs'),
            paddingInline: FIELD_INSET,
            pointerEvents: 'none',
            position: 'absolute',
            resize: 'none',
          },
        ),
        rule({ supports: 'not (anchor-name: --a)' }, { display: 'none' }),
      ]),
    ]),
    /* Written out: the vocabulary names no sibling and no `:placeholder-shown`. */
    on(
      { part: 'example', selector: '[part="field"]:not(:placeholder-shown) ~ [part~="example"]' },
      [web([rule({ supports: '(anchor-name: --a)' }, { visibility: 'hidden' })])],
    ),
    on('example-leaving', [
      web([
        rule(
          { supports: '(anchor-name: --a)' },
          {
            animation: [
              'helix-composer-example-out',
              product(token('duration-normal'), '1.25'),
              token('easing-standard'),
              'forwards',
            ],
          },
        ),
        rule({ reducedMotion: true, supports: '(anchor-name: --a)' }, { animation: 'none' }),
      ]),
    ]),
    /* Written out: the entrance is the example that is not leaving. */
    on(
      {
        part: 'example',
        selector:
          ':host(:state(example-entering)) [part~="example"]:not([part~="example-leaving"])',
      },
      [
        web([
          rule(
            { supports: '(anchor-name: --a)' },
            {
              animation: [
                'helix-composer-example-in',
                token('duration-slow'),
                token('easing-standard'),
              ],
            },
          ),
          rule({ reducedMotion: true, supports: '(anchor-name: --a)' }, { animation: 'none' }),
        ]),
      ],
    ),
    /* Written out: the field's own placeholder, by a state of the host. */
    on({ part: 'field', selector: '[part="field"]::placeholder' }, [
      web([
        rule(
          { supports: 'not (anchor-name: --a)' },
          { transition: ['opacity', token('duration-fast'), token('easing-standard')] },
        ),
      ]),
    ]),
    on({ part: 'field', selector: ':host(:state(example-leaving)) [part="field"]::placeholder' }, [
      web([rule({ supports: 'not (anchor-name: --a)' }, { opacity: 0 })]),
    ]),
    on('attachments', [
      rule({
        ...STEP_DOWN,
        alignItems: 'flex-start',
        display: 'flex',
        flexWrap: 'wrap',
        gap: token('space-xs'),
        minInlineSize: 0,
        paddingBlockStart: FIELD_INSET,
        paddingInline: FIELD_INSET,
      }),
      native([rule({ flexDirection: 'row' })]),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    on({ placeholder: 'field' }, [native([rule({ color: token('color-foreground-muted') })])]),
    on('tools', [
      rule({
        alignItems: 'center',
        display: 'flex',
        gap: token('space-2xs'),
        justifyContent: 'flex-end',
      }),
      native([rule({ flexDirection: 'row' })]),
    ]),
    on(
      ['start', 'end'],
      [
        rule({ ...STEP_DOWN, alignItems: 'center', display: 'flex', gap: token('space-2xs') }),
        native([rule({ flexDirection: 'row' })]),
      ],
    ),
    on('start', [rule({ marginInlineEnd: 'auto' })]),
    on('end', [rule({ marginInlineEnd: token('space-2xs') })]),
    on(['start', 'end'], [rule({ part: { 'data-empty': true } }, { display: 'none' })]),
    on(
      ['send', 'voice'],
      [
        rule({
          alignItems: 'center',
          backgroundColor: 'transparent',
          blockSize: sum(token('size-control-tight'), product(token('space-2xs'), '-1')),
          border: 'none',
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          display: 'inline-flex',
          inlineSize: sum(token('size-control-tight'), product(token('space-2xs'), '-1')),
          justifyContent: 'center',
          padding: token('space-none'),
          web: { cursor: 'pointer' },
        }),
        rule(
          { disabled: false, hover: true },
          {
            backgroundColor: mix(token('color-foreground'), 8, 'transparent'),
            color: token('color-foreground'),
          },
        ),
        rule({ disabled: true }, { opacity: 0.5, web: { cursor: 'not-allowed' } }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ],
    ),
    on('send', [
      web([
        rule({
          animation: ['helix-composer-swap', token('duration-fast'), token('easing-standard')],
        }),
        rule({ reducedMotion: true }, { animation: 'none' }),
      ]),
    ]),
    on('mark', [
      rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') }),
    ]),
    on({ part: 'voice', inner: 'svg' }, [
      web([rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') })]),
    ]),
    on('idle', [
      rule({ alignItems: 'center', display: 'inline-flex' }),
      web([
        rule({
          animation: ['helix-composer-swap', token('duration-fast'), token('easing-standard')],
        }),
        rule({ reducedMotion: true }, { animation: 'none' }),
      ]),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    keyframes('helix-composer-swap', { from: { opacity: 0 } }),
    keyframes('helix-composer-example-out', {
      to: { filter: 'blur(0.125em)', opacity: 0, translate: '0 -0.35em' },
    }),
    keyframes('helix-composer-example-in', { from: { opacity: 0, translate: '0 0.35em' } }),
  ],
)

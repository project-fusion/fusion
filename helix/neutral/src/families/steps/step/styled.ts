import { fit, list, mix, product, sum, token } from '../../../style.js'
import { styles } from '../../../table.js'
import step from './headless.js'

/**
 * A step's styled tier, which writes
 * `helix/styled/src/steps/step/step.generated.css`. Its hooks are the
 * sequence's, `--steps-*`.
 *
 * **A grid of the mark, the name, and what the stage holds**: the mark and
 * the name are a row, and what the stage holds goes under both, on tracks
 * the sequence hands down. A phone lays the same out as a column in a row
 * of steps, and as the mark beside the name down a column.
 *
 * **Two half lines, one either side of the mark**, each from the mark to
 * half the gap past the step's edge, so they meet their neighbors' in the
 * middle of the gap whatever each step measures. The first step draws no
 * line before it and the last none after it.
 *
 * **The mark is an icon, not a box**, and a hue only where its shape
 * already says the state: a tick for done, a dot in a ring for here.
 * Complete wins where a step is both.
 *
 * **The name is a Button on the web**, sized here as a dense control in the
 * step's text. A phone draws it as a press in a ghost button's look: its ink
 * muted ahead and full where the reader is or has been, a wash while a
 * finger holds it, and half the opacity while it is disabled.
 *
 * **The current stage opens what it holds, down a column alone**, and a
 * closed one is out of sight, out of the tab order, and out of what a screen
 * reader reaches.
 */
export default styles(
  step,
  {
    prefix: 'steps',
    hooks: ['complete-color', 'connector-color', 'current-color'],
    own: [
      'step-inset',
      'steps-body-align',
      'steps-body-basis',
      'steps-body-column',
      'steps-body-grow',
      'steps-body-row',
      'steps-columns',
      'steps-content',
      'steps-count',
      'steps-flow',
      'steps-ink-complete',
      'steps-ink-current',
      'steps-lead-block-size',
      'steps-lead-block-start',
      'steps-lead-bottom',
      'steps-lead-end',
      'steps-lead-height',
      'steps-lead-inline-size',
      'steps-lead-inline-start',
      'steps-lead-start',
      'steps-lead-top',
      'steps-lead-width',
      'steps-m',
      'steps-mark',
      'steps-mark-box',
      'steps-marker-color',
      'steps-marker-column',
      'steps-marker-justify',
      'steps-marker-weight',
      'steps-rail-margin',
      'steps-row-gap',
      'steps-trail-block-size',
      'steps-trail-block-start',
      'steps-trail-bottom',
      'steps-trail-end',
      'steps-trail-height',
      'steps-trail-inline-size',
      'steps-trail-inline-start',
      'steps-trail-start',
      'steps-trail-top',
      'steps-trail-width',
    ],
    stylesheet: 'steps/step/step.generated.css',
  },
  ({ hook, on, own, rule }) => [
    /* One inset, read by the name as its padding and by the line under it. */
    on('host', [
      rule({
        alignContent: 'start',
        alignItems: 'start',
        columnGap: token('space-2xs'),
        counterIncrement: 'helix-step',
        display: 'grid',
        flex: [0, 0, 'auto'],
        gridTemplateColumns: own.columns('minmax(0, 1fr)'),
        minInlineSize: 0,
        position: 'relative',
        rowGap: own.rowGap(token('space-2xs')),
        own: { stepInset: token('space-sm') },
      }),
      /* A phone's step is a column in a row of steps, and a row down a column,
         which wraps what the stage holds under the name. */
      rule(
        { platform: 'native' },
        { display: 'flex', flexDirection: own.flow('column'), flexWrap: 'wrap' },
      ),
    ]),
    on({ before: 'host' }, [
      rule({
        backgroundColor: hook.connectorColor(token('color-border')),
        content: '""',
        position: 'absolute',
        zIndex: 0,
      }),
      rule(
        { platform: 'web' },
        {
          blockSize: own.leadBlockSize(token('border-thin')),
          inlineSize: own.leadInlineSize(0),
          insetBlockStart: own.leadBlockStart('50%'),
          insetInlineStart: own.leadInlineStart(0),
        },
      ),
      rule(
        { platform: 'native' },
        {
          blockSize: own.leadHeight(token('border-thin')),
          inlineSize: own.leadWidth('auto'),
          insetBlockStart: own.leadTop(0),
          insetBlockEnd: own.leadBottom('auto'),
          insetInlineStart: own.leadStart(0),
          insetInlineEnd: own.leadEnd('auto'),
          marginInlineEnd: own.railMargin(0),
        },
      ),
      /* Nothing arrives at the first, and nothing leaves the last. */
      rule({ place: 'first' }, { display: 'none' }),
    ]),
    on({ after: 'host' }, [
      rule({
        backgroundColor: hook.connectorColor(token('color-border')),
        content: '""',
        position: 'absolute',
        zIndex: 0,
      }),
      rule(
        { platform: 'web' },
        {
          blockSize: own.trailBlockSize(token('border-thin')),
          inlineSize: own.trailInlineSize(0),
          insetBlockStart: own.trailBlockStart('50%'),
          insetInlineStart: own.trailInlineStart(0),
        },
      ),
      rule(
        { platform: 'native' },
        {
          blockSize: own.trailHeight(token('border-thin')),
          inlineSize: own.trailWidth('auto'),
          insetBlockStart: own.trailTop(0),
          insetBlockEnd: own.trailBottom('auto'),
          insetInlineStart: own.trailStart(0),
          insetInlineEnd: own.trailEnd('auto'),
          marginInlineStart: own.railMargin(0),
        },
      ),
      rule({ place: 'last' }, { display: 'none' }),
    ]),
    /* The square the mark sits in, which down a column is the dense name's
       height, so the glyph centers on the name's first line. */
    on('marker', [
      rule({
        alignItems: 'center',
        gridColumn: own.markerColumn(1),
        gridRow: 1,
        justifySelf: own.markerJustify('center'),
        blockSize: own.markBox(token('size-icon')),
        boxSizing: 'border-box',
        color: own.markerColor(token('color-border')),
        display: 'inline-flex',
        flex: [0, 0, 'auto'],
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontWeight: own.markerWeight(token('weight-semibold')),
        inlineSize: own.markBox(token('size-icon')),
        justifyContent: 'center',
        position: 'relative',
        transition: ['color', token('duration-fast'), token('easing-standard')],
        zIndex: 1,
      }),
      rule({ platform: 'native' }, { alignSelf: own.markerJustify('center') }),
      rule(
        { complete: true },
        {
          color: hook.completeColor(own.inkComplete(token('color-success'))),
          fontWeight: token('weight-semibold'),
        },
      ),
      rule(
        { current: true },
        {
          color: hook.currentColor(own.inkCurrent(token('color-primary'))),
          fontWeight: token('weight-semibold'),
        },
      ),
      rule(
        { complete: true, current: true },
        { color: hook.completeColor(own.inkComplete(token('color-success'))) },
      ),
    ]),
    on({ part: 'marker', inner: 'slot' }, [
      rule(
        { platform: 'web' },
        { alignItems: 'center', display: 'inline-flex', justifyContent: 'center' },
      ),
    ]),
    /* The number, drawn only where the sequence asks for numbers. Under
       `numeric` the glyph is not drawn, so the two never both show. */
    on({ after: 'marker' }, [rule({ content: own.count('none') })]),
    on({ part: 'marker', inner: 'svg' }, [
      rule(
        { platform: 'web' },
        {
          blockSize: own.m(token('size-icon')),
          display: own.mark('inline'),
          flex: [0, 0, 'auto'],
          inlineSize: own.m(token('size-icon')),
        },
      ),
    ]),
    on('mark', [
      rule(
        { platform: 'native' },
        {
          blockSize: own.m(token('size-icon')),
          display: own.mark('flex'),
          inlineSize: own.m(token('size-icon')),
        },
      ),
    ]),
    on({ region: 'marker', slotted: '*' }, [rule({ '--icon-size': own.m(token('size-icon')) })]),
    on('body', [
      rule({
        alignItems: own.bodyAlign('center'),
        gridColumn: own.bodyColumn(1),
        gridRow: own.bodyRow(2),
        display: 'flex',
        flexDirection: 'column',
        minInlineSize: 0,
        position: 'relative',
        zIndex: 1,
      }),
      rule(
        { platform: 'native' },
        {
          alignSelf: 'stretch',
          flexBasis: own.bodyBasis('auto'),
          flexGrow: own.bodyGrow(0),
          flexShrink: 1,
        },
      ),
    ]),
    /* The name: a dense control in the step's text size. Button brings its
       hover, focus ring, and disabled look. */
    on('label', [
      rule({
        '--helix-size-control': token('size-control-sm'),
        '--helix-size-control-loose': product(token('size-control'), 1.2),
        '--helix-size-control-tight': product(token('size-control'), 0.8),
        '--helix-size-icon': token('size-icon-sm'),
        '--helix-size-icon-loose': product(token('size-icon'), 1.2),
        '--helix-size-icon-tight': product(token('size-icon'), 0.8),
        '--helix-space-control': own.stepInset,
        '--helix-text-control': token('text-sm'),
        '--button-foreground-color': token('color-foreground-muted'),
        maxInlineSize: '100%',
      }),
      /* The stage the reader is in reads at full strength, and so does one
         they have been through. */
      rule([{ complete: true }, { current: true }], {
        '--button-foreground-color': token('color-foreground'),
      }),
      rule(
        { platform: 'native' },
        {
          alignItems: 'center',
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          flexDirection: 'row',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          justifyContent: 'center',
          letterSpacing: token('tracking-normal'),
          lineHeight: token('leading-tight'),
          minBlockSize: token('size-control-sm'),
          paddingInline: own.stepInset,
        },
      ),
      rule(
        [
          { complete: true, platform: 'native' },
          { current: true, platform: 'native' },
        ],
        { color: token('color-foreground') },
      ),
      rule(
        { active: true, disabled: false, platform: 'native' },
        { backgroundColor: mix(token('color-foreground'), 8, 'transparent') },
      ),
      rule({ disabled: true, platform: 'native' }, { opacity: 0.5 }),
    ]),
    /* The same inset the name takes as padding, so the two start on one line. */
    on('description', [
      rule({
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        paddingInline: own.stepInset,
      }),
    ]),
    on(['marker', 'description'], [rule({ has: 'disabled' }, { opacity: 0.5 })]),
    /* What the stage holds, in the name's column, from no height to its own
       as the stage opens. */
    on('content', [
      rule({
        display: own.content('none'),
        gridColumn: own.bodyColumn(1),
        gridRow: sum(own.bodyRow(2), 1),
        gridTemplateRows: fit(0),
        paddingInline: own.stepInset,
        transition: list(
          ['grid-template-rows', token('duration-normal'), token('easing-standard')],
          ['visibility', token('duration-normal'), token('easing-standard')],
        ),
        visibility: 'hidden',
      }),
      rule({ current: true }, { gridTemplateRows: fit(1), visibility: 'visible' }),
      /* A phone's stage opens under the name, past the mark, to the measured
         height of what it holds. */
      rule(
        { platform: 'native' },
        {
          flexBasis: '100%',
          paddingInlineStart: sum(own.markBox, token('space-2xs'), own.stepInset),
        },
      ),
    ]),
    on({ part: 'content', inner: '> slot' }, [
      rule({ display: 'block', minBlockSize: 0, overflow: 'hidden' }),
    ]),
  ],
)

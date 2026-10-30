import { fit, list, mix, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import step from './headless.js'

/**
 * A step's styled tier. Its hooks are the
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
    hooks: ({ own }) => ({
      completeColor: own.stepsInkComplete(token('color-success')),
      connectorColor: token('color-border'),
      currentColor: own.stepsInkCurrent(token('color-primary')),
    }),
    own: {
      stepInset: null,
      stepsBodyAlign: null,
      stepsBodyBasis: null,
      stepsBodyColumn: null,
      stepsBodyGrow: null,
      stepsBodyRow: null,
      stepsColumns: null,
      stepsContent: null,
      stepsCount: null,
      stepsFlow: null,
      stepsInkComplete: null,
      stepsInkCurrent: null,
      stepsLeadBlockSize: null,
      stepsLeadBlockStart: null,
      stepsLeadBottom: null,
      stepsLeadEnd: null,
      stepsLeadHeight: null,
      stepsLeadInlineSize: null,
      stepsLeadInlineStart: null,
      stepsLeadStart: null,
      stepsLeadTop: null,
      stepsLeadWidth: null,
      stepsM: null,
      stepsMark: null,
      stepsMarkBox: null,
      stepsMarkerColor: null,
      stepsMarkerColumn: null,
      stepsMarkerJustify: null,
      stepsMarkerWeight: null,
      stepsRailMargin: null,
      stepsRowGap: null,
      stepsTrailBlockSize: null,
      stepsTrailBlockStart: null,
      stepsTrailBottom: null,
      stepsTrailEnd: null,
      stepsTrailHeight: null,
      stepsTrailInlineSize: null,
      stepsTrailInlineStart: null,
      stepsTrailStart: null,
      stepsTrailTop: null,
      stepsTrailWidth: null,
    },
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
        gridTemplateColumns: own.stepsColumns('minmax(0, 1fr)'),
        minInlineSize: 0,
        position: 'relative',
        rowGap: own.stepsRowGap(token('space-2xs')),
        own: { stepInset: token('space-sm') },
      }),
      /* A phone's step is a column in a row of steps, and a row down a column,
         which wraps what the stage holds under the name. */
      native([rule({ display: 'flex', flexDirection: own.stepsFlow('column'), flexWrap: 'wrap' })]),
    ]),
    on({ before: 'host' }, [
      rule({
        backgroundColor: hook.connectorColor,
        content: '""',
        position: 'absolute',
        zIndex: 0,
      }),
      web([
        rule({
          blockSize: own.stepsLeadBlockSize(token('border-thin')),
          inlineSize: own.stepsLeadInlineSize(0),
          insetBlockStart: own.stepsLeadBlockStart('50%'),
          insetInlineStart: own.stepsLeadInlineStart(0),
        }),
      ]),
      native([
        rule({
          blockSize: own.stepsLeadHeight(token('border-thin')),
          inlineSize: own.stepsLeadWidth('auto'),
          insetBlockStart: own.stepsLeadTop(0),
          insetBlockEnd: own.stepsLeadBottom('auto'),
          insetInlineStart: own.stepsLeadStart(0),
          insetInlineEnd: own.stepsLeadEnd('auto'),
          marginInlineEnd: own.stepsRailMargin(0),
        }),
      ]),
      /* Nothing arrives at the first, and nothing leaves the last. */
      rule({ place: 'first' }, { display: 'none' }),
    ]),
    on({ after: 'host' }, [
      rule({
        backgroundColor: hook.connectorColor,
        content: '""',
        position: 'absolute',
        zIndex: 0,
      }),
      web([
        rule({
          blockSize: own.stepsTrailBlockSize(token('border-thin')),
          inlineSize: own.stepsTrailInlineSize(0),
          insetBlockStart: own.stepsTrailBlockStart('50%'),
          insetInlineStart: own.stepsTrailInlineStart(0),
        }),
      ]),
      native([
        rule({
          blockSize: own.stepsTrailHeight(token('border-thin')),
          inlineSize: own.stepsTrailWidth('auto'),
          insetBlockStart: own.stepsTrailTop(0),
          insetBlockEnd: own.stepsTrailBottom('auto'),
          insetInlineStart: own.stepsTrailStart(0),
          insetInlineEnd: own.stepsTrailEnd('auto'),
          marginInlineStart: own.stepsRailMargin(0),
        }),
      ]),
      rule({ place: 'last' }, { display: 'none' }),
    ]),
    /* The square the mark sits in, which down a column is the dense name's
       height, so the glyph centers on the name's first line. */
    on('marker', [
      rule({
        alignItems: 'center',
        gridColumn: own.stepsMarkerColumn(1),
        gridRow: 1,
        justifySelf: own.stepsMarkerJustify('center'),
        blockSize: own.stepsMarkBox(token('size-icon')),
        boxSizing: 'border-box',
        color: own.stepsMarkerColor(token('color-border')),
        display: 'inline-flex',
        flex: [0, 0, 'auto'],
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontWeight: own.stepsMarkerWeight(token('weight-semibold')),
        inlineSize: own.stepsMarkBox(token('size-icon')),
        justifyContent: 'center',
        position: 'relative',
        transition: ['color', token('duration-fast'), token('easing-standard')],
        zIndex: 1,
      }),
      native([rule({ alignSelf: own.stepsMarkerJustify('center') })]),
      rule(
        { complete: true },
        {
          color: hook.completeColor,
          fontWeight: token('weight-semibold'),
        },
      ),
      rule(
        { current: true },
        {
          color: hook.currentColor,
          fontWeight: token('weight-semibold'),
        },
      ),
      rule({ complete: true, current: true }, { color: hook.completeColor }),
    ]),
    on({ part: 'marker', inner: 'slot' }, [
      web([rule({ alignItems: 'center', display: 'inline-flex', justifyContent: 'center' })]),
    ]),
    /* The number, drawn only where the sequence asks for numbers. Under
       `numeric` the glyph is not drawn, so the two never both show. */
    on({ after: 'marker' }, [rule({ content: own.stepsCount('none') })]),
    on({ part: 'marker', inner: 'svg' }, [
      web([
        rule({
          blockSize: own.stepsM(token('size-icon')),
          display: own.stepsMark('inline'),
          flex: [0, 0, 'auto'],
          inlineSize: own.stepsM(token('size-icon')),
        }),
      ]),
    ]),
    on('mark', [
      native([
        rule({
          blockSize: own.stepsM(token('size-icon')),
          display: own.stepsMark('flex'),
          inlineSize: own.stepsM(token('size-icon')),
        }),
      ]),
    ]),
    on({ region: 'marker', slotted: '*' }, [
      rule({ '--icon-size': own.stepsM(token('size-icon')) }),
    ]),
    on('body', [
      rule({
        alignItems: own.stepsBodyAlign('center'),
        gridColumn: own.stepsBodyColumn(1),
        gridRow: own.stepsBodyRow(2),
        display: 'flex',
        flexDirection: 'column',
        minInlineSize: 0,
        position: 'relative',
        zIndex: 1,
      }),
      native([
        rule({
          alignSelf: 'stretch',
          flexBasis: own.stepsBodyBasis('auto'),
          flexGrow: own.stepsBodyGrow(0),
          flexShrink: 1,
        }),
      ]),
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
      native([
        rule({
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
          /* The name keeps to one line and runs past a narrow step, as the
             web's Button keeps its words whole. */
          whiteSpace: 'nowrap',
        }),
        rule([{ complete: true }, { current: true }], { color: token('color-foreground') }),
        rule(
          { active: true, formDisabled: false },
          { backgroundColor: mix(token('color-foreground'), 8, 'transparent') },
        ),
        rule({ formDisabled: true }, { opacity: 0.5 }),
      ]),
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
        display: own.stepsContent('none'),
        gridColumn: own.stepsBodyColumn(1),
        gridRow: sum(own.stepsBodyRow(2), 1),
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
      native([
        rule({
          flexBasis: '100%',
          paddingInlineStart: sum(own.stepsMarkBox, token('space-2xs'), own.stepInset),
        }),
      ]),
    ]),
    on({ part: 'content', inner: '> slot' }, [
      rule({ display: 'block', minBlockSize: 0, overflow: 'hidden' }),
    ]),
  ],
)

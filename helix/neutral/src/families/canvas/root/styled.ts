import viewportControls from '../../../fragments/viewport-controls.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  first,
  fn,
  inherited,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Canvas's styled tier: the board in a frame of its own, with its controls
 * and its minimap floating in the corners.
 *
 * **In dark, the cards on the board step up a rung**, as surfaces do in a
 * sunken region: the board restates the surfaces for what it holds. With
 * `separation="plain"` the board draws no frame. **The plane is the one
 * thing that moves**: the web writes where it sits and its zoom on the
 * viewport and moves one transform, and a phone moves it with the pan and
 * pinch driver. `grid` rules the plane in lines at half the border's
 * strength or dots, which move and scale with it.
 *
 * **Each connection is a line in its tone**, broken where it is dashed or
 * dotted, its arrowhead in the line's own color, and twice the weight in the
 * selected color while selected. Its label sits on a box of the board's own
 * ground over the line's middle.
 *
 * **The web keeps the shared viewport sheet** for the controls, the gesture
 * hint and fullscreen; a phone takes the controls from the
 * `viewport-controls` fragment.
 *
 * **Web only:** a connection's hover and focus, the ends of a selected
 * connection, the label editor, the marquee, the connection being drawn, the
 * cursors, the gestures a page shares, and printing.
 */
export default styles(
  root,
  {
    prefix: 'canvas',
    hooks: {
      backgroundColor: token('color-surface-sunken'),
      blockSize: '30rem',
      borderColor: token('color-border'),
      connectColor: token('color-primary'),
      edgeColor: token('color-foreground-subtle'),
      edgeTargetWidth: '12px',
      edgeWidth: token('border-thick'),
      gridSize: '32px',
      handleSize: '0.625rem',
      labelColor: token('color-foreground-muted'),
      labelEditorInlineSize: '12rem',
      labelFontSize: token('text-xs'),
      minimapBlockSize: '7.5rem',
      minimapInlineSize: '10rem',
      radius: token('radii-md'),
      selectedColor: token('color-primary'),
    },
    own: {
      canvasOverlay: null,
      canvasRaised: null,
      canvasRule: null,
      canvasSurface: null,
    },
    props: {
      grid: oneOf(['dots', 'lines']),
      separation: oneOf(['plain']),
    },
    stylesheet: 'canvas/root/canvas-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const ruleSize = product(hook.gridSize, measured('_canvas-rule-zoom'))
    return [
      include(viewportControls),
      /* The host draws nothing: the region inside it is the board's frame.
         The rungs as they stand outside, read for the region below. */
      on('host', [
        rule({
          own: {
            canvasSurface: token('color-surface'),
            canvasRaised: token('color-surface-raised'),
            canvasOverlay: token('color-surface-overlay'),
          },
        }),
        web([rule({ display: 'contents' })]),
      ]),
      /* **In dark, the cards on the board step up a rung**, as a surface
         does in a sunken region; the rungs above step with it. Light keeps
         its own. Decided by the owner on November 4, 2026. */
      on('region', [
        rule({
          backgroundColor: hook.backgroundColor,
          blockSize: hook.blockSize,
          boxShadow: token('shadow-surface'),
          border: [token('border-surface'), 'solid', hook.borderColor],
          borderRadius: hook.radius,
          '--helix-color-surface': scheme(own.canvasSurface, own.canvasRaised),
          '--helix-color-surface-raised': scheme(
            own.canvasRaised,
            mix(token('color-foreground'), 5, own.canvasOverlay),
          ),
          '--helix-color-surface-overlay': scheme(
            own.canvasOverlay,
            mix(token('color-foreground'), 8, own.canvasOverlay),
          ),
          '--helix-color-surface-filled': scheme(
            mix(token('color-foreground'), 5, 'transparent'),
            mix(token('color-foreground'), 6, 'transparent'),
          ),
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateRows: ['auto', '1fr', 'auto'],
          overflow: 'hidden',
          position: 'relative',
        }),
        /* **A board with no frame**, for one that fills a panel. */
        rule(
          { separation: 'plain' },
          {
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: token('radii-none'),
          },
        ),
        /* A phone lays the frame out as a column: the header, the viewport
           taking the rest, and the footer. */
        native([rule({ display: 'flex', flexDirection: 'column' })]),
      ]),
      on('viewport', [
        rule({ minBlockSize: 0, overflow: 'hidden', position: 'relative' }),
        native([rule({ flexBasis: 0, flexGrow: 1, flexShrink: 1, minBlockSize: '12rem' })]),
      ]),
      /* **Grab to move it**, the gesture a board is reached for with. */
      on('viewport', [
        web([
          rule({ cursor: 'grab', touchAction: 'none' }),
          rule({ sharing: true }, { touchAction: ['pan-x', 'pan-y'] }),
          rule({ pressing: true }, { userSelect: 'none' }),
          rule({ active: true }, { cursor: 'grabbing' }),
        ]),
      ]),
      /* **The minimap, in the corner below the controls**, and in the
         opposite corner where the controls are moved to the bottom. */
      on('minimap', [
        rule({
          backgroundColor: first(
            inherited('viewport-control-background-color'),
            token('color-surface-overlay'),
          ),
          blockSize: hook.minimapBlockSize,
          border: [token('border-floating'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxShadow: token('shadow-floating'),
          boxSizing: 'border-box',
          web: { cursor: 'pointer', touchAction: 'none' },
          inlineSize: hook.minimapInlineSize,
          insetBlockEnd: token('space-sm'),
          insetInlineEnd: token('space-sm'),
          position: 'absolute',
        }),
        rule([{ controlsPlacement: 'bottom-start' }, { controlsPlacement: 'bottom-end' }], {
          insetBlock: [token('space-sm'), 'auto'],
        }),
      ]),
      on('minimap-node', [
        rule({ fill: token('color-foreground-subtle') }),
        rule(
          { 'data-group': true },
          {
            fill: 'none',
            stroke: token('color-foreground-subtle'),
            vectorEffect: 'non-scaling-stroke',
          },
        ),
      ]),
      on('minimap-view', [
        rule({
          fill: mix(token('color-primary'), 12, 'transparent'),
          stroke: token('color-primary'),
          strokeWidth: token('border-thick'),
          vectorEffect: 'non-scaling-stroke',
        }),
      ]),
      /* What a page passes in for an empty board, shown only when it is
         one. */
      on({ region: 'empty', slotted: '*' }, [rule({ empty: false }, { display: 'none' })]),
      /* **The plane, and the one thing that moves**, at the top left in any
         language, where the document's coordinates start. */
      on('board', [
        rule({
          blockSize: measured('_canvas-plane-block-size'),
          inlineSize: measured('_canvas-plane-inline-size'),
          left: 0,
          position: 'absolute',
          top: 0,
        }),
        web([
          rule({
            transform: [
              fn('translate', measured('_canvas-x'), measured('_canvas-y')),
              fn('scale', measured('canvas-zoom')),
            ],
            transformOrigin: [0, 0],
            transition: ['transform', token('duration-normal'), token('easing-standard')],
          }),
        ]),
      ]),
      /* **The ruling is behind the plane, and moves as if it were on it**,
         offset to where the document's zero lands and scaled by the plane's
         zoom, gliding with the plane. */
      on('viewport', [
        web([
          rule([{ grid: 'lines' }, { grid: 'dots' }], {
            backgroundPosition: [measured('_canvas-rule-x'), measured('_canvas-rule-y')],
            backgroundSize: [ruleSize, ruleSize],
            transition: list(
              ['background-position', token('duration-normal'), token('easing-standard')],
              ['background-size', token('duration-normal'), token('easing-standard')],
            ),
          }),
        ]),
      ]),
      /* **Lines at half the border's strength**, where dots take all of it. */
      on('viewport', [
        web([
          rule(
            { grid: 'lines' },
            {
              own: { canvasRule: mix(token('color-border'), 50, 'transparent') },
              backgroundImage: list(
                fn(
                  'linear-gradient',
                  'to right',
                  [own.canvasRule, token('border-thin')],
                  ['transparent', 0],
                ),
                fn(
                  'linear-gradient',
                  'to bottom',
                  [own.canvasRule, token('border-thin')],
                  ['transparent', 0],
                ),
              ),
            },
          ),
          rule(
            { grid: 'dots' },
            {
              backgroundImage: fn(
                'radial-gradient',
                [mix(token('color-foreground-subtle'), 50, 'transparent'), token('border-thin')],
                ['transparent', 0],
              ),
            },
          ),
        ]),
      ]),
      /* **Nothing eased while the reader's own hand is on it.** */
      on(['board', 'viewport'], [web([rule({ direct: true }, { transition: 'none' })])]),
      on('board', [web([rule({ reducedMotion: true }, { transition: 'none' })])]),
      on('viewport', [
        web([
          rule(
            [
              { grid: 'lines', reducedMotion: true },
              { grid: 'dots', reducedMotion: true },
            ],
            {
              transition: 'none',
            },
          ),
        ]),
      ]),
      /* A phone's ruling, drawn by the board over the whole viewport in the
         color the grid takes. */
      on('ruling', [
        native([
          rule({ inset: 0, pointerEvents: 'none', position: 'absolute' }),
          rule({ grid: 'lines' }, { color: mix(token('color-border'), 50, 'transparent') }),
          rule(
            { grid: 'dots' },
            { color: mix(token('color-foreground-subtle'), 50, 'transparent') },
          ),
        ]),
      ]),
      /* Under the cards, and the size of the whole plane, under by its
         stacking. A phone gives each connection a box of its own. */
      on('edges', [
        rule({
          inset: 0,
          overflow: 'visible',
          position: 'absolute',
          zIndex: token('layer-beneath'),
        }),
      ]),
      on('line', [
        native([
          rule({
            blockSize: measured('_canvas-line-block-size'),
            inlineSize: measured('_canvas-line-inline-size'),
            left: measured('_canvas-line-x'),
            position: 'absolute',
            top: measured('_canvas-line-y'),
            zIndex: token('layer-beneath'),
          }),
        ]),
      ]),
      on('edge', [
        rule({
          stroke: first(measured('_canvas-edge-color'), hook.edgeColor),
          strokeWidth: hook.edgeWidth,
        }),
        /* **The painted line takes no pointer, and the target over it takes
           all of it.** */
        web([rule({ pointerEvents: 'none' })]),
        native([rule({ fill: 'none', vectorEffect: 'non-scaling-stroke' })]),
      ]),
      on('edge-target', [
        rule({
          web: { cursor: 'grab', pointerEvents: 'stroke' },
          stroke: 'transparent',
          strokeWidth: hook.edgeTargetWidth,
        }),
        native([rule({ fill: 'none' })]),
      ]),
      /* Written out: the target's own focus, which the line after it says. */
      on({ part: 'edge-target', selector: '[part="edge-target"]:focus' }, [
        web([rule({ outline: 'none' })]),
      ]),
      /* **Hover recolors the line and focus thickens it.** Written out: the
         painted line after the target that has the pointer or the focus. */
      on({ part: 'edge', selector: '[part="edge-target"]:hover + [part="edge"]' }, [
        web([rule({ stroke: token('color-focus-ring') })]),
      ]),
      on({ part: 'edge', selector: '[part="edge-target"]:focus-visible + [part="edge"]' }, [
        web([
          rule({
            stroke: token('color-focus-ring'),
            strokeWidth: product(hook.edgeWidth, 2),
          }),
        ]),
      ]),
      /* **The ends of a selected connection**, the web's, which a press
         picks up. */
      on('edge-end', [
        web([
          rule({
            backgroundColor: hook.selectedColor,
            blockSize: hook.handleSize,
            border: [token('border-thick'), 'solid', token('color-surface')],
            borderRadius: token('radii-full'),
            boxSizing: 'border-box',
            cursor: 'grab',
            inlineSize: hook.handleSize,
            left: measured('_canvas-end-x'),
            position: 'absolute',
            top: measured('_canvas-end-y'),
            transform: fn('translate', '-50%', '-50%'),
            zIndex: token('layer-raised'),
          }),
        ]),
      ]),
      on({ after: 'edge-end' }, [
        web([
          rule({ content: '""', inset: product(token('space-sm'), '-1'), position: 'absolute' }),
          rule(
            { coarsePointer: true },
            { inset: quotient(difference(token('size-target'), '100%'), '-2') },
          ),
        ]),
      ]),
      on('viewport', [web([rule({ holding: true }, { cursor: 'grabbing' })])]),
      /* **The field sits where the label does**, on the plane. */
      on('label-editor', [
        web([
          rule({
            backgroundColor: token('color-surface'),
            border: [token('border-thin'), 'solid', token('color-primary')],
            borderRadius: token('radii-sm'),
            boxSizing: 'border-box',
            color: token('color-foreground'),
            fontFamily: token('font-sans'),
            fontSize: fn('max', token('text-field-min'), token('text-xs')),
            inlineSize: hook.labelEditorInlineSize,
            left: measured('_canvas-editor-x'),
            padding: [token('space-2xs'), token('space-xs')],
            position: 'absolute',
            textAlign: 'center',
            top: measured('_canvas-editor-y'),
            transform: fn('translate', '-50%', '-50%'),
            zIndex: token('layer-raised'),
          }),
          rule(
            { part: { 'data-target': 'group' } },
            { textAlign: 'start', transform: fn('translate', 0, '-100%') },
          ),
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: token('size-focus-offset'),
            },
          ),
        ]),
      ]),
      /* **The box a Shift-drag draws**, on the plane with the cards. */
      on('marquee', [
        web([
          rule({
            backgroundColor: mix(hook.selectedColor, 10, 'transparent'),
            blockSize: measured('_canvas-marquee-block-size'),
            border: [token('border-thin'), 'dashed', hook.selectedColor],
            boxSizing: 'border-box',
            inlineSize: measured('_canvas-marquee-inline-size'),
            left: measured('_canvas-marquee-x'),
            pointerEvents: 'none',
            position: 'absolute',
            top: measured('_canvas-marquee-y'),
            zIndex: token('layer-raised'),
          }),
        ]),
      ]),
      /* The connection being drawn, dashed until it is asked for. */
      on('draft', [
        rule({
          web: { pointerEvents: 'none' },
          stroke: hook.connectColor,
          strokeDasharray: '6 4',
          strokeWidth: token('border-thick'),
        }),
      ]),
      on('viewport', [web([rule({ connecting: true }, { cursor: 'crosshair' })])]),
      /* **The head takes the line's own color**: `context-stroke` on the
         web, where the browser says what that is, and on a phone the same
         rules as the line. */
      on('arrow', [
        rule({ fill: hook.edgeColor }),
        web([rule({ supports: '(fill: context-stroke)' }, { fill: 'context-stroke' })]),
        native([
          rule({ fill: first(measured('_canvas-edge-color'), hook.edgeColor) }),
          rule({ 'data-tone': 'accent' }, { fill: token('color-accent') }),
          rule({ 'data-tone': 'danger' }, { fill: token('color-danger') }),
          rule({ 'data-tone': 'info' }, { fill: token('color-info') }),
          rule({ 'data-tone': 'primary' }, { fill: token('color-primary') }),
          rule({ 'data-tone': 'success' }, { fill: token('color-success') }),
          rule({ 'data-tone': 'warning' }, { fill: token('color-warning-mark') }),
          rule({ 'data-selected': true }, { fill: hook.selectedColor }),
        ]),
      ]),
      on('edge', [
        rule({ 'data-tone': 'accent' }, { stroke: token('color-accent') }),
        rule({ 'data-tone': 'danger' }, { stroke: token('color-danger') }),
        rule({ 'data-tone': 'info' }, { stroke: token('color-info') }),
        rule({ 'data-tone': 'primary' }, { stroke: token('color-primary') }),
        rule({ 'data-tone': 'success' }, { stroke: token('color-success') }),
        rule({ 'data-tone': 'warning' }, { stroke: token('color-warning-mark') }),
        /* **Selected stays drawn after the pointer and the focus have gone**,
           after the tones, which match as closely. */
        rule(
          { 'data-selected': true },
          { stroke: hook.selectedColor, strokeWidth: product(hook.edgeWidth, 2) },
        ),
        /* A weaker or optional connection, drawn broken. */
        rule({ 'data-stroke': 'dashed' }, { strokeDasharray: '6 4' }),
        rule({ 'data-stroke': 'dotted' }, { strokeDasharray: '0 5', strokeLinecap: 'round' }),
      ]),
      /* **Text on a box of the board's own ground**, as wide as the words,
         centered on the line's middle. */
      on('label', [
        rule({
          backgroundColor: hook.backgroundColor,
          color: hook.labelColor,
          fontFamily: token('font-sans'),
          fontSize: hook.labelFontSize,
          left: measured('_canvas-label-x'),
          lineHeight: 1,
          padding: token('space-2xs'),
          pointerEvents: 'none',
          position: 'absolute',
          top: measured('_canvas-label-y'),
          transform: web(fn('translate', '-50%', '-50%')),
          whiteSpace: 'nowrap',
        }),
        native([rule({ translate: ['-50%', '-50%'] })]),
      ]),
      /* **Printed as it stands, controls aside.** */
      on('controls', [web([rule({ print: true }, { display: 'none' })])]),
    ]
  },
)

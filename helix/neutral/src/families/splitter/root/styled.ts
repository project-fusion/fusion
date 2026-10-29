import { oneOf } from '../../../render.js'
import { difference, list, measured, native, quotient, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import splitter from './headless.js'

/**
 * Splitter's styled tier, which writes
 * `helix/styled/src/splitter/root/splitter-root.generated.css`.
 *
 * **Flex, with the start pane as long as the divider's position** and the
 * end pane taking the rest. Both panes scroll, and neither keeps its
 * content's length as a floor, so a pane holding something that scrolls
 * still shrinks as far as the divider goes.
 *
 * **The divider is a target and the line is drawn inside it.** The target
 * is `--splitter-target` across and overlaps both panes by half of that, so
 * it takes no length from either; the line is centered in it, so thickening
 * the line moves nothing. A divider under the pointer, with focus, or moving
 * darkens and thickens its line, and one moving goes primary. A pane shut to
 * nothing gets no line, there being an edge there already.
 *
 * **`variant="grip"` adds a capsule beside the line** that shows on
 * approach, and the line then keeps its look. The corner where a nested
 * splitter crosses is drawn by the outer one, on the web.
 */
export default styles(
  splitter,
  {
    prefix: 'splitter',
    hooks: {
      color: token('color-border'),
      corner: token('space-md'),
      dragColor: token('color-primary'),
      gripColor: token('color-foreground-muted'),
      gripLength: '2rem',
      gripThickness: token('border-thick'),
      handleColor: token('color-foreground-muted'),
      hoverColor: token('color-foreground-muted'),
      hoverThickness: token('border-thick'),
      target: token('space-xs'),
      thickness: token('border-thin'),
    },
    props: { variant: oneOf(['grip', 'line']) },
    stylesheet: 'splitter/root/splitter-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const fade = token('duration-fast')
    const ease = token('easing-standard')
    return [
      /* For the corner, which is placed against this box. */
      on('host', [
        rule({ display: 'flex', minBlockSize: 0, minInlineSize: 0, position: 'relative' }),
        rule([{ orientation: 'vertical' }, { orientation: 'auto', vertical: true }], {
          flexDirection: 'column',
        }),
      ]),
      on('start', [
        rule({
          flex: [0, 0, measured('splitter-position', '50%')],
          minBlockSize: 0,
          minInlineSize: 0,
          overflow: 'auto',
        }),
      ]),
      on('end', [rule({ flex: '1 1 0', minBlockSize: 0, minInlineSize: 0, overflow: 'auto' })]),
      /* A grid, so a mark passed in sits at the middle of the line whichever
         way it runs. The pointer stays with the divider once it has it, and
         a drag across a pane selects nothing. */
      on('separator', [
        rule({
          backgroundColor: 'transparent',
          boxSizing: 'border-box',
          display: 'grid',
          flex: 'none',
          placeContent: 'center',
          placeItems: 'center',
          inlineSize: hook.target,
          marginInline: quotient(hook.target, '-2'),
          position: 'relative',
          web: { cursor: 'col-resize', touchAction: 'none', userSelect: 'none' },
          zIndex: token('layer-raised'),
        }),
        rule([{ orientation: 'vertical' }, { orientation: 'auto', vertical: true }], {
          blockSize: hook.target,
          inlineSize: 'auto',
          marginBlock: quotient(hook.target, '-2'),
          marginInline: 0,
          web: { cursor: 'row-resize' },
        }),
        /* The one being pointed at paints over the other where two cross. */
        rule([{ hover: true }, { focusVisible: true }, { dragging: true }], {
          zIndex: sum(token('layer-raised'), 1),
        }),
        rule({ focusVisible: true }, { outline: 'none' }),
      ]),
      /* The line, centered in the target. */
      on({ before: 'separator' }, [
        rule({
          backgroundColor: hook.color,
          content: '""',
          inlineSize: hook.thickness,
          insetBlock: 0,
          insetInlineStart: '50%',
          marginInlineStart: quotient(hook.thickness, '-2'),
          position: 'absolute',
          transition: list(['background-color', fade, ease], ['inline-size', fade, ease]),
        }),
        rule([{ orientation: 'vertical' }, { orientation: 'auto', vertical: true }], {
          blockSize: hook.thickness,
          inlineSize: 'auto',
          insetBlockStart: '50%',
          insetInline: 0,
          marginBlockStart: quotient(hook.thickness, '-2'),
          transition: list(['background-color', fade, ease], ['block-size', fade, ease]),
        }),
        rule({ 'data-flush': true }, { backgroundColor: 'transparent' }),
        rule(
          [
            { hover: true, variant: { not: 'grip' } },
            { focusVisible: true, variant: { not: 'grip' } },
            { dragging: true, variant: { not: 'grip' } },
          ],
          { backgroundColor: hook.hoverColor, inlineSize: hook.hoverThickness },
        ),
        rule({ dragging: true, variant: { not: 'grip' } }, { backgroundColor: hook.dragColor }),
        rule(
          [
            { hover: true, orientation: 'vertical', variant: { not: 'grip' } },
            { focusVisible: true, orientation: 'vertical', variant: { not: 'grip' } },
            { dragging: true, orientation: 'vertical', variant: { not: 'grip' } },
            { hover: true, orientation: 'auto', variant: { not: 'grip' }, vertical: true },
            { focusVisible: true, orientation: 'auto', variant: { not: 'grip' }, vertical: true },
            {
              dragging: true,
              orientation: 'auto',
              variant: { not: 'grip' },
              vertical: true,
            },
          ],
          { blockSize: hook.hoverThickness, inlineSize: 'auto' },
        ),
        /* The ring is on the line, which is what moves. */
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
      /* The handle where a nested splitter's divider crosses this one, twice
         the target across, which draws nothing but its ring. */
      on('corner', [
        web([
          rule({
            blockSize: hook.corner,
            cursor: 'move',
            inlineSize: hook.corner,
            insetBlockStart: measured('splitter-corner-at'),
            insetInlineStart: measured('splitter-position'),
            marginBlockStart: quotient(hook.corner, '-2'),
            marginInlineStart: quotient(hook.corner, '-2'),
            position: 'absolute',
            touchAction: 'none',
            userSelect: 'none',
            zIndex: sum(token('layer-raised'), 2),
          }),
          rule([{ orientation: 'vertical' }, { orientation: 'auto', vertical: true }], {
            insetBlockStart: measured('splitter-position'),
            insetInlineStart: measured('splitter-corner-at'),
          }),
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: token('size-focus-offset'),
            },
          ),
        ]),
      ]),
      /* A grip beside the line, nothing at rest, which approach brings in. */
      on({ after: 'separator' }, [
        rule(
          { variant: 'grip' },
          {
            backgroundColor: hook.gripColor,
            borderRadius: token('radii-full'),
            content: '""',
            opacity: 0,
            position: 'absolute',
            transition: list(['background-color', fade, ease], ['opacity', fade, ease]),
          },
        ),
        /* Along the run, centered, and to the leading side of the line. */
        rule(
          { orientation: { not: 'vertical' }, variant: 'grip', vertical: false },
          {
            blockSize: hook.gripLength,
            inlineSize: hook.gripThickness,
            insetBlockStart: difference('50%', quotient(hook.gripLength, 2)),
            insetInlineStart: difference(difference('50%', hook.gripThickness), token('space-2xs')),
          },
        ),
        rule(
          [
            { orientation: 'vertical', variant: 'grip' },
            { orientation: 'auto', variant: 'grip', vertical: true },
          ],
          {
            blockSize: hook.gripThickness,
            inlineSize: hook.gripLength,
            insetBlockStart: difference(difference('50%', hook.gripThickness), token('space-2xs')),
            insetInlineStart: difference('50%', quotient(hook.gripLength, 2)),
          },
        ),
        rule(
          [
            { hover: true, variant: 'grip' },
            { focusVisible: true, variant: 'grip' },
            { dragging: true, variant: 'grip' },
          ],
          { opacity: 1 },
        ),
        rule({ dragging: true, variant: 'grip' }, { backgroundColor: hook.dragColor }),
      ]),
      /* A mark passed in at the middle of the line, over it, with no target
         of its own: a press on it is the divider's. */
      on({ region: 'handle', slotted: '*' }, [
        rule({ color: hook.handleColor, pointerEvents: 'none', position: 'relative' }),
      ]),
      /* Out of the pointer's way while the divider moves. */
      on(['start', 'end'], [rule({ dragging: true }, { pointerEvents: 'none' })]),
      on('host', [rule({ print: true }, { overflow: 'visible' })]),
      /* A phone scrolls a pane down alone: a pane that scrolls both ways
         lays what it holds out at its content's width, so a nested
         splitter's panes took their shares of less than the pane. */
      on(['start', 'end'], [native([rule({ overflowX: 'hidden', overflowY: 'auto' })])]),
    ]
  },
)

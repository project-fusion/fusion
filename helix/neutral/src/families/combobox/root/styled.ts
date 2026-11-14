import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import floatingEntrance from '../../../fragments/floating-entrance.js'
import floatingPanel from '../../../fragments/floating-panel.js'
import printExact from '../../../fragments/print-exact.js'
import tags from '../../../fragments/tags.js'
import visuallyHidden from '../../../fragments/visually-hidden.js'
import {
  difference,
  fn,
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
import root from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const

/**
 * Combobox's styled tier.
 *
 * **The frame is the field**, so the focus ring is drawn once around the whole control
 * and the caret and any mark sit inside one border with the text, as Input's do. **With
 * tags in it the field grows**, and the caret comes out of the wrap to the field's end,
 * since it says the whole control opens.
 *
 * **The panel is the floating panel and its entrance**, handed the family's hooks: as
 * wide as its widest option with the field's width as the floor, never wider than the
 * screen less a margin, and never taller than the room measured under the field. **The
 * create row is dressed as a row of the list**, and takes the wash a highlighted option
 * takes.
 */
export default styles(
  root,
  {
    prefix: 'combobox',
    hooks: {
      backgroundColor: token('color-well'),
      borderColor: token('color-border-floating'),
      borderWidth: token('border-floating'),
      controlSize: '4ch',
      panelSize: 'max-content',
      shadow: token('shadow-floating'),
    },
    own: {
      comboboxRing: null,
      floatingBorderColor: null,
      floatingBorderWidth: null,
      floatingShadow: null,
    },
    stylesheet: 'combobox/root/combobox-root.generated.css',
  },
  ({ hook, include, keyframes, on, own, rule }) => {
    const caret = {
      '--icon-size': token('size-icon-tight'),
      blockSize: token('size-icon-tight'),
      color: token('color-foreground-muted'),
      flex: '0 0 auto',
      inlineSize: token('size-icon-tight'),
    } as const
    const turning = {
      transition: web(['rotate', ...ease]),
    } as const
    return [
      on('live', [rule([visuallyHidden])]),
      include(field),
      include(fieldStacked),
      include(tags),
      include(floatingPanel),
      include(floatingEntrance),
      on('host', [rule({ position: web('relative') })]),
      on('held', [native([rule({ display: 'none' })])]),
      on('field', [
        rule({
          alignItems: 'center',
          backgroundColor: hook.backgroundColor,
          blockSize: token('size-control'),
          border: [token('border-thin'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          display: 'flex',
          gap: token('space-xs'),
          paddingInline: token('space-field'),
          transition: web(list(['background-color', ...ease], ['border-color', ...ease])),
        }),
        native([rule({ alignContent: 'center', flexDirection: 'row', flexWrap: 'wrap' })]),
      ]),
      include(fieldFrame),
      on('field', [
        rule(
          { invalid: true },
          { borderColor: token('color-danger'), outlineColor: token('color-danger') },
        ),
        rule({ readonly: true }, { backgroundColor: 'transparent' }),
        rule({ forcedColors: true, invalid: true }, { borderWidth: token('border-thick') }),
      ]),
      /* With tags in it the field grows, and only then. */
      on({ part: 'field', selector: '[part="field"]:has([part="tags"])' }, [
        web([
          rule({
            blockSize: 'auto',
            flexWrap: 'wrap',
            minBlockSize: token('size-control'),
            paddingBlock: token('space-2xs'),
            paddingInlineEnd: sum(token('space-field'), token('size-icon-tight')),
            position: 'relative',
          }),
        ]),
      ]),
      /* A phone's caret stays in the wrap, at the end of the last line, where the
         text grows to it: Yoga centers an absolute box only between both its insets. */
      on('field', [
        native([
          rule(
            { part: { 'data-grown': true } },
            {
              blockSize: 'auto',
              minBlockSize: token('size-control'),
              paddingBlock: token('space-2xs'),
            },
          ),
        ]),
      ]),
      on('indicator', [rule(turning)]),
      on({ region: 'indicator', slotted: '*' }, [rule(turning)]),
      /* The caret comes out of the wrap, and stands at the field's end. */
      on({ part: 'indicator', selector: '[part="field"]:has([part="tags"]) [part="indicator"]' }, [
        web([
          rule({
            insetBlockStart: '50%',
            insetInlineEnd: token('space-xs'),
            position: 'absolute',
            translate: '0 -50%',
          }),
        ]),
      ]),
      on(
        {
          part: 'indicator',
          selector: '[part="field"]:has([part="tags"]) ::slotted([slot="indicator"])',
        },
        [
          web([
            rule({
              insetBlockStart: '50%',
              insetInlineEnd: token('space-xs'),
              position: 'absolute',
              translate: '0 -50%',
            }),
          ]),
        ],
      ),
      /* Concentric with the field, the inset corner. */
      on('tag', [
        rule({ '--tag-radius': token('radii-inset'), flex: '0 0 auto', maxInlineSize: '100%' }),
      ]),
      on('tags', [
        native([
          rule({
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: token('space-xs'),
          }),
        ]),
      ]),
      /* The text keeps a usable width once tags share its line. */
      on({ part: 'control', selector: '[part="field"]:has([part="tags"]) [part="control"]' }, [
        web([rule({ flex: [1, 1, hook.controlSize] })]),
      ]),
      /* A phone has no `ch`: the text keeps the height of a control across. */
      on('control', [
        native([rule({ minInlineSize: token('size-control') })]),
        /* A placeholder or an answer longer than the box ends in an ellipsis. */
        web([rule({ textOverflow: 'ellipsis' })]),
      ]),
      on('field', [
        rule(
          { formDisabled: true },
          { cursor: web('not-allowed'), opacity: token('opacity-disabled') },
        ),
        /* A list that could not load says so while the panel is shut, with
           the danger edge, after the frame's hover and ring. */
        rule(
          { error: true },
          { borderColor: token('color-danger'), outlineColor: token('color-danger') },
        ),
      ]),
      on('indicator', [rule(caret)]),
      on({ region: 'indicator', slotted: '*' }, [rule(caret)]),
      /* Turned, as Accordion's chevron is, never through a flat line. */
      on('indicator', [
        native([rule({ rotate: '0deg' })]),
        rule({ open: true }, { rotate: '180deg' }),
      ]),
      on({ region: 'indicator', slotted: '*' }, [rule({ open: true }, { rotate: '180deg' })]),
      /* Read-only, and the caret says the panel does not open. */
      on('indicator', [rule({ readonly: true }, { opacity: token('opacity-disabled') })]),
      on({ region: 'indicator', slotted: '*' }, [
        rule({ readonly: true }, { opacity: token('opacity-disabled') }),
      ]),
      /* Loading, and the closed control says so: the caret turns into the ring
         every spinner here draws, a step smaller than the caret's box, so it
         sits in the caret's place. Slowed rather than stopped under reduced
         motion, as Button's ring is. */
      on('indicator', [
        web([
          rule(
            { loading: true },
            {
              own: {
                comboboxRing: fn('round', product(token('size-icon-tight'), 0.75), '2px'),
              },
              animation: ['helix-combobox-turn', token('duration-turn'), 'linear', 'infinite'],
              blockSize: own.comboboxRing,
              border: [token('border-thick'), 'solid', mix('currentColor', 30, 'transparent')],
              borderBlockStartColor: 'currentColor',
              borderRadius: token('radii-full'),
              boxSizing: 'border-box',
              fill: 'transparent',
              inlineSize: own.comboboxRing,
              margin: quotient(difference(token('size-icon-tight'), own.comboboxRing), 2),
            },
          ),
          rule(
            { loading: true, reducedMotion: true },
            { animationDuration: token('duration-crawl') },
          ),
        ]),
      ]),
      keyframes('helix-combobox-turn', { to: { rotate: '1turn' } }),
      /* The color goes on the slot, where what is passed in inherits it: written on
         `::slotted`, it beat a slotted component's own `:host` color. */
      on({ region: ['start', 'end'] }, [rule({ color: token('color-foreground-muted') })]),
      /* The tight step every field glyph takes. */
      on({ region: ['start', 'end'], slotted: '*' }, [
        rule({
          '--icon-size': token('size-icon-tight'),
          flex: '0 0 auto',
        }),
      ]),
      on('surface', [
        rule({
          own: {
            floatingBorderColor: hook.borderColor,
            floatingBorderWidth: hook.borderWidth,
            floatingShadow: hook.shadow,
          },
          boxSizing: 'border-box',
          inlineSize: web(hook.panelSize),
          maxBlockSize: measured('floating-available-block-size', 'none'),
          maxInlineSize: difference('100vw', product(token('space-md'), 2)),
          minInlineSize: measured('floating-anchor-inline-size', '100%'),
          overflow: 'hidden',
          padding: token('space-none'),
          position: web('absolute'),
        }),
      ]),
      /* A row of the list, chosen the same way. `all: unset` first, since a `<button>`
         arrives with a background, a border, and a font of its own. */
      on('create', [
        rule({
          all: web('unset'),
          borderBlockStart: [token('border-thin'), 'solid', token('color-border')],
          boxSizing: 'border-box',
          color: token('color-foreground'),
          cursor: web('pointer'),
          display: web('block'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          inlineSize: '100%',
          paddingBlock: token('space-xs'),
          paddingInline: token('space-sm'),
          textAlign: 'start',
          transition: web(['background-color', ...ease]),
        }),
        rule({ hover: true }, { backgroundColor: token('color-hover') }),
        rule({ also: { 'create-active': true } }, { backgroundColor: token('color-hover') }),
        /* Inside the panel's own edge, which clips an outline drawn outward. */
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        native([rule({ active: true }, { backgroundColor: token('color-press') })]),
      ]),
      /* The list fills the panel, which is already the surface. */
      on('listbox', [
        rule({
          '--listbox-background-color': 'transparent',
          /* The list's border is on the box that scrolls, off, so the fade
             has no border to take out with the rows. */
          '--listbox-border': 'none',
          border: web('none'),
          display: web('block'),
        }),
      ]),
      on('listbox-items', [
        native([
          rule({
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: token('radii-none'),
          }),
        ]),
      ]),
      /* The end with more past it fades, as Table and Navigation fade theirs,
         and the list holds Select's inset above the first row and below the
         last. A list that fits is never masked. */
      on({ part: 'listbox', selector: '[part="listbox"]::part(items)' }, [
        web([
          rule({
            paddingBlock: token('space-xs'),
            maskImage: fn(
              'linear-gradient',
              'to bottom',
              'transparent',
              ['#000', measured('_combobox-fade-start', '0rem')],
              ['#000', difference('100%', measured('_combobox-fade-end', '0rem'))],
              'transparent',
            ),
          }),
          rule(
            { supports: '(animation-timeline: scroll())' },
            {
              animation: ['combobox-edges', 'linear', 'both'],
              animationTimeline: fn('scroll', 'self block'),
            },
          ),
          rule({ reducedMotion: true }, { animation: 'none' }),
        ]),
      ]),
      keyframes('combobox-edges', {
        '0%': { '--_combobox-fade-end': token('space-xl'), '--_combobox-fade-start': '0rem' },
        '5%, 95%': {
          '--_combobox-fade-end': token('space-xl'),
          '--_combobox-fade-start': token('space-xl'),
        },
        '100%': { '--_combobox-fade-end': '0rem', '--_combobox-fade-start': token('space-xl') },
      }),
      /* What the `error` region holds, such as a button that tries again,
         sits a step after the list's error words, as it does in Table. */
      on({ region: 'error', slotted: '*' }, [
        web([rule({ marginInlineStart: token('space-sm') })]),
      ]),
      include(printExact),
    ]
  },
)

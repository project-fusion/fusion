import { difference, fn, list, measured, mix, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import tabs from './headless.js'

/**
 * A tab set's styled tier, which writes `helix/styled/src/tabs/root/tabs-root.generated.css`.
 *
 * **The set styles its tabs through private values**, `tab-height`,
 * `tab-radius` and the rest, which reach each slotted tab through the flat tree.
 * The tab's own table reads them, and its fallbacks are what a tab with no set
 * around it would draw.
 *
 * **The indicator is placed by measurement.** The root measures the selected
 * tab and sets `--indicator-x`, `--indicator-y` and its size, and the rules
 * below add the offset each variant wants.
 */
export default styles(
  tabs,
  {
    prefix: 'tabs',
    hooks: [
      'gap',
      'indicator-color',
      'indicator-radius',
      'indicator-shadow',
      'indicator-thickness',
      'rule-color',
      'scroll-background-color',
    ],
    own: [
      'indicator-block',
      'indicator-border',
      'indicator-border-color',
      'indicator-color',
      'indicator-offset',
      'indicator-offset-x',
      'indicator-radius',
      'indicator-shadow',
      'tab-height',
      'tab-inline-size',
      'tab-justify',
      'tab-radius',
      'tab-selected-shadow',
      'tab-selected-surface',
      'tabs-dismiss-rest',
      'tabs-inline-sign',
      'tabs-panel-padding-block-start',
      'tabs-panel-padding-inline-start',
      'tabs-rule',
    ],
    props: [
      prop('dismiss-marks', ['always', 'hover']),
      prop('emphasis', ['subtle']),
      prop('width', ['auto', 'full']),
    ],
    stylesheet: 'tabs/root/tabs-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        display: 'grid',
        /* The tab strip takes what it needs, the panels take the rest. `minmax(0,
           1fr)`, because a `1fr` track keeps an automatic minimum and refuses to
           shrink under its content, which is the whole question here. A tab set
           given 12rem is 12rem, and with no height set the row still sizes to
           content. */
        gridTemplateRows: 'auto minmax(0, 1fr)',
        minBlockSize: 0,
        /* The default look, and where every variant starts from: a raised pill on
           the selected tab and nothing at all behind the row. */
        own: {
          rule: 'none',
          tabRadius: token('radii-sm'),
          tabSelectedShadow: token('shadow-sm'),
          tabSelectedSurface: token('color-surface-raised'),
        },
      }),
      /* Underlined. */
      rule(
        { variant: 'underlined' },
        {
          own: {
            rule: fn(
              'linear-gradient',
              hook.ruleColor(token('color-border')),
              hook.ruleColor(token('color-border')),
            ),
            tabRadius: token('radii-none'),
            tabSelectedShadow: 'none',
            tabSelectedSurface: 'transparent',
          },
        },
      ),
      rule({ variant: 'segmented' }, { own: { tabSelectedSurface: 'transparent' } }),
      rule(
        { variant: false },
        { own: { tabSelectedSurface: 'transparent', tabSelectedShadow: 'none' } },
      ),
      /* Vertical: the tabs in a column at the inline start, the panels beside them. */
      rule(
        { orientation: 'vertical' },
        {
          gridTemplateColumns: 'auto minmax(0, 1fr)',
          gridTemplateRows: 'minmax(0, 1fr)',
          own: {
            /* Which way the inline axis runs, for the bar at the column's inline end. */
            inlineSign: 1,
            panelPaddingBlockStart: token('space-none'),
            panelPaddingInlineStart: token('space-md'),
          },
        },
      ),
      rule({ dir: 'rtl', orientation: 'vertical' }, { own: { inlineSign: '-1' } }),
      /* Print: the panel that is open, without the strip that would open another. */
      rule({ print: true }, { boxShadow: 'none', overflow: 'visible' }),
      /* `dismiss-marks="hover"`: each tab reads this and shows its mark only while it
         is current, hovered, or holds focus. A private value, inherited by the
         tabs, because the set decides and each tab draws. */
      rule({ 'dismiss-marks': 'hover' }, { own: { dismissRest: 0 } }),
    ]),
    /* The tabs stack above the mark. */
    on({ slotted: 'helix-tab' }, [
      rule({ position: 'relative', zIndex: token('layer-raised') }),
      /* A tab fills the column and its words start at its inline start. */
      rule(
        { orientation: 'vertical' },
        { own: { tabInlineSize: '100%', tabJustify: 'flex-start' } },
      ),
      /* **`width="full"`: the strip fills its row, and the tabs share it
         evenly**, as a segmented control does across a phone. After the
         variants, which keep the strip as wide as its tabs. */
      rule({ width: 'full' }, { flex: 1, own: { tabInlineSize: '100%' } }),
    ]),
    on('tabs', [
      /* The rule is a background, which is what lets a tab sit on it. */
      rule({
        backgroundImage: own.rule('none'),
        backgroundPosition: 'bottom',
        backgroundRepeat: 'repeat-x',
        backgroundSize: ['100%', token('border-thin')],
        display: 'flex',
        gap: hook.gap(token('space-2xs')),
        overflowX: 'auto',
      }),
      /* Segmented. */
      rule(
        { variant: 'segmented' },
        {
          backgroundColor: token('color-surface-sunken'),
          blockSize: token('size-control'),
          border: [token('border-thin'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          justifySelf: 'start',
          padding: token('space-2xs'),
          inlineSize: 'fit-content',
          own: {
            /* A groove, so the pill in it is over the page as well as on it. */
            tabSelectedSurface: token('color-surface-overlay'),
            /* The control is the height of a control, and the tabs are what is left
               inside it. The same fix Toggle Group carries, and the same reason for
               `100%` over arithmetic: it resolves against the track's content box, so
               the padding and the border are subtracted by the box model, with no
               number here to keep in step with them. */
            tabHeight: '100%',
          },
        },
      ),
      /* The strip is the containing block, so the mark is positioned against the
         row of tabs, inside the component. */
      rule({ position: 'relative' }),
      rule(
        { orientation: 'vertical' },
        {
          alignContent: 'start',
          backgroundPosition: 'right',
          backgroundRepeat: 'repeat-y',
          backgroundSize: [token('border-thin'), '100%'],
          flexDirection: 'column',
          overflowX: 'visible',
          overflowY: 'auto',
        },
      ),
      rule({ dir: 'rtl', orientation: 'vertical' }, { backgroundPosition: 'left' }),
      /* The segmented groove grows down with its tabs. */
      rule(
        { orientation: 'vertical', variant: 'segmented' },
        { blockSize: 'auto', justifySelf: 'start', own: { tabHeight: 'initial' } },
      ),
      rule({ width: 'full' }, { inlineSize: 'auto', justifySelf: 'stretch' }),
    ]),
    /* The scroll buttons under `scroll-controls` hold to the ends of the strip as
       it scrolls, over the tabs that pass under them. Hidden, they draw no box. */
    on(
      ['scroll-start', 'scroll-end'],
      [
        rule({
          alignItems: 'center',
          backgroundColor: hook.scrollBackgroundColor(token('color-surface')),
          border: 'none',
          color: token('color-foreground-muted'),
          cursor: web('pointer'),
          display: 'inline-flex',
          flex: 'none',
          justifyContent: 'center',
          paddingInline: token('space-2xs'),
          position: 'sticky',
          zIndex: 1,
        }),
        rule({ part: { hidden: true } }, { display: 'none' }),
        rule({ hover: true }, { color: token('color-foreground') }),
      ],
    ),
    on('scroll-start', [
      rule({ insetInlineStart: 0 }),
      rule(
        { orientation: 'vertical' },
        { insetBlockStart: 0, insetInlineStart: 'auto', paddingBlock: token('space-2xs') },
      ),
    ]),
    on('scroll-end', [
      rule({ insetInlineEnd: 0 }),
      rule(
        { orientation: 'vertical' },
        { insetBlockEnd: 0, insetInlineEnd: 'auto', paddingBlock: token('space-2xs') },
      ),
    ]),
    /* The glyph each scroll button draws where none is slotted. */
    on(
      ['scroll-start-mark', 'scroll-end-mark'],
      [rule({ blockSize: token('size-icon'), inlineSize: token('size-icon') })],
    ),
    /* A slotted replacement is sized like the default, so swapping it does not
       move the strip. */
    on({ region: ['scroll-start-icon', 'scroll-end-icon'], slotted: '*' }, [
      rule({
        '--icon-size': token('size-icon'),
        blockSize: token('size-icon'),
        inlineSize: token('size-icon'),
      }),
    ]),
    /* Panels share one cell, one over another. */
    on('panels', [
      rule({
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr)',
        minBlockSize: 0,
        minInlineSize: 0,
      }),
    ]),
    /* One mark, traveling. */
    on('indicator', [
      rule({
        backgroundColor: own.indicatorColor('transparent'),
        blockSize: own.indicatorBlock(token('border-thick')),
        /* An edge as well as a fill, because on a light page a fill alone could not
           tell the mark from a hover. `surface-raised` is 0.97 and the hover wash is
           five per cent of the foreground over the strip, which composites to 0.966:
           measured 0.004 apart in OKLCH lightness, so the only thing separating the
           tab you are on from the tab under your pointer was a `shadow-sm`. */
        border: [own.indicatorBorder(0), 'solid', own.indicatorBorderColor('transparent')],
        borderRadius: hook.indicatorRadius(own.indicatorRadius(token('radii-none'))),
        boxShadow: hook.indicatorShadow(own.indicatorShadow('none')),
        inlineSize: measured('indicator-inline-size', 0),
        insetBlockStart: 0,
        insetInlineStart: 0,
        opacity: 0,
        position: 'absolute',
        /* Where the tab is, plus where in the tab this mark goes. Dropping the
           measured `y` is invisible wherever the tabs fill their strip, which is
           every appearance's own layout and every example, and wrong the moment
           anything gives the strip height of its own: the sandbox's panel puts
           32px tabs in a 48px row, and the pill then draws seven and a half pixels
           above the label it is marking. */
        translate: [
          sum(measured('indicator-x', '0px'), own.indicatorOffsetX('0px')),
          sum(measured('indicator-y', '0px'), own.indicatorOffset('0px')),
        ],
        /* It slides and then settles: `emphasized` overshoots slightly and comes
           back, which is the breath. */
        transition: list(
          ['translate', token('duration-normal'), token('easing-emphasized')],
          ['inline-size', token('duration-normal'), token('easing-emphasized')],
          ['opacity', token('duration-fast'), token('easing-standard')],
        ),
        zIndex: token('layer-base'),
      }),
      rule({ part: { 'data-placed': true } }, { opacity: 1 }),
      /* Underline: a bar along the bottom of the strip, on the rule it replaces. */
      rule(
        { variant: 'underlined' },
        {
          own: {
            indicatorBlock: hook.indicatorThickness(token('border-thick')),
            indicatorColor: hook.indicatorColor(token('color-primary')),
            indicatorOffset: difference(
              measured('indicator-block-size', '0px'),
              hook.indicatorThickness(token('border-thick')),
            ),
          },
        },
      ),
      /* Segmented: the same mark, grown to the tab's own box. */
      rule(
        { variant: 'segmented' },
        {
          own: {
            indicatorBlock: measured('indicator-block-size', 0),
            indicatorColor: hook.indicatorColor(token('color-surface-overlay')),
            indicatorRadius: difference(token('radii-sm'), token('border-thin')),
            indicatorShadow: token('shadow-sm'),
            indicatorOffset: '0px',
          },
        },
      ),
      /* The default is a pill too, so it travels for the same reason. */
      rule(
        { variant: false },
        {
          own: {
            indicatorBlock: measured('indicator-block-size', 0),
            /* `overlay` with an edge. This pill lies on the page with nothing framing
               it, and `raised` put it a three per cent step off a white strip: the
               same place the hover wash lands, so the selected tab and a hovered one
               read as the same thing. */
            indicatorBorder: token('border-thin'),
            indicatorBorderColor: token('color-border'),
            indicatorColor: hook.indicatorColor(token('color-surface-overlay')),
            indicatorRadius: token('radii-sm'),
            indicatorShadow: token('shadow-sm'),
            indicatorOffset: '0px',
          },
        },
      ),
      /* The bar stands along the column's inline end, on the rule it replaces. */
      rule(
        { orientation: 'vertical', variant: 'underlined' },
        {
          inlineSize: hook.indicatorThickness(token('border-thick')),
          own: {
            indicatorBlock: measured('indicator-block-size', 0),
            indicatorOffset: '0px',
            indicatorOffsetX: product(
              difference(
                measured('indicator-inline-size', '0px'),
                hook.indicatorThickness(token('border-thick')),
              ),
              own.inlineSign(1),
            ),
          },
        },
      ),
      /* `subtle`: the mark as a tint, with no edge and no shadow. The same wash the
         tab under the pointer takes, a step stronger, so the current tab still reads
         as current beside one being hovered. */
      rule(
        [
          { emphasis: 'subtle', variant: false },
          { emphasis: 'subtle', variant: 'segmented' },
        ],
        {
          own: {
            indicatorBorder: 0,
            indicatorColor: hook.indicatorColor(mix(token('color-foreground'), 8, 'transparent')),
            indicatorShadow: 'none',
          },
        },
      ),
      rule(
        { emphasis: 'subtle', variant: 'underlined' },
        { own: { indicatorColor: hook.indicatorColor(token('color-foreground')) } },
      ),
    ]),
  ],
)

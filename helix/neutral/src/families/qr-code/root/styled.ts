import { product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * QR Code's styled tier, which writes
 * `helix/styled/src/qr-code/root/qr-code-root.generated.css`.
 *
 * **A square that holds its own shape**, in ink on paper, the media pair the
 * other way up, so a code reads in both schemes. The corner squares take
 * their own color where a page gives them one.
 *
 * **A code that does not fit holds its fallback** in the square, centered,
 * in the code's own ink, so the page keeps its shape.
 *
 * **The square keeps its shape as it shrinks**: its height follows its
 * width, so a code in a row too narrow for it stays square.
 *
 * **The logo sits in the middle on its own ground**, with a quiet zone of
 * its own, and a mark of any shape is fitted inside it. The ground is paper
 * in either scheme, so the mark draws in the light scheme, its colors as on
 * a light page. The web moves it by
 * half its size from the middle, and the other way in a right-to-left page; a
 * phone centers it in the square.
 */
export default styles(
  root,
  {
    prefix: 'qr-code',
    hooks: [
      'background-color',
      'color',
      'fallback-padding',
      'finder-color',
      'logo-padding',
      'logo-radius',
      'logo-size',
      'radius',
      'size',
    ],
    own: ['qr-size'],
    stylesheet: 'qr-code/root/qr-code-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        aspectRatio: '1',
        backgroundColor: hook.backgroundColor(token('color-foreground-media')),
        borderRadius: hook.radius(token('radii-sm')),
        color: hook.color(token('color-surface-media')),
        display: 'block',
        inlineSize: own.qrSize,
        own: { qrSize: hook.size('12rem') },
        position: 'relative',
      }),
      /* A phone's views keep their size in a row by default, where the web's
         shrink to share it, as three codes side by side do on a phone. */
      rule(
        { platform: 'native' },
        { alignItems: 'center', flexShrink: 1, justifyContent: 'center', minInlineSize: 0 },
      ),
      rule({ print: true }, { printColorAdjust: web('economy') }),
    ]),
    on('code', [rule({ blockSize: '100%', display: 'block', inlineSize: '100%' })]),
    on('modules', [rule({ platform: 'native' }, { fill: 'currentColor' })]),
    on('fallback', [
      rule({
        alignItems: 'center',
        blockSize: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        overflowWrap: 'anywhere',
        padding: hook.fallbackPadding(token('space-md')),
        textAlign: 'center',
      }),
    ]),
    on('finders', [rule({ fill: hook.finderColor('currentColor') })]),
    on('logo', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor(token('color-foreground-media')),
        borderRadius: hook.logoRadius(token('radii-sm')),
        boxSizing: 'border-box',
        colorScheme: 'light',
        display: 'flex',
        justifyContent: 'center',
        maxBlockSize: hook.logoSize('27%'),
        maxInlineSize: hook.logoSize('27%'),
        minBlockSize: hook.logoSize('27%'),
        minInlineSize: hook.logoSize('27%'),
        padding: hook.logoPadding('6%'),
        position: 'absolute',
      }),
      rule(
        { platform: 'web' },
        { insetBlockStart: '50%', insetInlineStart: '50%', translate: '-50% -50%' },
      ),
      /* A phone draws no plate where no mark is passed, and sizes an icon
         passed in by number, the plate less its padding, which the web's
         fill of the plate below gives it. */
      rule({ part: { hidden: true }, platform: 'native' }, { display: 'none' }),
      rule({ platform: 'native' }, { '--icon-size': product(own.qrSize, 0.15) }),
    ]),
    on({ part: 'logo', selector: ':host(:dir(rtl)) [part="logo"]' }, [
      rule({ platform: 'web' }, { translate: '50% -50%' }),
    ]),
    on({ region: 'logo', slotted: '*' }, [
      rule({ blockSize: '100%', inlineSize: '100%', objectFit: 'contain' }),
    ]),
    on({ part: 'logo', selector: '[part="logo"][hidden]' }, [
      rule({ platform: 'web' }, { display: 'none' }),
    ]),
  ],
)

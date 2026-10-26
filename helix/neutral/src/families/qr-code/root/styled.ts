import { native, product, token, web } from '../../../style.js'
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
    hooks: {
      backgroundColor: token('color-foreground-media'),
      color: token('color-surface-media'),
      fallbackPadding: token('space-md'),
      finderColor: 'currentColor',
      logoPadding: '6%',
      logoRadius: token('radii-sm'),
      logoSize: '27%',
      radius: token('radii-sm'),
      size: '12rem',
    },
    own: { qrSize: null },
    stylesheet: 'qr-code/root/qr-code-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        aspectRatio: '1',
        backgroundColor: hook.backgroundColor,
        borderRadius: hook.radius,
        color: hook.color,
        display: 'block',
        inlineSize: own.qrSize,
        own: { qrSize: hook.size },
        position: 'relative',
      }),
      /* A phone's views keep their size in a row by default, where the web's
         shrink to share it, as three codes side by side do on a phone. */
      native([
        rule({ alignItems: 'center', flexShrink: 1, justifyContent: 'center', minInlineSize: 0 }),
      ]),
      rule({ print: true }, { web: { printColorAdjust: 'economy' } }),
    ]),
    on('code', [rule({ blockSize: '100%', display: 'block', inlineSize: '100%' })]),
    on('modules', [native([rule({ fill: 'currentColor' })])]),
    on('fallback', [
      rule({
        alignItems: 'center',
        blockSize: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        overflowWrap: 'anywhere',
        padding: hook.fallbackPadding,
        textAlign: 'center',
      }),
    ]),
    on('finders', [rule({ fill: hook.finderColor })]),
    on('logo', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor,
        borderRadius: hook.logoRadius,
        boxSizing: 'border-box',
        colorScheme: 'light',
        display: 'flex',
        justifyContent: 'center',
        maxBlockSize: hook.logoSize,
        maxInlineSize: hook.logoSize,
        minBlockSize: hook.logoSize,
        minInlineSize: hook.logoSize,
        padding: hook.logoPadding,
        position: 'absolute',
      }),
      web([rule({ insetBlockStart: '50%', insetInlineStart: '50%', translate: '-50% -50%' })]),
      /* A phone draws no plate where no mark is passed, and sizes an icon
         passed in by number, the plate less its padding, which the web's
         fill of the plate below gives it. */
      native([
        rule({ hidden: true }, { display: 'none' }),
        rule({ '--icon-size': product(own.qrSize, 0.15) }),
      ]),
    ]),
    on('logo', [web([rule({ dir: 'rtl' }, { translate: '50% -50%' })])]),
    on({ region: 'logo', slotted: '*' }, [
      rule({ blockSize: '100%', inlineSize: '100%', objectFit: 'contain' }),
    ]),
    on('logo', [web([rule({ part: { hidden: true } }, { display: 'none' })])]),
  ],
)

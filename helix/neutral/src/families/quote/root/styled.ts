import printEconomy from '../../../fragments/print-economy.js'
import { inherit, quote, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Quote's styled tier, which writes `helix/styled/src/quote/root/quote-root.generated.css`.
 *
 * **Quieter than the prose it sits in.** A quotation is somebody else
 * speaking inside a sentence that is yours, so it reads as an aside: the
 * italic says it is set apart, and the muted ink says how far. It keeps the
 * paragraph's face and weight until a page names others.
 *
 * **The marks are the platform's on the web**, where the `<q>` sets them, and
 * the table's on a phone, which has no `<q>`: an opening mark before the
 * quotation and a closing one after it, in its language and at its depth.
 */
export default styles(
  root,
  {
    prefix: 'quote',
    hooks: ['color', 'font-family', 'font-style', 'font-weight'],
    stylesheet: 'quote/root/quote-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    on('host', [rule({ display: 'inline', font: inherit() })]),
    on('quote', [
      rule({
        color: hook.color(token('color-foreground-muted')),
        font: inherit(),
        fontFamily: hook.fontFamily(inherit()),
        fontStyle: hook.fontStyle('italic'),
        fontWeight: hook.fontWeight(inherit()),
      }),
    ]),
    /* The marks a `<q>` draws on the web, which a phone draws from these. */
    on({ before: 'quote' }, [
      rule({ platform: 'native' }, { content: quote('open') }),
      /* `no-open-quote` draws nothing and still counts the level, so a quote
         nested inside one without marks takes the inner marks. */
      rule({ 'no-marks': true }, { content: quote('no-open') }),
    ]),
    on({ after: 'quote' }, [
      rule({ platform: 'native' }, { content: quote('close') }),
      rule({ 'no-marks': true }, { content: quote('no-close') }),
    ]),
    /* The marks and the slant print, with no fill behind them. */
    include(printEconomy),
  ],
)

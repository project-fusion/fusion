import { token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * The row of tokens a field draws, and the count of those it folded: what the
 * shared tags sheet holds, for Combobox, Filter Input, Date Input, and Time Input.
 *
 * **The tokens stand in the field's own line**, `display: contents` on the web, so
 * they wrap with the text field. The field's frame and the tokens themselves stay
 * with each family. A phone's field lays its tags out in a row of its own.
 *
 * **Under `expandable` the count is a button** on the web, which a family with the
 * button's selector writes `:where(button)[part="rest"]`, as this does.
 */
export default fragment('tags', { parts: ['tags', 'rest'] }, ({ on, rule }) => [
  on('tags', [rule({ display: web('contents') })]),
  /* Written out: zeroed at the weight of the rule under it, so the order decides. */
  on({ part: 'rest', selector: ':where(button)[part="rest"]' }, [
    web([rule({ all: 'unset', boxSizing: 'border-box' })]),
  ]),
  on('rest', [
    rule({
      alignSelf: 'center',
      color: token('color-foreground-muted'),
      flex: '0 0 auto',
      fontFamily: token('font-sans'),
      fontSize: token('text-xs'),
      fontWeight: token('weight-medium'),
      whiteSpace: 'nowrap',
    }),
  ]),
  /* Written out: only where it is a control, so a word that answers nothing does
     not invite a press. */
  on({ part: 'rest', selector: 'button[part="rest"]' }, [
    web([
      rule({
        borderRadius: token('radii-sm'),
        cursor: 'pointer',
        transition: ['color', token('duration-fast'), token('easing-standard')],
      }),
    ]),
  ]),
  on({ part: 'rest', selector: 'button[part="rest"]:hover' }, [
    web([rule({ color: token('color-foreground') })]),
  ]),
  on({ part: 'rest', selector: 'button[part="rest"]:focus-visible' }, [
    web([
      rule({
        outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
        outlineOffset: token('size-focus-offset'),
      }),
    ]),
  ]),
  on({ part: 'rest', selector: 'button[part="rest"] svg' }, [
    web([
      rule({
        blockSize: token('size-icon-tight'),
        flex: '0 0 auto',
        inlineSize: token('size-icon-tight'),
      }),
    ]),
  ]),
])

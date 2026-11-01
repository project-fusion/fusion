import { fn, native, product, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * A component that is dense by nature, as a whole: every step a control reads,
 * at `sm`, so a control inside matches the same control under
 * `data-density="sm"`. Taken in before the family's own rules. A scope on one
 * part writes these itself.
 */
export default fragment('density-sm', { parts: [] }, ({ on, rule }) => [
  on('host', [
    rule({
      '--helix-size-checkbox': token('size-checkbox-sm'),
      '--helix-size-checkbox-loose': product(token('size-checkbox'), 1.2),
      '--helix-size-checkbox-tight': product(token('size-checkbox'), 0.8),
      '--helix-size-control': token('size-control-sm'),
      '--helix-size-control-loose': product(token('size-control'), 1.2),
      '--helix-size-control-tight': web(fn('round', product(token('size-control'), 0.8), '1px')),
      '--helix-size-icon': token('size-icon-sm'),
      '--helix-size-icon-loose': product(token('size-icon'), 1.2),
      '--helix-size-icon-tight': product(token('size-icon'), 0.8),
      '--helix-size-switch': token('size-switch-sm'),
      '--helix-size-tag': token('size-tag-sm'),
      '--helix-space-control': token('space-sm'),
      '--helix-space-field': token('space-xs'),
      '--helix-text-control': token('text-control-sm'),
      '--helix-text-field': token('text-sm'),
      '--helix-text-field-label': token('text-xs'),
    }),
    /* A phone has no `round()`, and its renderer rounds every length it resolves. */
    native([rule({ '--helix-size-control-tight': product(token('size-control'), 0.8) })]),
  ]),
])

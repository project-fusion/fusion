import { fn, product, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * A component that is dense by nature, as a whole: every step a control reads,
 * at `sm`, so a control inside matches the same control under
 * `data-density="sm"`, each derived step rounded as the token layer
 * rounds it. Taken in before the family's own rules. A scope on one
 * part writes these itself.
 */
export default fragment('density-sm', { parts: [] }, ({ on, rule }) => [
  on('host', [
    rule({
      '--helix-size-checkbox': token('size-checkbox-sm'),
      '--helix-size-checkbox-loose': fn('round', product(token('size-checkbox'), 1.2), '1px'),
      '--helix-size-checkbox-tight': fn('round', product(token('size-checkbox'), 0.8), '1px'),
      '--helix-size-control': token('size-control-sm'),
      '--helix-size-control-loose': fn('round', product(token('size-control'), 1.2), '1px'),
      '--helix-size-control-tight': fn('round', product(token('size-control'), 0.8), '1px'),
      '--helix-size-icon': token('size-icon-sm'),
      '--helix-size-icon-loose': fn('round', product(token('size-icon'), 1.2), '2px'),
      '--helix-size-icon-tight': fn('round', product(token('size-icon'), 0.8), '2px'),
      '--helix-size-switch': token('size-switch-sm'),
      '--helix-size-tag': token('size-tag-sm'),
      '--helix-space-control': token('space-sm'),
      '--helix-space-field': token('space-xs'),
      '--helix-space-row-bleed': token('space-2xs'),
      '--helix-text-control': token('text-control-sm'),
      '--helix-text-field': token('text-sm'),
      '--helix-text-field-label': token('text-xs'),
    }),
  ]),
])

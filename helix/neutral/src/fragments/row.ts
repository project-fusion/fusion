import { token } from '../style.js'
import { fragment } from '../table.js'

/**
 * The row of a list that opens from a control: Option in a Select, Combobox, or
 * Listbox, and Item in a Menu. One height, type, and weight, so a menu and a
 * select opened side by side read as one kind of list, a step below the control
 * they open from, at whatever density that control is in.
 *
 * **Rows sit against each other**, so a box reaching past a row would take the
 * press from the row beside it. On a touch screen the row itself reaches the
 * target.
 */
export default fragment('row', { parts: ['item'] }, ({ on, rule }) => [
  on('item', [
    rule({
      boxSizing: 'border-box',
      fontFamily: token('font-sans'),
      fontSize: token('text-control'),
      fontWeight: token('weight-regular'),
      minBlockSize: token('size-control-tight'),
      web: { userSelect: 'none' },
    }),
    rule({ coarsePointer: true }, { minBlockSize: token('size-target') }),
  ]),
])

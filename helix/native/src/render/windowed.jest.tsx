import { describe, expect, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { Cell, HeldRow } from './windowed'

const ROW = { at: 0, header: false, key: 'held' }

describe('a cell of a windowed list', () => {
  const draw = (held: string | undefined, item: typeof ROW | readonly (typeof ROW)[]) => {
    const focused = jest.fn()
    return render(
      <HeldRow.Provider value={held}>
        <Cell item={item} onFocusCapture={focused} />
      </HeldRow.Provider>,
    ).then(() => focused)
  }

  test('asks the list to keep it, as a focused cell does, while it holds the held row', async () => {
    expect(await draw('held', ROW)).toHaveBeenCalledTimes(1)
  })

  test('asks the same for a line of columns holding the held row', async () => {
    expect(await draw('held', [{ ...ROW, key: 'other' }, ROW])).toHaveBeenCalledTimes(1)
  })

  test('asks nothing for another row, or with none held', async () => {
    expect(await draw('another', ROW)).not.toHaveBeenCalled()
    expect(await draw(undefined, ROW)).not.toHaveBeenCalled()
  })
})

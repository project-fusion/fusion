import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { HelixRoot } from '../index'
import { HelixObjectInspector } from './object-inspector/index.native'

const VALUE = { id: 'dpl', link: 'https://fusion.dev', meta: { author: 'Ada' }, open: true }

const draw = async (props: Record<string, unknown> = {}) => {
  const Inspector = HelixObjectInspector as unknown as (given: Record<string, unknown>) => React.ReactNode
  return render(
    <HelixRoot>
      <Inspector label="Deployment" value={VALUE} {...props} />
    </HelixRoot>,
  )
}

describe('object inspector', () => {
  test('a row says its level and place to a screen reader, and whether a branch is open', async () => {
    await draw()
    const press = (words: string) => {
      for (let at = screen.getByText(words).parent; at; at = at.parent) {
        if (at.props.accessibilityValue !== undefined) {
          return at
        }
      }
      throw new Error(`no row says "${words}"`)
    }
    expect(press('meta').props.accessibilityValue.text).toBe('Level 2, 3 of 4')
    expect(press('meta').props.accessibilityState.expanded).toBe(false)
    expect(press('id').props.accessibilityState.expanded).toBeUndefined()
  })

  test('a press on a branch opens it, and sends what the web sends', async () => {
    const onToggle = jest.fn()
    const onBeforeOpen = jest.fn()
    await draw({ onBeforeOpen, onToggle })
    expect(screen.queryByText('author')).toBeNull()
    await fireEvent.press(screen.getByText('meta'))
    expect(screen.getByText('author')).toBeTruthy()
    expect(onBeforeOpen).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  test('`renderValue` draws a value and is told its entry, and `undefined` leaves the rest', async () => {
    const seen: unknown[] = []
    await draw({
      renderValue: (value: unknown, entry: { readonly key?: string }) => {
        if (entry.key !== 'link') {
          return undefined
        }
        seen.push(entry)
        return <Text>{`link to ${String(value)}`}</Text>
      },
    })
    expect(screen.getByText('link to https://fusion.dev')).toBeTruthy()
    expect(screen.getByText('"dpl"')).toBeTruthy()
    expect(seen[0]).toEqual({ depth: 1, key: 'link', path: '/link', type: 'string' })
  })

  test('a new value keeps the branches a reader opened', async () => {
    const view = await draw()
    await fireEvent.press(screen.getByText('meta'))
    const Inspector = HelixObjectInspector as unknown as (given: Record<string, unknown>) => React.ReactNode
    await view.rerender(
      <HelixRoot>
        <Inspector label="Deployment" value={{ ...VALUE, id: 'next' }} />
      </HelixRoot>,
    )
    expect(screen.getByText('author')).toBeTruthy()
    expect(screen.getByText('"next"')).toBeTruthy()
  })

  test('with nothing to show, the tree says so', async () => {
    await draw({ value: undefined })
    expect(screen.getByText('Nothing to show')).toBeTruthy()
  })
})

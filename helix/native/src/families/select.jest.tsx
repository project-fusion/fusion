import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { HelixRoot } from '../index'
import { HelixOption } from './option/index.native'
import { HelixSelect } from './select/index.native'

const draw = async (props: Record<string, unknown>, words = ['Apple', 'Banana']) =>
  render(
    <HelixRoot>
      <HelixSelect label="Fruit" {...props}>
        {words.map((one) => (
          <HelixOption key={one} value={one.toLowerCase()}>
            {one}
          </HelixOption>
        ))}
      </HelixSelect>
    </HelixRoot>,
  )

describe('Select on a phone', () => {
  it('says the placeholder while nothing is chosen, and draws no option while closed', async () => {
    await draw({})
    expect(screen.getByText('Choose')).toBeTruthy()
    expect(screen.queryByText('Apple')).toBeNull()
  })

  it('reads the chosen words from options a closed list does not draw', async () => {
    await draw({ defaultValue: 'banana' })
    expect(screen.getByText('Banana')).toBeTruthy()
  })

  it('writes several chosen options as a list', async () => {
    await draw({ defaultValue: 'apple,banana', multiple: true })
    expect(screen.getByText(/Apple.*Banana/)).toBeTruthy()
  })

  it('reads the words of `items`', async () => {
    await draw({ defaultValue: 'b', items: [{ label: 'Bee', value: 'b' }] }, [])
    expect(screen.getByText('Bee')).toBeTruthy()
  })

  it('drops a chosen option that left out of the value', async () => {
    const view = await draw({ defaultValue: 'banana' })
    await view.rerender(
      <HelixRoot>
        <HelixSelect defaultValue="banana" label="Fruit">
          <HelixOption value="apple">Apple</HelixOption>
        </HelixSelect>
      </HelixRoot>,
    )
    expect(screen.getByText('Choose')).toBeTruthy()
  })

  it('does not open while disabled', async () => {
    const opened = jest.fn()
    await draw({ disabled: true, onToggle: opened })
    await fireEvent.press(screen.getByText('Choose'))
    expect(opened).not.toHaveBeenCalled()
  })
})

import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { createRef } from 'react'
import { TextInput, type TextInputInstance } from 'react-native'
import { nativeForm } from './form'

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeForm', () => {
  test('does nothing with a value, a verdict, or a submit', async () => {
    const ref = createRef<TextInputInstance>()
    await render(<TextInput ref={ref} />)
    const node = ref.current as TextInputInstance
    const props = jest.spyOn(node, 'setNativeProps')
    const blur = jest.spyOn(node, 'blur')
    expect(nativeForm.value(node, 'Ada')).toBeUndefined()
    expect(nativeForm.validity(node, ['valueMissing'], 'Enter a name.', node)).toBeUndefined()
    expect(nativeForm.submit(node)).toBeUndefined()
    expect(props).not.toHaveBeenCalled()
    expect(blur).not.toHaveBeenCalled()
  })
})

/*
 * The generated Input, drawn from its real intermediate form: a TextInput
 * named by its label and described by its hint, with the keyboard, the Enter
 * key, and autofill its attributes ask for, an edit that asks first and puts
 * the text back where it is refused, `change` once the reader leaves the
 * field, the clear button, and the message that takes the hint's place once
 * the reader has had a go. `test:native` writes the component beside this
 * file, as the styled package's build writes the one it ships.
 */
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { createRef, type ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import type { FieldHandle } from '../machines/validation'
import { HelixTheme, useTokens } from '../theme/helix-theme'
import { HelixInput, type HelixInputProps } from './input/index.native'

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
})

/** Shows a token's value, as the theme resolves it. */
const Token = ({ name }: { readonly name: string }) => (
  <View testID={`token ${name} ${useTokens()[name]}`} />
)

const TOKENS = ['color-border', 'color-danger', 'color-foreground-muted', 'color-primary']

const themed = (children: ReactNode) => (
  <HelixTheme mode="light">
    {children}
    {TOKENS.map((name) => (
      <Token key={name} name={name} />
    ))}
  </HelixTheme>
)

/** A token's value, as the theme drew it. */
const token = (name: string): string =>
  String(screen.getByTestId(new RegExp(`^token ${name} `)).props.testID).slice(
    `token ${name} `.length,
  )

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** The one field a reader types into, which every spec here names. */
const field = () => {
  const found = screen.getAllByLabelText(/./).find((node) => node.type === 'TextInput')
  if (found === undefined) {
    throw new Error('no field is drawn')
  }
  return found
}

/** The box around the field, which draws its edge. */
const frame = () => field().parent as unknown as { props: { style?: unknown } }

/** Each event a handler heard, by its name, with the text its target held. */
const heard = (): { events: string[]; props: Partial<HelixInputProps> } => {
  const events: string[] = []
  const take = (name: string) => (event: { target: { value?: string } }) => {
    events.push(`${name} ${event.target.value ?? ''}`)
  }
  return {
    events,
    props: {
      onChange: take('change'),
      onClear: take('clear'),
      onInput: take('input'),
    },
  }
}

const Input = (props: HelixInputProps) => themed(<HelixInput {...props} />)

describe('the generated Input', () => {
  describe('a password with reveal', () => {
    const toggle = () => screen.getByRole('togglebutton', { name: 'Show password' })

    test('hides its text, and the press shows it and hides it again', async () => {
      const typed = () => screen.getByLabelText('Password')
      await render(
        <HelixTheme mode="light">
          <HelixInput defaultValue="hunter2" label="Password" reveal type="password" />
        </HelixTheme>,
      )
      expect(typed().props.secureTextEntry).toBe(true)
      expect(toggle().props.accessibilityState.checked).toBe(false)
      await fireEvent.press(toggle())
      expect(typed().props.secureTextEntry).toBe(false)
      expect(toggle().props.accessibilityState.checked).toBe(true)
      await fireEvent.press(toggle())
      expect(typed().props.secureTextEntry).toBe(true)
    })

    test('draws no press on another type, or without reveal', async () => {
      await render(
        <HelixTheme mode="light">
          <HelixInput label="Email" reveal type="email" />
          <HelixInput label="Password" type="password" />
        </HelixTheme>,
      )
      expect(screen.queryByRole('togglebutton')).toBeNull()
    })

    test('does nothing while disabled', async () => {
      await render(
        <HelixTheme mode="light">
          <HelixInput defaultValue="x" disabled label="Password" reveal type="password" />
        </HelixTheme>,
      )
      await fireEvent.press(toggle())
      expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true)
    })
  })

  describe('a number', () => {
    test('says what is wrong with it once the reader leaves', async () => {
      await render(
        <HelixTheme mode="light">
          <HelixInput label="Age" max="10" min="2" step="2" type="number" />
        </HelixTheme>,
      )
      const age = screen.getByLabelText('Age')
      for (const [text, said] of [
        ['20', 'Use 10 or less.'],
        ['1', 'Use 2 or more.'],
        ['3', 'Use 2 or 4.'],
      ] as const) {
        await fireEvent(age, 'focus')
        await fireEvent.changeText(age, text)
        await fireEvent(age, 'blur')
        expect(screen.getByText(said)).toBeTruthy()
      }
    })

    test('stepUp and stepDown on its ref move it and keep it on its grid', async () => {
      const ref = createRef<
        FieldHandle & { stepDown: (n?: number) => void; stepUp: (n?: number) => void }
      >()
      const seen: unknown[] = []
      await render(
        <HelixTheme mode="light">
          <HelixInput
            defaultValue="5"
            label="Age"
            max="9"
            min="1"
            onChange={(event) => seen.push(event.target.value)}
            ref={ref as never}
            step="2"
            type="number"
          />
        </HelixTheme>,
      )
      await act(async () => ref.current?.stepUp())
      await act(async () => ref.current?.stepUp(5))
      await act(async () => ref.current?.stepDown(2))
      expect(seen).toEqual(['7', '9', '5'])
    })
  })

  test('is a field named by its label and described by its hint, with its placeholder', async () => {
    await render(<Input hint="We never share it." label="Email" placeholder="you@example.com" />)
    expect(field().props.accessibilityLabel).toBe('Email')
    expect(field().props.accessibilityHint).toBe('We never share it.')
    expect(field().props.placeholder).toBe('you@example.com')
    expect(field().props.placeholderTextColor).toBe(token('color-foreground-muted'))
    expect(field().props.allowFontScaling).toBe(false)
  })

  test('takes `ariaLabel` as its name where it has no label', async () => {
    await render(<Input ariaLabel="Search the docs" />)
    expect(field().props.accessibilityLabel).toBe('Search the docs')
  })

  test('maps its type, inputmode, enterkeyhint, and autocomplete to the keyboard and autofill', async () => {
    await render(<Input autocomplete="email" enterkeyhint="send" label="Email" type="email" />)
    expect(field().props.keyboardType).toBe('email-address')
    expect(field().props.autoCapitalize).toBe('none')
    expect(field().props.enterKeyHint).toBe('send')
    expect(field().props.autoComplete).toBe('email')
    await render(<Input inputmode="numeric" label="Code" maxlength={6} type="password" />)
    expect(field().props.secureTextEntry).toBe(true)
    expect(field().props.inputMode).toBe('numeric')
    expect(field().props.maxLength).toBe(6)
  })

  test('asks before each edit, sends input, and sends change once the reader leaves', async () => {
    const { events, props } = heard()
    const asked: string[] = []
    await render(
      <Input
        {...props}
        label="Name"
        onBeforeChange={(event) => {
          asked.push(event.detail.value)
        }}
      />,
    )
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), 'A')
    await fireEvent.changeText(field(), 'Ad')
    expect(asked).toEqual(['A', 'Ad'])
    expect(field().props.value).toBe('Ad')
    await fireEvent(field(), 'blur')
    expect(events).toEqual(['input A', 'input Ad', 'change Ad'])
  })

  test('puts the text back where a handler refuses an edit', async () => {
    const { events, props } = heard()
    await render(
      <Input
        {...props}
        defaultValue="Ada"
        label="Name"
        onBeforeChange={(event) => {
          event.preventDefault()
        }}
      />,
    )
    await fireEvent.changeText(field(), 'Adam')
    expect(field().props.value).toBe('Ada')
    expect(events).toEqual([])
  })

  test('takes a written value with nothing sent, and the reader still types from it', async () => {
    const { events, props } = heard()
    const view = await render(<Input {...props} label="Name" value="Ada" />)
    expect(field().props.value).toBe('Ada')
    await view.rerender(<Input {...props} label="Name" value="Grace" />)
    expect(field().props.value).toBe('Grace')
    await fireEvent.changeText(field(), 'Grace H')
    expect(field().props.value).toBe('Grace H')
    expect(events).toEqual(['input Grace H'])
  })

  test('clears its text, sends input, change, and clear, and draws no clear button once empty', async () => {
    const { events, props } = heard()
    await render(<Input {...props} clearable defaultValue="Ada" label="Name" />)
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }))
    expect(field().props.value).toBe('')
    expect(events).toEqual(['input ', 'change ', 'clear '])
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  test('takes no edit and draws no clear button while disabled or read-only', async () => {
    await render(<Input clearable defaultValue="Ada" disabled label="Name" />)
    expect(field().props.editable).toBe(false)
    expect(field().props.accessibilityState).toEqual({ disabled: true })
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
    expect(styleOf(frame()).opacity).toBe(0.5)
    await render(<Input clearable defaultValue="Ada" label="Name" readonly />)
    expect(field().props.editable).toBe(false)
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
    expect(styleOf(frame()).backgroundColor).toBe('transparent')
  })

  test('rings its frame in the primary color while the field has focus', async () => {
    await render(<Input label="Name" />)
    expect(styleOf(frame()).borderColor).toBe(token('color-border'))
    await fireEvent(field(), 'focus')
    expect(styleOf(frame()).borderColor).toBe(token('color-primary'))
  })
})

describe('a required Input', () => {
  test('draws its mark after the label’s last word, in the label’s own line', async () => {
    await render(<Input label="Name" required />)
    /* One paragraph holds the words and the mark, as the web flows them. */
    expect(screen.getByText('Name*')).toBeTruthy()
    expect(StyleSheet.flatten(screen.getByText('*').props.style).color).toBe(token('color-danger'))
  })

  test('says what is wrong in the hint’s place once a change has given the reader a go', async () => {
    await render(<Input hint="As on your card." label="Name" required />)
    expect(screen.getByText('As on your card.')).toBeTruthy()
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), 'A')
    await fireEvent.changeText(field(), '')
    expect(screen.queryByRole('alert')).toBeNull()
    await fireEvent.changeText(field(), 'A')
    await fireEvent(field(), 'blur')
    /* Once a change has given the reader a go, the verdict follows each edit. */
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), '')
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Fill in the field.')).toBeTruthy()
    expect(screen.queryByText('As on your card.')).toBeNull()
    expect(styleOf(frame()).borderColor).toBe(token('color-danger'))
  })

  test('holds its text to its length, pattern, and type once the reader has had a go', async () => {
    await render(<Input label="Email" minlength={8} type="email" />)
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), 'ada')
    await fireEvent(field(), 'blur')
    expect(screen.getByText('Enter an email address.')).toBeTruthy()
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), 'a@b.co')
    await fireEvent(field(), 'blur')
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy()
    await fireEvent(field(), 'focus')
    await fireEvent.changeText(field(), 'ada@example.com')
    await fireEvent(field(), 'blur')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('answers `validate()` on its ref', async () => {
    const ref = createRef<FieldHandle>()
    await render(<Input label="Name" ref={ref} required />)
    let answer = true
    await act(() => {
      answer = ref.current?.validate() ?? true
    })
    expect(answer).toBe(false)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  test('shows the page’s own message at once', async () => {
    await render(<Input feedback="That name is taken." label="Name" />)
    expect(screen.getByText('That name is taken.')).toBeTruthy()
    expect(styleOf(frame()).borderColor).toBe(token('color-danger'))
  })
})

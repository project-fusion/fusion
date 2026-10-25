import { describe, expect, test } from '@jest/globals'
import { act, renderHook } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import type { HostInstance } from 'react-native'
import { ThemeProvider } from '../theme/theme'
import { useSpread } from './scroll-parts'

const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <ThemeProvider tokens={{}}>{children}</ThemeProvider>
)

/** A content view that reports `wide` as the width what it holds runs to. */
const content = (wide: number) => ({
  current: { scrollWidth: wide } as unknown as HostInstance | null,
})

describe('useSpread', () => {
  test('lays content across out at the frame’s width while what it holds fits', async () => {
    const view = content(300)
    const { result } = await renderHook(() => useSpread(true, view), { wrapper })
    expect(result.current.width).toBe('100%')
    await act(() => result.current.framed(320))
    expect(result.current.width).toBe('100%')
  })

  test('lays it out at the width what it holds runs to, and at the frame’s again once the frame changes', async () => {
    const view = content(480)
    const { result } = await renderHook(() => useSpread(true, view), { wrapper })
    await act(() => result.current.framed(320))
    expect(result.current.width).toBe(480)
    view.current = { scrollWidth: 300 } as unknown as HostInstance
    await act(() => result.current.framed(360))
    expect(result.current.width).toBe('100%')
  })

  test('sets no width on content that scrolls down', async () => {
    const { result } = await renderHook(() => useSpread(false, content(480)), { wrapper })
    expect(result.current.width).toBeUndefined()
  })
})

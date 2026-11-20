/* A screen on a phone: a scroll view, since a phone has no document that
   scrolls, with App Header's inline padding as its margins, as the web's
   column has, so the page's edges line up with the bar's. It clears the home
   indicator with the system's own inset. */
import { ScrollArea, useTokens } from '@fusion.dev/helix-native'
import type { ReactNode } from 'react'

export function Page({ children }: { readonly children?: ReactNode }) {
  const tokens = useTokens()
  const space = (name: string): number => {
    const value = tokens[name]
    return typeof value === 'number' ? value : 0
  }
  return (
    <ScrollArea
      contentContainerStyle={{
        paddingBottom: space('space-3xl'),
        paddingHorizontal: space('space-lg'),
        paddingTop: space('space-lg'),
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
    </ScrollArea>
  )
}

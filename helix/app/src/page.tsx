import { useInheritedText, useTokens } from '@fusion.dev/helix-native'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Glyph } from './glyph'
import { color, MONOSPACE, points } from './tokens'

/** A list whose row labels line up with the page's words: the rows' own
    padding hangs into the page's margin. */
export function Bleed({ children }: { readonly children: ReactNode }) {
  const tokens = useTokens()
  return <View style={{ marginHorizontal: -points(tokens, 'space-md') }}>{children}</View>
}

/** The mark at the end of a row that opens a screen. */
export function Onward() {
  const tokens = useTokens()
  return <Glyph color={color(tokens, 'color-foreground-muted')} name="caret-end" size={16} />
}

/** Words with `code` in them, in the text style the region around gives. */
export function Described({ children }: { readonly children: string }) {
  const text = useInheritedText()
  return (
    <Text allowFontScaling={text.fontSize === undefined} style={text}>
      {children.split('`').map((part, index) =>
        index % 2 === 1 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the parts never move.
          <Text key={index} style={{ fontFamily: MONOSPACE }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  )
}

export const styles = StyleSheet.create({
  lead: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  page: { gap: 16, paddingBottom: 48, paddingHorizontal: 16, paddingTop: 8 },
  section: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 16,
    textTransform: 'uppercase',
  },
})

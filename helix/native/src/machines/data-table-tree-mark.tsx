/**
 * The mark a row header's cell holds in a table drawn from an array whose rows
 * nest, as the web's `toggle` part is: its row's depth before it, the mark on a
 * row that holds rows, and the room of one on a row that holds none.
 */
import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { AroundContext, useAround } from '../render/around'
import { madeFor } from '../render/made'
import { useTokens } from '../theme/helix-theme'
import { useTheme } from '../theme/theme'
import { NOTHING } from './table-cell-at'

/** What the mark draws for one row. */
interface TreeMarkProps {
  readonly branch: boolean
  readonly label: string
  /** How deep the row is, from 1. */
  readonly level: number
  readonly onPress: () => void
  readonly open: boolean
}

/** `size-icon-tight` and `space-2xs`, in rems. */
const SIZE = 1
const GAP = 0.25

export const TreeMark = ({ branch, label, level, onPress, open }: TreeMarkProps): ReactNode => {
  const { spaceRem } = useTheme()
  const icon = madeFor('helix-icon')
  /* The icon takes its ink from the text around it, as on the web's `toggle`. */
  const color = String(useTokens()['color-foreground-muted'])
  const outer = useAround() ?? NOTHING
  const around = { ...outer, text: { ...outer.text, color } }
  const size = SIZE * spaceRem
  const gap = GAP * spaceRem
  const box = { height: size, marginEnd: gap, marginStart: (level - 1) * (size + gap), width: size }
  return branch ? (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      hitSlop={(44 - size) / 2}
      onPress={onPress}
      style={{ ...box, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={open ? { transform: [{ rotate: '90deg' }] } : undefined}>
        <AroundContext.Provider value={around}>
          {icon === undefined ? null : <icon.Component hooks={{ size }} name="caret-right" />}
        </AroundContext.Provider>
      </View>
    </Pressable>
  ) : (
    <View style={box} />
  )
}

import { HelixButton } from '@fusion.dev/helix/button'
import { useTokens } from '@fusion.dev/helix-native'
import { type ReactNode, useState } from 'react'
import { Text } from 'react-native'
import { CheckDial, CheckDrawer } from './gesture-forms'
import { styles } from './page'
import { color } from './tokens'

/* **A swipe and a long press, checked on a phone before any family takes
   one.** The drawer stands on the bottom edge and opens at half: a drag on
   its handle moves it, a drag down the list scrolls the list until the list
   stands at its top and then moves the drawer, and a release rests it at
   half or whole, or swipes it away. The round button presses on a quick tap
   and opens its panel on a long press. */

/** The rows the drawer's list scrolls through. */
const ROWS = Array.from({ length: 24 }, (_, at) => `Filter ${at + 1}`)

/** Words in the page's text. */
function Words({
  children,
  muted = false,
}: {
  readonly children: ReactNode
  readonly muted?: boolean
}) {
  const tokens = useTokens()
  return (
    <Text
      style={[
        styles.lead,
        { color: color(tokens, muted ? 'color-foreground-muted' : 'color-foreground') },
      ]}
    >
      {children}
    </Text>
  )
}

/** The drawer and the long-press trigger, and what each last told the page. */
export function Gestures() {
  const [drawer, setDrawer] = useState(false)
  const [dial, setDial] = useState(false)
  const [told, setTold] = useState('nothing yet')
  return (
    <>
      <Words muted>Told: {told}</Words>
      <HelixButton emphasis="solid" onPress={() => setDrawer(true)}>
        Open the drawer
      </HelixButton>
      <CheckDrawer
        handle={<Words>Drag to rest at half or whole, or swipe away</Words>}
        onBeforeClose={() => {
          setTold('the drawer closed')
          setDrawer(false)
        }}
        open={drawer}
        snapPoints="0.5 1"
      >
        {ROWS.map((row) => (
          <Words key={row}>{row}</Words>
        ))}
      </CheckDrawer>
      <CheckDial
        label={<Words>Add</Words>}
        onBeforeClose={() => {
          setTold('the actions closed')
          setDial(false)
        }}
        onBeforeOpen={() => {
          setTold('a long press opened the actions')
          setDial(true)
        }}
        onPress={() => setTold('a quick press')}
        open={dial}
      >
        <Words>New file</Words>
        <Words>New folder</Words>
      </CheckDial>
    </>
  )
}

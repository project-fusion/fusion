import { HelixButton } from '@fusion.dev/helix/button'
import { ScrollArea, useTokens } from '@fusion.dev/helix-native'
import { type ReactNode, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { CheckDialog, CheckMenu } from './layer-forms'
import { styles } from './page'
import { color, points } from './tokens'

/* **The layer host, checked on a phone before any family opens a layer.**
   The dialog is modal, a card in a wide window and a sheet below 30rem,
   over a scrim, with a field that raises the keyboard. Two menus sit near
   the end of a list that scrolls: Filters is a popover at every width, placed
   against its trigger with an arrow, and turns above it where there is no
   room below; Sort is a sheet in a window narrower than 30rem and a popover
   in a wider one. Each sheet keeps its last row clear of the home
   indicator. */

/** The rows of the list the menus' triggers scroll in. */
const ROWS = Array.from(
  { length: 8 },
  (_, at) => `Row ${at + 1} of the list the menus' triggers scroll in.`,
)

/** Words in the page's text, as the gallery writes its notes. */
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

/** The dialog and the two menus, and what each last told the page. */
export function Layers() {
  const tokens = useTokens()
  const [dialog, setDialog] = useState(false)
  const [filters, setFilters] = useState(false)
  const [sort, setSort] = useState(false)
  const [told, setTold] = useState('nothing yet')
  const field = {
    borderColor: color(tokens, 'color-border'),
    borderRadius: points(tokens, 'radii-sm'),
    borderWidth: 1,
    color: color(tokens, 'color-foreground'),
    padding: points(tokens, 'space-sm'),
  }
  return (
    <>
      <Words muted>Told: {told}</Words>
      <HelixButton emphasis="solid" onPress={() => setDialog(true)}>
        Open the dialog
      </HelixButton>
      <CheckDialog
        closedby="any"
        onBeforeClose={() => {
          setTold('the dialog closed')
          setDialog(false)
        }}
        open={dialog}
      >
        <Words>Rename the file</Words>
        <Words muted>A press outside, Escape, or back closes the dialog.</Words>
        <TextInput accessibilityLabel="File name" defaultValue="Quarterly report" style={field} />
        <HelixButton onPress={() => setDialog(false)}>Save</HelixButton>
      </CheckDialog>
      <ScrollArea style={{ maxHeight: 320 }}>
        <View style={{ gap: points(tokens, 'space-md') }}>
          {ROWS.map((row) => (
            <Words key={row} muted>
              {row}
            </Words>
          ))}
          <View style={{ flexDirection: 'row', gap: points(tokens, 'space-md') }}>
            <CheckMenu
              onBeforeClose={() => {
                setTold('the filters closed')
                setFilters(false)
              }}
              open={filters}
              presentation="popover"
              trigger={<HelixButton onPress={() => setFilters(!filters)}>Filters</HelixButton>}
            >
              <Words>Show archived files</Words>
              <HelixButton onPress={() => setFilters(false)}>Done</HelixButton>
            </CheckMenu>
            <CheckMenu
              onBeforeClose={() => {
                setTold('the sort closed')
                setSort(false)
              }}
              open={sort}
              trigger={<HelixButton onPress={() => setSort(!sort)}>Sort</HelixButton>}
            >
              <Words>Sort by name</Words>
              <Words>Sort by date</Words>
              <HelixButton onPress={() => setSort(false)}>Done</HelixButton>
            </CheckMenu>
          </View>
        </View>
      </ScrollArea>
    </>
  )
}

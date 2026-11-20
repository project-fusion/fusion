import { headless, number, Slot, string, Text, View } from '../../../render.js'

/**
 * Sandbox Status Bar's headless tier: a bar under a sandbox's panes, with
 * whatever is passed in at its start and at its end, where the caret is, and
 * the language being edited.
 *
 * **Its readouts are core's**, the same on both platforms: the caret's line
 * and column in `position-label`'s words, written without grouping, and the
 * language by the name an editor gives it, `HTML` for `html`, or as given.
 * Either is drawn only where there is something to say. A phone's sandbox is
 * read only and moves no caret, so there the caret's place is what the page
 * sets.
 *
 * **Held to `helix-sandbox-status-bar`.** `helix system check` compares the
 * props, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('sandbox-status-bar', {
  props: {
    column: number(),
    language: string(),
    line: number(),
    positionLabel: 'Ln {line}, Col {column}',
  },
  states: ['settled'],
  sandbox: {
    language: 'language',
    position: 'position',
  },
  render: ({ sandbox }) => (
    <>
      <Slot />
      {sandbox.position && (
        <View part="caret">
          <Text part="caret-words">{sandbox.position}</Text>
        </View>
      )}
      {sandbox.language && (
        <View part="language">
          <Text part="language-words">{sandbox.language}</Text>
        </View>
      )}
      <Slot name="end" />
    </>
  ),
})

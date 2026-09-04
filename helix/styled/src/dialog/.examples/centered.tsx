import './centered.css'

export function Example() {
  return (
    <>
      <helix-button
        command="--show"
        commandfor="discard"
        emphasis="solid"
        tone="danger"
        width="standard"
      >
        Discard changes
      </helix-button>

      <helix-dialog
        align="center"
        id="discard"
        label="Discard changes"
        size="sm"
      >
        <helix-icon
          name="warning-fill"
          slot="icon"
        ></helix-icon>
        <helix-text
          as="h2"
          slot="header"
        >
          Discard changes?
        </helix-text>
        <helix-text>Nine edits have not been saved. Closing now leaves them behind.</helix-text>
        {/* **No `width="standard"` on either, and the reason is arithmetic.**
            That axis sets a 200px floor, and its own note calls it a floor
            rather than a width: it exists so a lone short button does not look
            mean. Two of them plus a 12px gap need 412px, and a `sm` dialog is
            352px less 24px of padding a side, which is 304px. The row overflows
            by 108px, and because a centered dialog centers its footer it hangs
            54px off both edges with the focus ring clipped. */}
        <helix-flex
          gap="sm"
          slot="footer"
        >
          <helix-button
            emphasis="solid"
            tone="danger"
          >
            Discard
          </helix-button>
          <helix-button
            command="--close"
            commandfor="discard"
          >
            Keep editing
          </helix-button>
        </helix-flex>
      </helix-dialog>
    </>
  )
}

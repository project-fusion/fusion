import './command.css'

export function Example() {
  return (
    <>
      <helix-button command="--show" commandfor="command-chat" emphasis="outlined">
        <helix-icon name="magnifying-glass" slot="start" />
        Ask
        <helix-kbd keys="mod+k" slot="end" />
      </helix-button>

      <helix-dialog className="command" defaultOpen id="command-chat" label="Ask" size="lg">
        <helix-chat className="command-chat" label="Ask">
          <helix-chat-message author="me" state="sent">
            Which packages does the release touch?
          </helix-chat-message>

          <helix-chat-message author="them" separation="plain" state="sent">
            Eight, and two of them publish for the first time.
          </helix-chat-message>

          <helix-chat-composer placeholder="Ask anything" slot="composer" />
        </helix-chat>

        <helix-text slot="footer" tone="muted" variant="caption">
          <helix-kbd>Esc</helix-kbd>
          to dismiss
        </helix-text>
      </helix-dialog>
    </>
  )
}

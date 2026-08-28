import './command.css'

export function Example() {
  return (
    <>
      <helix-button command="--show" commandfor="command-chat" emphasis="outlined">
        {' '}
        <helix-icon name="magnifying-glass" slot="start"></helix-icon> Ask{' '}
        <helix-kbd keys="mod+k" slot="end"></helix-kbd>{' '}
      </helix-button>{' '}
      <helix-dialog className="command" default-open id="command-chat" label="Ask" size="lg">
        {' '}
        <helix-chat className="command-chat" label="Ask">
          {' '}
          <helix-chat-message author="me" state="sent">
            {' '}
            Which packages does the release touch?{' '}
          </helix-chat-message>{' '}
          <helix-chat-message author="them" separation="plain" state="sent">
            {' '}
            Eight, and two of them publish for the first time.{' '}
          </helix-chat-message>{' '}
          {/* The way out is a hint about the field it sits under, so it sits in the
               composer's own tool row rather than in a band of its own below the
               dialog. A footer for one line of eleven characters is a second box, a
               second inset and a rule between them. */}{' '}
          <helix-chat-composer placeholder="Ask anything" slot="composer">
            {' '}
            <helix-text slot="start" tone="subtle" variant="caption">
              {' '}
              <helix-kbd>Esc</helix-kbd> to dismiss{' '}
            </helix-text>{' '}
          </helix-chat-composer>{' '}
        </helix-chat>{' '}
      </helix-dialog>
    </>
  )
}

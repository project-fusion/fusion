import './fullscreen.css'

export function Example() {
  return (
    <>
      <helix-button command="--show" commandfor="fullscreen-chat" emphasis="solid" tone="primary">
        Open the conversation
      </helix-button>

      <helix-dialog className="fullscreen" id="fullscreen-chat" label="Support" size="full">
        <helix-flex align="center" gap="sm" justify="between" slot="header">
          <helix-text as="h2" variant="title">
            Support
          </helix-text>
          <helix-icon-button
            command="--close"
            commandfor="fullscreen-chat"
            emphasis="ghost"
            label="Close"
          >
            <helix-icon name="x"></helix-icon>
          </helix-icon-button>
        </helix-flex>

        <helix-chat className="fullscreen-chat" label="Support">
          <helix-chat-message author="them" state="sent">
            How can I help?
          </helix-chat-message>
          <helix-chat-message author="me" state="sent">
            The deploy is stuck on the migration step.
          </helix-chat-message>
          <helix-chat-message author="them" state="sent">
            The migration is queued behind a lock that another connection is holding.
          </helix-chat-message>

          <helix-chat-composer placeholder="Write a message" slot="composer"></helix-chat-composer>
        </helix-chat>
      </helix-dialog>
    </>
  )
}

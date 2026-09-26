import './sidebar.css'

export function Example() {
  return (
    <>
      <helix-button
        command="--show"
        commandfor="sidebar-chat"
        emphasis="solid"
        tone="primary"
      >
        Ask the assistant
      </helix-button>

      {/* The drawer header is empty, so the chat header carries the title. */}
      <helix-drawer
        className="sidebar"
        id="sidebar-chat"
        label="Assistant"
        placement="end"
      >
        <helix-chat
          className="sidebar-chat"
          label="Assistant"
        >
          <helix-text
            as="strong"
            slot="header"
            variant="body-strong"
          >
            Assistant
          </helix-text>

          <helix-icon-button
            command="--close"
            commandfor="sidebar-chat"
            emphasis="ghost"
            label="Close"
            slot="actions"
          >
            <helix-icon name="x" />
          </helix-icon-button>

          <helix-chat-message
            author="me"
            state="sent"
          >
            Summarize what changed in this release.
          </helix-chat-message>
          <helix-chat-message
            author="them"
            separation="plain"
            state="sent"
          >
            Eleven pages changed. The largest change is to checkout, which now saves your shipping
            address for next time.
          </helix-chat-message>
          <helix-chat-message
            author="them"
            separation="plain"
            state="streaming"
          />

          <helix-chat-composer
            placeholder="Ask about the release"
            slot="composer"
          >
            <helix-icon-button
              emphasis="ghost"
              label="Stop answering"
              slot="end"
            >
              <helix-icon name="stop" />
            </helix-icon-button>
          </helix-chat-composer>
        </helix-chat>
      </helix-drawer>
    </>
  )
}

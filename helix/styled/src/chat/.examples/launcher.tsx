import './launcher.css'

export function Example() {
  return (
    /* Nothing about the corner belongs to the chat. `helix-popover` is in the top
       layer and anchors to whatever opened it, so the trigger is placed by this
       example's own stylesheet and the conversation inside knows none of it. */
    <helix-popover
      className="launcher"
      id="launcher"
      label="Support"
      placement="top-end"
    >
      <helix-icon-button
        className="launcher-trigger"
        emphasis="solid"
        label="Ask support"
        raised
        shape="circle"
        slot="trigger"
        tone="primary"
      >
        <helix-icon name="dots-three" />
      </helix-icon-button>

      <helix-chat
        className="launcher-chat"
        label="Support"
      >
        <helix-text
          as="strong"
          slot="header"
          variant="body-strong"
        >
          Support
        </helix-text>

        {/* Dismissal is a control for the conversation, so it goes where the
            conversation's controls go: the header's trailing edge. */}
        <helix-icon-button
          command="--close"
          commandfor="launcher"
          emphasis="ghost"
          label="Close"
          slot="actions"
        >
          <helix-icon name="x" />
        </helix-icon-button>

        <helix-chat-message
          author="them"
          state="sent"
        >
          We are here. What is going wrong?
        </helix-chat-message>
        <helix-chat-message
          author="me"
          state="sent"
        >
          The deploy is stuck on the migration step.
        </helix-chat-message>
        <helix-chat-message
          author="them"
          state="sent"
        >
          Looking at the run now. Give us a minute.
        </helix-chat-message>

        <helix-chat-composer
          placeholder="Write a message"
          slot="composer"
        />
      </helix-chat>
    </helix-popover>
  )
}

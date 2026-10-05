export function Example() {
  return (
    <helix-chat
      className="typing"
      label="Support"
      typing="Ada"
    >
      <strong slot="header">Support</strong>

      <helix-chat-message
        author="me"
        state="sent"
      >
        Is the deploy still stuck?
      </helix-chat-message>
    </helix-chat>
  )
}

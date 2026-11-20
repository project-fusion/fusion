export function Example() {
  return (
    <helix-chat
      className="typing"
      label="Support"
      style={{ '--chat-max-block-size': '12rem' } as React.CSSProperties}
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

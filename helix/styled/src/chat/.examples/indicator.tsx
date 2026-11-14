export function Example() {
  return (
    <helix-chat
      className="indicator"
      label="Assistant"
      style={{ '--chat-max-block-size': '12rem' } as React.CSSProperties}
    >
      <strong slot="header">Assistant</strong>

      <helix-chat-message
        author="them"
        state="streaming"
      ></helix-chat-message>

      <helix-chat-message
        author="them"
        state="streaming"
      >
        <helix-orb
          size="sm"
          slot="indicator"
          state="thinking"
        ></helix-orb>
      </helix-chat-message>
    </helix-chat>
  )
}

import './states.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-chat
        className="conversation"
        label="Support"
        loading
        loading-text="Loading messages"
      >
        <strong slot="header">Support</strong>
      </helix-chat>

      <helix-chat
        className="conversation"
        empty-text="No messages yet"
        label="Assistant"
      >
        <strong slot="header">Assistant</strong>
      </helix-chat>
    </helix-flex>
  )
}

import './assistant.css'

export function Example() {
  return (
    <helix-chat className="assistant" id="assistant" label="Assistant">
      <helix-flex align="center" gap="sm" slot="header">
        <helix-text as="strong" variant="body-strong">
          Assistant
        </helix-text>
        <helix-tag emphasis="subtle" tone="neutral">
          opus-5
        </helix-tag>
      </helix-flex>

      {/* Controls for the conversation rather than for any turn in it, which is
          what the header's trailing edge is for. The one that gets used goes on
          the row; the rest go behind a menu, because a header is not a toolbar
          and four glyphs beside a title read as one. */}
      <helix-flex gap="2xs" slot="actions">
        <helix-icon-button emphasis="ghost" label="New conversation">
          <helix-icon name="plus" />
        </helix-icon-button>

        <helix-menu className="assistant-menu" label="Conversation" placement="bottom-end">
          <helix-icon-button emphasis="ghost" label="More" slot="trigger">
            <helix-icon name="dots-three" />
          </helix-icon-button>

          <helix-menu-item value="export">
            <helix-icon name="download" slot="start" />
            Export transcript
          </helix-menu-item>
          <helix-menu-item value="share">
            <helix-icon name="share-network" slot="start" />
            Share a link
          </helix-menu-item>
          <helix-menu-item value="clear">
            <helix-icon name="trash" slot="start" />
            Clear conversation
          </helix-menu-item>
        </helix-menu>
      </helix-flex>

      <helix-chat-message author="me" state="sent">
        Why is the deploy stuck on the migration step?
      </helix-chat-message>

      {/* `separation="plain"` because an answer is a passage rather than a
          remark. The reader's own turns keep their bubbles, so the two sides of
          the conversation are told apart by what they are as well as by which
          edge they sit against. */}
      <helix-chat-message author="them" separation="plain" state="sent">
        <helix-avatar name="AI" shape="circle" size="sm" slot="avatar" />
        The migration is waiting on a lock. Another connection has held{' '}
        <helix-code>ACCESS EXCLUSIVE</helix-code> on <helix-code>orders</helix-code> since 09:14, so
        the deploy is queued behind it rather than failing.
        {/* What the answer was drawn from, set as a footnote: the marks stack the
            way an avatar group does and the words stay small and quiet, because a
            citation is a reference rather than a control. */}
        <helix-flex align="center" gap="2xs" slot="sources">
          <helix-avatar name="RM" shape="circle" size="sm" />
          <helix-avatar name="D4" shape="circle" size="sm" />
          <helix-text variant="caption">runbook/migrations.md and deploy #4812</helix-text>
        </helix-flex>
        <helix-flex gap="2xs" slot="actions">
          <helix-copy-button
            emphasis="ghost"
            label="Copy"
            value="The migration is waiting on a lock."
          />
          <helix-icon-button emphasis="ghost" label="Try again">
            <helix-icon name="arrow-clockwise" />
          </helix-icon-button>
        </helix-flex>
      </helix-chat-message>

      <helix-chat-message author="me" state="sent">
        Can I clear it without dropping the deploy?
      </helix-chat-message>

      {/* The wait before the first token. `streaming` with nothing in it yet
          draws the typing indicator; the moment content arrives it stops, and
          nothing decorates the text after that because the text arriving is the
          signal. */}
      <helix-chat-message author="them" separation="plain" state="streaming">
        <helix-avatar name="AI" shape="circle" size="sm" slot="avatar" />
      </helix-chat-message>

      <helix-button emphasis="solid" slot="resume">
        <helix-icon name="arrow-down" slot="start" />
        Jump to latest
      </helix-button>

      <helix-chat-composer placeholder="Ask a follow up" slot="composer">
        <helix-icon-button emphasis="ghost" label="Attach a file" slot="start">
          <helix-icon name="plus" />
        </helix-icon-button>
        <helix-icon-button emphasis="ghost" label="Stop answering" slot="end">
          <helix-icon name="stop" />
        </helix-icon-button>
      </helix-chat-composer>
    </helix-chat>
  )
}

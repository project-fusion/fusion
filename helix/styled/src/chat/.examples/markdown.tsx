import './markdown.css'

export function Example() {
  return (
    <helix-chat
      className="markdown"
      label="Assistant"
    >
      <helix-text
        as="strong"
        slot="header"
        variant="body-strong"
      >
        Assistant
      </helix-text>

      <helix-chat-message
        author="me"
        state="sent"
      >
        What changed in 0.16?
      </helix-chat-message>

      {/* **`data-prose` is what styles this, and the markup is the page's own.**
          Chat renders no markdown and takes no dependency on one: a turn is
          whatever the consumer slotted, so turning `### What changed` into an
          `<h3>` is their job and their markdown library's. What the component
          owes them is a turn that can hold the result, which is what this shows.

          The recipe lives in the base layer rather than in this component's
          shadow root, because a shadow root cannot reach here: `::slotted()`
          matches the assigned node and never its descendants, so a rule for a
          table's cells has to be written where the cells are. */}
      <helix-chat-message
        author="them"
        data-prose
        separation="plain"
        state="sent"
      >
        <h3>What changed</h3>
        <p>Three things landed, and one of them moves a default.</p>

        <table>
          <thead>
            <tr>
              <th>Package</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>helix</td>
              <td>0.16.3</td>
            </tr>
            <tr>
              <td>helix-core</td>
              <td>0.16.3</td>
            </tr>
          </tbody>
        </table>

        <ul>
          <li>
            <code>Button</code> lost its width axis
          </li>
          <li>The small dialog footer fits again</li>
          <li>Nothing generated is tracked any more</li>
        </ul>

        <p>Upgrade with:</p>

        {/* On one line, because `<pre>` keeps whatever whitespace it is given and
            JSX indentation is whitespace. */}
        {/* biome-ignore format: the newlines would be rendered */}
        <pre><code>bun add @fusion.dev/helix</code></pre>
      </helix-chat-message>
    </helix-chat>
  )
}

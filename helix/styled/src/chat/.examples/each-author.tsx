/* Ada's and Grace's turns take the fill `author-styles` names for them, and
   the reader's own keep theirs. */
const turns = [
  { author: 'Ada', authorLabel: 'Ada', key: '1', text: 'The build for 4.2 is green.' },
  { author: 'Grace', authorLabel: 'Grace', key: '2', text: 'Release notes are in review.' },
  { author: 'me', key: '3', text: 'Then we ship at three.' },
  { author: 'Ada', authorLabel: 'Ada', key: '4', text: 'Tagging it now.' },
]

/* An object as the property, where the HTML example writes it as JSON. */
const authorStyles = {
  Ada: '--chat-message-background-color: color-mix(in oklab, var(--helix-color-success) 24%, transparent)',
  Grace:
    '--chat-message-background-color: color-mix(in oklab, var(--helix-color-warning) 24%, transparent)',
}

export function Example() {
  return (
    <helix-chat
      authorStyles={authorStyles}
      className="authors"
      label="Release"
      turns={turns}
    >
      <strong slot="header">Release</strong>
    </helix-chat>
  )
}

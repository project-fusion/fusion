import { useState } from 'react'

const TAGS = [
  { label: 'Ada', prefix: 'Owner' },
  { label: 'Staging', prefix: 'Env' },
  { label: 'Open', prefix: 'Status' },
  { label: 'Billing', prefix: 'Area' },
]

export function Example() {
  const [tags, setTags] = useState(TAGS)

  return (
    /* A token asks to go and does not go on its own, so a page that renders
       `dismissible` tokens and binds nothing has drawn a control that answers
       nothing. The consumer owns the markup the tokens are in, which is why the
       field asks rather than takes. Bound on the field, since `helix-dismiss`
       bubbles and is also what Backspace on an empty field sends: one handler,
       both ways of asking. */
    <helix-filter-input
      label="Filter rows"
      onhelix-dismiss={(event: CustomEvent<{ label: string }>) => {
        setTags((held) => held.filter((tag) => !event.detail.label.endsWith(tag.label)))
      }}
      placeholder="Add a filter"
    >
      {tags.map((tag) => (
        <helix-tag
          dismissible
          key={tag.label}
          slot="tags"
        >
          <span slot="prefix">{tag.prefix}</span>
          {tag.label}
        </helix-tag>
      ))}
    </helix-filter-input>
  )
}

const text = `## Before the release

- [x] Back up the database
- [x] Stop the workers
- [ ] Run the down step
- [ ] Start the workers again`

export function Example() {
  return (
    <helix-markdown
      data-prose
      text={text}
    ></helix-markdown>
  )
}

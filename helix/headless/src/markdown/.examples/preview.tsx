import './preview.css'

const DOCUMENT = `## Roll back the migration

1. Stop the workers.
2. Run \`bun run migrate:down\`.
3. Start the workers again.`

export function Example() {
  return <helix-headless-markdown text={DOCUMENT} />
}

const DOCUMENT = `## Roll back the migration

Run the down step, then check that the table is gone:

1. Stop the workers.
2. Run \`bun run migrate:down\`.
3. Start the workers again.

\`\`\`sh
bun run migrate:down --to 0041
\`\`\`

> [!WARNING]
> Back up the database before you start.

| Step | What happens |
| :-- | :-- |
| Down | The \`plans\` table is dropped |
| Check | The schema matches release 0041 |`

export function Example() {
  return (
    <helix-markdown
      data-prose
      text={DOCUMENT}
    />
  )
}

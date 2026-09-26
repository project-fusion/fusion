export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-splitter
        default-position="40"
        max={70}
        min={20}
        step={5}
      >
        <div slot="start">Inbox, Drafts, Sent, and Archive</div>
        <div slot="end">Select a message to read it.</div>
      </helix-splitter>

      <helix-splitter default-collapsed="start">
        <div slot="start">Filters for status, date, and owner</div>
        <div slot="end">Showing 24 of 120 orders.</div>
      </helix-splitter>
    </helix-flex>
  )
}

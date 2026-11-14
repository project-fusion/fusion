export function Example() {
  return (
    <helix-grid style={{ '--grid-columns': 'minmax(0, 20rem)' }}>
      <helix-scroll-area
        label="Release notes"
        max-block-size="md"
      >
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-text as="p">You can now export reports as CSV files.</helix-text>
          <helix-text as="p">Search results load faster on large projects.</helix-text>
          <helix-text as="p">Invoices now show the tax for each line item.</helix-text>
          <helix-text as="p">Shared folders show who added each file.</helix-text>
          <helix-text as="p">You can pin projects to the top of your list.</helix-text>
          <helix-text as="p">Comments now support mentions and links.</helix-text>
          <helix-text as="p">Dark mode is available in settings.</helix-text>
          <helix-text as="p">Team admins can now remove members.</helix-text>
        </helix-flex>
      </helix-scroll-area>
    </helix-grid>
  )
}

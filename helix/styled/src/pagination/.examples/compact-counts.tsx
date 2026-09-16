export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-pagination-summary
        format="{from}-{to} / {total}"
        locale="en-GB"
        page={42}
        page-size="25"
        total={120000}
      ></helix-pagination-summary>

      <helix-pagination
        default-page="42"
        page-size="25"
        total={120000}
      ></helix-pagination>
    </helix-flex>
  )
}

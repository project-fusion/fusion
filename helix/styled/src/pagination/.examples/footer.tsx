export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="md"
      justify-content="between"
    >
      <helix-pagination-summary
        page={4}
        page-size="25"
        total={248}
      ></helix-pagination-summary>
      <helix-pagination
        default-page="4"
        ends
        page-size="25"
        total={248}
      ></helix-pagination>
      <helix-pagination-size
        default-value="25"
        sizes="10,25,50,100"
      ></helix-pagination-size>
    </helix-flex>
  )
}

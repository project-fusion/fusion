export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <helix-pagination boundaries={0} default-page="24" pages={50} siblings={0}></helix-pagination>
      <helix-pagination default-page="24" pages={50}></helix-pagination>
      <helix-pagination boundaries={2} default-page="24" pages={50} siblings={3}></helix-pagination>
    </helix-flex>
  )
}

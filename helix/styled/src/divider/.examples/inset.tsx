export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="none"
    >
      <helix-list-item>
        <helix-icon
          name="cube"
          slot="start"
        ></helix-icon>
        Documents
      </helix-list-item>
      <helix-divider style={{ '--divider-padding-start': '3.25rem' }}></helix-divider>
      <helix-list-item>
        <helix-icon
          name="cube"
          slot="start"
        ></helix-icon>
        Downloads
      </helix-list-item>
    </helix-flex>
  )
}

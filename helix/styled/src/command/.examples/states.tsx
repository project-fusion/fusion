export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-command
        hotkey=""
        inline
        label="Search files"
        loading
        loading-text="Loading files"
        placeholder="Search files"
      ></helix-command>

      <helix-command
        empty-text="No recent projects"
        hotkey=""
        inline
        label="Recent projects"
        placeholder="Search recent projects"
      ></helix-command>
    </helix-flex>
  )
}

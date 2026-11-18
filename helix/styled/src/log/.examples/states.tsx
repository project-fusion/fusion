export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-log
        label="Deployment"
        loading
        loading-text="Loading the deployment output"
      ></helix-log>

      <helix-log
        empty-text="The build has not started"
        label="Build"
      ></helix-log>
    </helix-flex>
  )
}

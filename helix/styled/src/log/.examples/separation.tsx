export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-log label="Install">
        <helix-log-group
          default-open
          duration="38s"
          heading="Install dependencies"
          status="done"
        >
          <helix-log-line>bun install v1.1.43</helix-log-line>
          <helix-log-line>Resolved 1,214 packages in 2.1s</helix-log-line>
          <helix-log-line>Installed 1,214 packages in 36.4s</helix-log-line>
        </helix-log-group>
      </helix-log>

      <helix-log
        label="Build"
        separation="plain"
      >
        <helix-log-group
          default-open
          duration="1m 12s"
          heading="Build"
          status="done"
        >
          <helix-log-line>Creating an optimized production build</helix-log-line>
          <helix-log-line>
            Compiled 214 modules for the browser and 37 for the server
          </helix-log-line>
          <helix-log-line>Build finished</helix-log-line>
        </helix-log-group>
      </helix-log>
    </helix-flex>
  )
}

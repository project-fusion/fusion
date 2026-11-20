export function Example() {
  return (
    <helix-grid style={{ '--grid-columns': 'minmax(0, 20rem)' }}>
      <helix-scroll-area
        label="Build log"
        max-block-size="sm"
        orientation="vertical"
        scrollbars="auto"
      >
        <helix-flex
          direction="column"
          gap="xs"
        >
          <helix-text
            scale="code"
            text-wrap="nowrap"
          >
            12:00:01 Installing dependencies from the lockfile written by the last successful run
          </helix-text>
          <helix-text
            scale="code"
            text-wrap="nowrap"
          >
            12:00:09 Compiling 214 modules for the browser and 37 for the server
          </helix-text>
          <helix-text
            scale="code"
            text-wrap="nowrap"
          >
            12:00:21 Running 1,302 unit specs across every package in the workspace
          </helix-text>
          <helix-text
            scale="code"
            text-wrap="nowrap"
          >
            12:00:48 Uploading the build to the preview environment for this branch
          </helix-text>
          <helix-text
            scale="code"
            text-wrap="nowrap"
          >
            12:00:52 Preview ready
          </helix-text>
          <helix-text
            scale="code"
            text-wrap="nowrap"
          >
            12:00:53 Notifying the pull request
          </helix-text>
          <helix-text
            scale="code"
            text-wrap="nowrap"
          >
            12:00:54 Done in 53 seconds
          </helix-text>
        </helix-flex>
      </helix-scroll-area>
    </helix-grid>
  )
}

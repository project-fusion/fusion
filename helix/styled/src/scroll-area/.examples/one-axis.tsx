import './one-axis.css'

export function Example() {
  return (
    <helix-scroll-area
      label="Build log"
      orientation="vertical"
      scrollbars="auto"
    >
      <helix-text
        text-wrap="nowrap"
        variant="code"
      >
        12:00:01 Installing dependencies from the lockfile written by the last successful run
      </helix-text>
      <helix-text
        text-wrap="nowrap"
        variant="code"
      >
        12:00:09 Compiling 214 modules for the browser and 37 for the server
      </helix-text>
      <helix-text
        text-wrap="nowrap"
        variant="code"
      >
        12:00:21 Running 1,302 unit specs across every package in the workspace
      </helix-text>
      <helix-text
        text-wrap="nowrap"
        variant="code"
      >
        12:00:48 Uploading the build to the preview environment for this branch
      </helix-text>
      <helix-text
        text-wrap="nowrap"
        variant="code"
      >
        12:00:52 Preview ready
      </helix-text>
      <helix-text
        text-wrap="nowrap"
        variant="code"
      >
        12:00:53 Notifying the pull request
      </helix-text>
      <helix-text
        text-wrap="nowrap"
        variant="code"
      >
        12:00:54 Done in 53 seconds
      </helix-text>
    </helix-scroll-area>
  )
}

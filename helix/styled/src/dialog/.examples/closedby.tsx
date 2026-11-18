import { useState } from 'react'

export function Example() {
  const [shown, setShown] = useState<string>()

  return (
    <>
      <helix-flex
        gap="sm"
        wrap
      >
        <helix-button onClick={() => setShown('shared')}>Share folder</helix-button>
        <helix-button onClick={() => setShown('unsaved')}>Close editor</helix-button>
      </helix-flex>

      <helix-dialog
        closedby="any"
        id="shared"
        label="Folder shared"
        onClose={() => setShown(undefined)}
        open={shown === 'shared'}
        size="sm"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Folder shared
        </helix-text>
        <helix-text>
          Anyone with the link can view Quarterly reports. Files you add to the folder later are
          shared too.
        </helix-text>
      </helix-dialog>

      <helix-dialog
        id="unsaved"
        label="Unsaved changes"
        onClose={() => setShown(undefined)}
        open={shown === 'unsaved'}
        persistent
      >
        <helix-text as="p">
          You have two unsaved changes. Save or discard them to continue.
        </helix-text>
        <helix-button-group
          label="Dialog actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button onClick={() => setShown(undefined)}>Discard changes</helix-button>
          <helix-button
            emphasis="solid"
            onClick={() => setShown(undefined)}
            tone="primary"
          >
            Save changes
          </helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}

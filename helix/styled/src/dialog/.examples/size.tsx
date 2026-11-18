import { useState } from 'react'

export function Example() {
  const [shown, setShown] = useState<string>()

  return (
    <>
      <helix-flex
        gap="sm"
        wrap
      >
        <helix-button onClick={() => setShown('small-dialog')}>Small</helix-button>
        <helix-button onClick={() => setShown('medium-dialog')}>Medium</helix-button>
        <helix-button onClick={() => setShown('large-dialog')}>Large</helix-button>
        <helix-button onClick={() => setShown('full-dialog')}>Full</helix-button>
      </helix-flex>

      <helix-dialog
        id="small-dialog"
        label="Archive project?"
        onClose={() => setShown(undefined)}
        open={shown === 'small-dialog'}
        size="sm"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Archive project?
        </helix-text>
        <helix-text>The project becomes read-only for everyone on the team.</helix-text>
        <helix-button-group
          label="Dialog actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button onClick={() => setShown(undefined)}>Cancel</helix-button>
          <helix-button
            emphasis="solid"
            onClick={() => setShown(undefined)}
            tone="primary"
          >
            Archive project
          </helix-button>
        </helix-button-group>
      </helix-dialog>

      <helix-dialog
        id="medium-dialog"
        label="Rename project"
        onClose={() => setShown(undefined)}
        open={shown === 'medium-dialog'}
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Rename project
        </helix-text>
        <helix-text>
          The new name appears in the sidebar, in links, and in notifications.
        </helix-text>
        <helix-button-group
          label="Dialog actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button onClick={() => setShown(undefined)}>Cancel</helix-button>
          <helix-button
            emphasis="solid"
            onClick={() => setShown(undefined)}
            tone="primary"
          >
            Rename project
          </helix-button>
        </helix-button-group>
      </helix-dialog>

      <helix-dialog
        id="large-dialog"
        label="Edit profile"
        onClose={() => setShown(undefined)}
        open={shown === 'large-dialog'}
        size="lg"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Edit profile
        </helix-text>
        <helix-text>
          Update your name, email address, and profile photo. Members of your workspace can see
          these details.
        </helix-text>
        <helix-button-group
          label="Dialog actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button onClick={() => setShown(undefined)}>Cancel</helix-button>
          <helix-button
            emphasis="solid"
            onClick={() => setShown(undefined)}
            tone="primary"
          >
            Save changes
          </helix-button>
        </helix-button-group>
      </helix-dialog>

      <helix-dialog
        id="full-dialog"
        label="Edit project"
        onClose={() => setShown(undefined)}
        open={shown === 'full-dialog'}
        size="full"
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Edit project
        </helix-text>
        <helix-text>
          Update the project name, description, and members. Your changes apply to everyone on the
          team.
        </helix-text>
        <helix-button-group
          label="Dialog actions"
          layout="spaced"
          slot="footer"
        >
          <helix-button onClick={() => setShown(undefined)}>Cancel</helix-button>
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

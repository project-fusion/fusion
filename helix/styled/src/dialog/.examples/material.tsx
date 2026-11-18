import { useState } from 'react'
import './material.css'

export function Example() {
  const [shown, setShown] = useState<string>()

  return (
    <>
      <div className="page">
        <helix-text
          as="h1"
          scale="display"
        >
          Projects
        </helix-text>
        <helix-text as="p">
          Track progress, share files, and invite team members to your projects.
        </helix-text>
        <helix-flex
          gap="sm"
          wrap
        >
          <helix-button onClick={() => setShown('opaque-dialog')}>Opaque</helix-button>
          <helix-button onClick={() => setShown('glass-dialog')}>Glass</helix-button>
          <helix-button onClick={() => setShown('frosted-dialog')}>Frosted</helix-button>
        </helix-flex>
      </div>

      <helix-dialog
        id="opaque-dialog"
        label="Invite member"
        onClose={() => setShown(undefined)}
        open={shown === 'opaque-dialog'}
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Invite member
        </helix-text>
        <helix-text>New members can view and edit every project in the workspace.</helix-text>
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
            Send invite
          </helix-button>
        </helix-button-group>
      </helix-dialog>

      <helix-dialog
        id="glass-dialog"
        label="Invite member"
        material="glass"
        onClose={() => setShown(undefined)}
        open={shown === 'glass-dialog'}
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Invite member
        </helix-text>
        <helix-text>New members can view and edit every project in the workspace.</helix-text>
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
            Send invite
          </helix-button>
        </helix-button-group>
      </helix-dialog>

      <helix-dialog
        id="frosted-dialog"
        label="Invite member"
        material="frosted"
        onClose={() => setShown(undefined)}
        open={shown === 'frosted-dialog'}
      >
        <helix-text
          as="h2"
          slot="header"
        >
          Invite member
        </helix-text>
        <helix-text>New members can view and edit every project in the workspace.</helix-text>
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
            Send invite
          </helix-button>
        </helix-button-group>
      </helix-dialog>
    </>
  )
}

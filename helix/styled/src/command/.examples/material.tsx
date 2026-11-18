import type { HelixCommand } from '@fusion.dev/helix'
import { useRef } from 'react'

export function Example() {
  const opaque = useRef<HelixCommand>(null)
  const glass = useRef<HelixCommand>(null)
  const frosted = useRef<HelixCommand>(null)

  const show = (palette: HelixCommand | null) => {
    if (palette) {
      palette.open = true
    }
  }

  return (
    <>
      <helix-flex
        gap="sm"
        wrap
      >
        <helix-button onClick={() => show(opaque.current)}>Opaque</helix-button>
        <helix-button onClick={() => show(glass.current)}>Glass</helix-button>
        <helix-button onClick={() => show(frosted.current)}>Frosted</helix-button>
      </helix-flex>

      <helix-command
        hotkey=""
        label="Commands"
        ref={opaque}
      >
        <helix-option value="new">New file</helix-option>
        <helix-option value="open">Open folder</helix-option>
        <helix-option value="save">Save all</helix-option>
      </helix-command>

      <helix-command
        hotkey=""
        label="Commands"
        material="glass"
        ref={glass}
      >
        <helix-option value="new">New file</helix-option>
        <helix-option value="open">Open folder</helix-option>
        <helix-option value="save">Save all</helix-option>
      </helix-command>

      <helix-command
        hotkey=""
        label="Commands"
        material="frosted"
        ref={frosted}
      >
        <helix-option value="new">New file</helix-option>
        <helix-option value="open">Open folder</helix-option>
        <helix-option value="save">Save all</helix-option>
      </helix-command>
    </>
  )
}

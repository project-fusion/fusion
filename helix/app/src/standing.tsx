import { HelixButton } from '@fusion.dev/helix/button'
import { HelixCopyButton } from '@fusion.dev/helix/copy-button'
import { HelixList, HelixListItem } from '@fusion.dev/helix/list'
import { HelixToast, HelixToastItem } from '@fusion.dev/helix/toast'
import { useState } from 'react'

/* **What the examples show for a moment, standing long enough for a flow to
   read it.** Maestro's tap on Android returns once its hierarchy dumps agree,
   and in run 41361727088 that came 4.4 seconds after a press on Copy, past the
   1.6 seconds "Copied" stands, and 9.6 seconds after a press on Archive, past
   the 8 seconds its message stands. Only the times differ from the examples
   `copy-button/label` and `toast/undo`. */

/** How long a confirmation stands here, in milliseconds. */
const CONFIRMED = 20000

/** How long a message stands here, in milliseconds. */
const MESSAGE = 60000

/** A button that copies, with its words beside its icon, and one that shows only its icon. */
export function StandingCopy() {
  return (
    <>
      <HelixCopyButton feedbackDuration={CONFIRMED} value="bun add @fusion.dev/helix" />
      <HelixCopyButton
        feedbackDuration={CONFIRMED}
        label="Copy link"
        showLabel
        tooltip="copy"
        tooltipPlacement="bottom"
        value="https://fusion.dev/helix"
      />
    </>
  )
}

const FILES = ['Quarterly report.pdf', 'Roadmap.key']

/** The undo example: a row goes at once, and its message offers it back. */
export function StandingUndo() {
  const [files, setFiles] = useState(FILES)
  const [archived, setArchived] = useState<readonly string[]>([])
  const forget = (name: string) => setArchived((before) => before.filter((one) => one !== name))
  return (
    <>
      <HelixList divided label="Files">
        {files.map((name) => (
          <HelixListItem
            end={
              <HelixButton
                onPress={() => {
                  setFiles((before) => before.filter((one) => one !== name))
                  setArchived((before) => [...before, name])
                }}
              >
                Archive
              </HelixButton>
            }
            key={name}
          >
            {name}
          </HelixListItem>
        ))}
      </HelixList>
      <HelixToast placement="bottom-end">
        {archived.map((name) => (
          <HelixToastItem
            actions={
              <HelixButton
                onPress={() => {
                  setFiles((before) =>
                    [...before, name].sort((a, b) => FILES.indexOf(a) - FILES.indexOf(b)),
                  )
                  forget(name)
                }}
              >
                Undo
              </HelixButton>
            }
            dismissible
            duration={MESSAGE}
            key={name}
            onDismiss={() => forget(name)}
          >
            {`Archived ${name}`}
          </HelixToastItem>
        ))}
      </HelixToast>
    </>
  )
}

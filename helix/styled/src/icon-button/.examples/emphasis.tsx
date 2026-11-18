/* Each row is one emphasis and each column is one tone. `undefined` leaves the
   attribute off, so the first button uses both defaults. */
const EMPHASES = [undefined, 'solid', 'subtle', 'outlined'] as const
const TONES = [
  { icon: 'copy', label: 'Copy', tone: undefined },
  { icon: 'check', label: 'Confirm', tone: 'primary' },
  { icon: 'trash', label: 'Delete', tone: 'danger' },
] as const

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {EMPHASES.map((emphasis) => (
        <helix-flex
          gap="sm"
          key={emphasis ?? 'default'}
        >
          {TONES.map(({ icon, label, tone }) => (
            <helix-icon-button
              emphasis={emphasis}
              key={tone ?? 'default'}
              label={label}
              tone={tone}
            >
              <helix-icon name={icon}></helix-icon>
            </helix-icon-button>
          ))}
        </helix-flex>
      ))}

      <helix-icon-button
        disabled
        label="Close"
      >
        <helix-icon name="x"></helix-icon>
      </helix-icon-button>
    </helix-flex>
  )
}

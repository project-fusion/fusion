/* The first row leaves `emphasis` off, so each button uses its resting
   emphasis. The second row is `solid`. */
const EMPHASES = [undefined, 'solid'] as const
const TONES = [
  { icon: 'copy', label: 'Copy', tone: 'neutral' },
  { icon: 'check', label: 'Confirm', tone: 'primary' },
  { icon: 'share-network', label: 'Share', tone: 'accent' },
  { icon: 'trash', label: 'Delete', tone: 'danger' },
  { icon: 'info', label: 'Details', tone: 'info' },
  { icon: 'check-circle', label: 'Approve', tone: 'success' },
  { icon: 'warning', label: 'Report', tone: 'warning' },
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
          wrap
        >
          {TONES.map(({ icon, label, tone }) => (
            <helix-icon-button
              emphasis={emphasis}
              key={tone}
              label={label}
              tone={tone}
            >
              <helix-icon name={icon}></helix-icon>
            </helix-icon-button>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}

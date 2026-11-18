/* The first row leaves `emphasis` off, so each button uses its resting
   emphasis. The second row is `solid`. */
const EMPHASES = [undefined, 'solid'] as const
const TONES = [
  { label: 'Cancel', tone: 'neutral' },
  { label: 'Save', tone: 'primary' },
  { label: 'Share', tone: 'accent' },
  { label: 'Delete', tone: 'danger' },
  { label: 'Details', tone: 'info' },
  { label: 'Approve', tone: 'success' },
  { label: 'Review', tone: 'warning' },
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
          {TONES.map(({ label, tone }) => (
            <helix-button
              emphasis={emphasis}
              key={tone}
              tone={tone}
            >
              {label}
            </helix-button>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}

/* Each row is one emphasis and each column is one tone. `undefined` leaves the
   attribute off, so the first button uses both defaults. */
const EMPHASES = [undefined, 'solid', 'subtle', 'ghost'] as const
const TONES = [undefined, 'primary', 'danger'] as const
const LABELS = { danger: 'Delete', default: 'Cancel', primary: 'Save' }

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
          {TONES.map((tone) => (
            <helix-button
              emphasis={emphasis}
              key={tone ?? 'default'}
              tone={tone}
            >
              {LABELS[tone ?? 'default']}
            </helix-button>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}

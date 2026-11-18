/* Each row is one emphasis and each column is one tone. `undefined` leaves the
   attribute off, so the first tag uses both defaults. */
const EMPHASES = [
  { emphasis: undefined, label: 'Subtle' },
  { emphasis: 'solid', label: 'Solid' },
  { emphasis: 'outlined', label: 'Outlined' },
] as const
const TONES = [undefined, 'primary', 'danger'] as const

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {EMPHASES.map(({ emphasis, label }) => (
        <helix-flex
          gap="sm"
          key={label}
          wrap
        >
          {TONES.map((tone) => (
            <helix-tag
              emphasis={emphasis}
              key={tone ?? 'default'}
              tone={tone}
            >
              {label}
            </helix-tag>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}

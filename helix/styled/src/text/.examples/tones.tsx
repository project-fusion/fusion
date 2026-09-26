const TONES = [
  ['primary', 'Primary', 'Muted primary'],
  ['accent', 'Accent', 'Muted accent'],
  ['info', 'Info', 'Muted info'],
  ['success', 'Success', 'Muted success'],
  ['warning', 'Warning', 'Muted warning'],
  ['danger', 'Danger', 'Muted danger'],
] as const

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-flex gap="lg">
        <helix-text as="p">Default</helix-text>
        <helix-text
          as="p"
          emphasis="muted"
        >
          Muted
        </helix-text>
        <helix-text
          as="p"
          emphasis="subtle"
        >
          Subtle
        </helix-text>
      </helix-flex>
      {TONES.map(([tone, loud, quiet]) => (
        <helix-flex
          gap="lg"
          key={tone}
        >
          <helix-text
            as="p"
            tone={tone}
          >
            {loud}
          </helix-text>
          <helix-text
            as="p"
            emphasis="muted"
            tone={tone}
          >
            {quiet}
          </helix-text>
        </helix-flex>
      ))}
    </helix-flex>
  )
}

/* Two axes that do not cross evenly, which is why the first row is written out
   and the other two are not. At rest a tag has a neutral with no tone at all, so
   that row is five and names the tones; `solid` and `outlined` have nothing
   neutral to show, so they are four and name the emphasis instead. */
const TONES = ['primary', 'success', 'warning', 'danger'] as const
const EMPHASES = ['solid', 'outlined'] as const

/** `primary` to `Primary`. Each row's words are its own axis, spelled for reading. */
const title = (word: string) => `${word[0]?.toUpperCase()}${word.slice(1)}`

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-flex
        gap="sm"
        wrap
      >
        <helix-tag>Neutral</helix-tag>
        {TONES.map((tone) => (
          <helix-tag
            key={tone}
            tone={tone}
          >
            {title(tone)}
          </helix-tag>
        ))}
      </helix-flex>

      {EMPHASES.map((emphasis) => (
        <helix-flex
          gap="sm"
          key={emphasis}
          wrap
        >
          {TONES.map((tone) => (
            <helix-tag
              emphasis={emphasis}
              key={tone}
              tone={tone}
            >
              {title(emphasis)}
            </helix-tag>
          ))}
        </helix-flex>
      ))}
    </helix-flex>
  )
}

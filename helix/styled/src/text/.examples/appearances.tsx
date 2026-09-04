/* Every variant on the scale, in the order it steps down. Each sample says its
   own name, so what a reader is comparing is the shape of the word rather than
   the word. */
const VARIANTS = [
  'display',
  'heading',
  'subheading',
  'title',
  'body',
  'body-strong',
  'caption',
  'label',
  'code',
] as const

/** `body-strong` to `Body strong`: the variant's own name, set as a sentence. */
const title = (variant: string) =>
  `${variant[0]?.toUpperCase()}${variant.slice(1)}`.replace('-', ' ')

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      {/* `as="p"` on every one: the variant is the type it is set in and not
          what the element means, so a page of samples is a page of paragraphs. */}
      {VARIANTS.map((variant) => (
        <helix-text
          as="p"
          key={variant}
          variant={variant}
        >
          {title(variant)}
        </helix-text>
      ))}
    </helix-flex>
  )
}

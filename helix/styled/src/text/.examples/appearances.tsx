/* Every variant on the scale, from largest to smallest. Each sample shows the
   name of its variant. */
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

/** Turns a variant name into a label, such as `body-strong` to `Body strong`. */
const title = (variant: string) =>
  `${variant[0]?.toUpperCase()}${variant.slice(1)}`.replace('-', ' ')

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      {/* Each sample is a paragraph. `variant` sets only the type style. */}
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

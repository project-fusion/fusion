const swatches = Array.from({ length: 3000 }, (_, index) => ({ name: `Swatch ${index + 1}` }))

/* The same stylesheet as the HTML example's `<style>` block. It is set with
   `dangerouslySetInnerHTML` because JSX reads the braces in CSS as expressions. */
const SHEET = `
  .swatchCell {
    block-size: 72px;
    box-sizing: border-box;
    display: grid;
    gap: var(--helix-space-2xs);
    grid-template-rows: 1fr auto;
    padding: var(--helix-space-2xs);
  }

  .swatchChip {
    background-color: color-mix(in oklab, var(--helix-color-primary) 18%, transparent);
    border-radius: var(--helix-radii-sm);
  }
`

/* The same markup as the HTML example's `<template>`. It is set with
   `innerHTML` because the component clones the template's `content`, and React
   puts JSX children on the `<template>` itself. Each item draws one cell, and
   the padding inside it is the space between cells, which the list measures
   with the line. */
const CELL = `
    <div class="swatchCell">
      <span class="swatchChip"></span>
      <span data-field="name"></span>
    </div>
  `

export function Example() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHEET }} />

      <helix-virtual-list
        columns={4}
        estimate={72}
        items={swatches}
        label="Swatches"
      >
        <template dangerouslySetInnerHTML={{ __html: CELL }} />
      </helix-virtual-list>
    </>
  )
}

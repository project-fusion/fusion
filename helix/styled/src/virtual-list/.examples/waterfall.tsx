/* Five heights, so no line of three cards ends level and each card goes under
   whichever column is shortest when it comes. */
const cards = Array.from({ length: 2000 }, (_, index) => ({
  chip: `block-size: ${48 + ((index * 3) % 5) * 20}px`,
  name: `Card ${index + 1}`,
}))

/* The same stylesheet as the HTML example's `<style>` block. It is set with
   `dangerouslySetInnerHTML` because JSX reads the braces in CSS as expressions. */
const SHEET = `
  .waterfallCard {
    box-sizing: border-box;
    display: grid;
    gap: var(--helix-space-2xs);
    padding: var(--helix-space-2xs);
  }

  .waterfallChip {
    background-color: color-mix(in oklab, var(--helix-color-primary) 18%, transparent);
    border-radius: var(--helix-radii-sm);
  }
`

/* The same markup as the HTML example's `<template>`. It is set with
   `innerHTML` because the component clones the template's `content`, and React
   puts JSX children on the `<template>` itself. */
const CARD = `
    <div class="waterfallCard">
      <span
        class="waterfallChip"
        data-field-style="chip"
      ></span>
      <span data-field="name"></span>
    </div>
  `

export function Example() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHEET }} />

      <helix-virtual-list
        columns={3}
        estimate={96}
        gap={8}
        items={cards}
        label="Cards"
        layout="waterfall"
      >
        <template dangerouslySetInnerHTML={{ __html: CARD }} />
      </helix-virtual-list>
    </>
  )
}

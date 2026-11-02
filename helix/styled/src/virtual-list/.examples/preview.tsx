/* The two thousand rows are generated here. The HTML example writes the same
   rows out as JSON.

   The row template is set with `innerHTML` because the component clones the
   template's `content`, and React puts JSX children on the `<template>` itself. */
const ordinal = (count: number): string => {
  const teen = count % 100 >= 11 && count % 100 <= 13
  return (!teen && { 1: 'st', 2: 'nd', 3: 'rd' }[count % 10]) || 'th'
}
const rows = Array.from({ length: 2000 }, (_, index) => ({
  name: `Row ${index + 1}`,
  note: `the ${(index + 1).toLocaleString('en-US')}${ordinal(index + 1)} of two thousand`,
}))

/* The same stylesheet as the HTML example's `<style>` block. It is set with
   `dangerouslySetInnerHTML` because JSX reads the braces in CSS as expressions. */
const SHEET = `\n  .virtualRow {\n    align-content: center;\n    align-items: baseline;\n    block-size: 32px;\n    display: grid;\n    gap: var(--helix-space-sm);\n    grid-template-columns: 4.5rem minmax(0, 1fr);\n    padding-inline: var(--helix-space-sm);\n  }\n`

/* The same markup as the HTML example's `<template>`, indentation included, so
   both examples clone the same nodes. */
const ROW = `
    <div class="virtualRow">
      <strong data-field="name"></strong>
      <span data-field="note"></span>
    </div>
  `

export function Example() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHEET }} />

      <helix-virtual-list
        estimate={32}
        items={rows}
        label="Two thousand rows"
        text-field="name"
      >
        <template dangerouslySetInnerHTML={{ __html: ROW }} />
      </helix-virtual-list>
    </>
  )
}

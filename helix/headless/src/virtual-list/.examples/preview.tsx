import './preview.css'

/* Two thousand rows, generated rather than written out: the HTML example
   carries them as a literal because it has nowhere else to put them, and a
   hundred kilobytes of JSON in a file nobody reads is not the example.

   **The row template sets `innerHTML` rather than taking JSX children, and it
   has to.** React appends children to the `<template>` element itself, not into
   its `content` fragment, and `content` is what the component clones: given
   JSX children the list draws the right number of rows and every one of them is
   empty. Assigning `innerHTML` on a template parses into `content`, which is
   the behavior the HTML parser gives the markup example for free. */
const ORDINAL = new Intl.PluralRules('en-US', { type: 'ordinal' })
const SUFFIX: Record<string, string> = { few: 'rd', one: 'st', other: 'th', two: 'nd' }
const rows = Array.from({ length: 2000 }, (_, index) => ({
  name: `Row ${index + 1}`,
  note: `the ${(index + 1).toLocaleString('en-US')}${SUFFIX[ORDINAL.select(index + 1)]} of two thousand`,
}))

/* The example's own stylesheet, which the HTML file carries as a `<style>`
   block. `dangerouslySetInnerHTML` because CSS is full of braces and JSX reads a
   brace in children as an expression: written as a child it is a syntax error,
   and there is no `.css` file beside this example to import instead. */
const SHEET = `\n  .virtualRow {\n    align-content: center;\n    align-items: baseline;\n    block-size: 32px;\n    display: grid;\n    gap: 0.75rem;\n    grid-template-columns: 4.5rem minmax(0, 1fr);\n    padding-inline: 0.75rem;\n  }\n`

/* Byte for byte what the HTML example's `<template>` holds, indentation
   included, so the two examples clone the same nodes and picture the same. */
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

      <helix-headless-virtual-list
        estimate={32}
        for="people"
        label="Two thousand rows"
      >
        <template dangerouslySetInnerHTML={{ __html: ROW }} />
      </helix-headless-virtual-list>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(rows) }}
        id="people"
        type="application/json"
      />
    </>
  )
}

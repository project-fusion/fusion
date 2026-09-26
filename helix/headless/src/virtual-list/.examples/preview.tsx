import './preview.css'

/* The two thousand rows are generated here. The HTML example writes the same
   rows out as JSON.

   The row template is set with `innerHTML` because the component clones the
   template's `content`, and React puts JSX children on the `<template>` itself. */
const ORDINAL = new Intl.PluralRules('en-US', { type: 'ordinal' })
const SUFFIX: Record<string, string> = { few: 'rd', one: 'st', other: 'th', two: 'nd' }
const rows = Array.from({ length: 2000 }, (_, index) => ({
  name: `Row ${index + 1}`,
  note: `the ${(index + 1).toLocaleString('en-US')}${SUFFIX[ORDINAL.select(index + 1)]} of two thousand`,
}))

/* The same stylesheet as the HTML example's `<style>` block. It is set with
   `dangerouslySetInnerHTML` because JSX reads the braces in CSS as expressions. */
const SHEET = `\n  .virtualRow {\n    align-content: center;\n    align-items: baseline;\n    block-size: 32px;\n    display: grid;\n    gap: 0.75rem;\n    grid-template-columns: 4.5rem minmax(0, 1fr);\n    padding-inline: 0.75rem;\n  }\n`

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

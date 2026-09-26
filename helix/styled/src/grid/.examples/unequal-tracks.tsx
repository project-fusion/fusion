import './unequal-tracks.css'

export function Example() {
  return (
    <helix-grid
      className="page"
      gap="lg"
    >
      <p className="rail">Aug 26, 2026</p>
      <p className="prose">
        Reports can now be exported as CSV files. Open any report and choose Export to download it.
        Exports include every column shown in the report, in the same order.
      </p>

      <p className="rail">Aug 25, 2026</p>
      <p className="prose">
        Fixed an issue where invoices showed the wrong due date in some time zones. Invoices sent
        before this fix show the correct date the next time you open them.
      </p>
    </helix-grid>
  )
}

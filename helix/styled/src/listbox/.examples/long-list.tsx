/* `items` takes the options as data: a value, or a record with a `value`, a
   `label` and `disabled`. The keyboard, the filter and the value reach every
   one of them, and only those in sight are drawn. */
const ACCOUNTS = Array.from({ length: 10000 }, (_, index) => ({
  label: `Account ${String(index + 1).padStart(5, '0')}`,
  value: `account-${index + 1}`,
}))

export function Example() {
  return (
    <helix-listbox
      filter-label="Search accounts"
      filterable
      items={ACCOUNTS}
      label="Account"
      name="account"
    ></helix-listbox>
  )
}

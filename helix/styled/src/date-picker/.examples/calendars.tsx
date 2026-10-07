export function Example() {
  return (
    <helix-flex
      gap="2xl"
      wrap
    >
      <helix-date-picker
        calendar="persian"
        default-value="2026-10-06"
        label="Persian"
        locale="en-US"
      ></helix-date-picker>

      <helix-date-picker
        calendar="hebrew"
        default-month="2027-02-08"
        label="Hebrew"
        locale="en-US"
      ></helix-date-picker>
    </helix-flex>
  )
}

export function Example() {
  return (
    <helix-combobox default-value="apple,pear,plum,fig" label="Fruit" max-tags="2" multiple>
      <helix-option value="apple">Apple</helix-option>
      <helix-option value="pear">Pear</helix-option>
      <helix-option value="plum">Plum</helix-option>
      <helix-option value="fig">Fig</helix-option>
      <helix-option value="quince">Quince</helix-option>
    </helix-combobox>
  )
}

import './preview.css'

export function Example() {
  return (
    <helix-headless-tree default-active="two" label="Label">
      <helix-headless-tree-item default-open value="one">
        Item One
        <helix-headless-tree-item slot="children" value="two">
          Item Two
        </helix-headless-tree-item>
        <helix-headless-tree-item slot="children" value="three">
          Item Three
        </helix-headless-tree-item>
      </helix-headless-tree-item>
      <helix-headless-tree-item value="four">Item Four</helix-headless-tree-item>
    </helix-headless-tree>
  )
}

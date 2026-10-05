const files = [
  {
    files: [
      { name: 'index.ts', path: 'src/index.ts', size: '2 KB' },
      {
        files: [
          { name: 'format.ts', path: 'src/utils/format.ts', size: '4 KB' },
          { name: 'parse.ts', path: 'src/utils/parse.ts', size: '6 KB' },
        ],
        name: 'utils',
        path: 'src/utils',
        size: '10 KB',
      },
    ],
    name: 'src',
    path: 'src',
    size: '12 KB',
  },
  { name: 'package.json', path: 'package.json', size: '1 KB' },
  { name: 'README.md', path: 'README.md', size: '3 KB' },
]

export function Example() {
  return (
    /* `child-field` names the field that holds a row's rows. `row-key` is what
       `expanded` lists the open rows by. Right opens a folder from the
       keyboard, and Left closes it. */
    <helix-data-table
      child-field="files"
      default-expanded="src"
      label="Project files"
      row-key="path"
      rows={files}
    >
      <helix-table-column field="name">Name</helix-table-column>
      <helix-table-column
        field="size"
        text-align="end"
      >
        Size
      </helix-table-column>
    </helix-data-table>
  )
}

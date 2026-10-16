export function Example() {
  return (
    <>
      <table id="context-files">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Size</th>
          </tr>
        </thead>
        <tbody>
          <tr tabIndex={0}>
            <td>Quarterly report.pdf</td>
            <td>2.4 MB</td>
          </tr>
          <tr tabIndex={0}>
            <td>Roadmap.key</td>
            <td>8.1 MB</td>
          </tr>
        </tbody>
      </table>

      {/* `targets` says which things the menu is about; `contextTarget` is the one asked over. */}
      <helix-menu
        context
        for="context-files"
        label="File"
        targets="tbody tr"
      >
        <helix-menu-item value="open">Open</helix-menu-item>
        <helix-menu-item value="rename">Rename</helix-menu-item>
        <helix-menu-item value="archive">Archive</helix-menu-item>
      </helix-menu>
    </>
  )
}

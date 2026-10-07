/* The size is formatted the same way for the served rows and the drawn ones,
   in one locale, so the two pages match. */
const units = ['B', 'kB', 'MB', 'GB']

const bytes = (value: number): string => {
  const step = Math.min(units.length - 1, Math.floor(Math.log10(Math.max(value, 1)) / 3))
  const amount = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: step === 0 ? 0 : 1,
  }).format(value / 1000 ** step)
  return `${amount} ${units[step]}`
}

/* Module scope keeps the array the same across renders. */
const rows = [
  { name: 'archive.tar.gz', region: 'us-east-1', size: 4_823_100 },
  { name: 'backup.sql', region: 'eu-central-1', size: 918_400 },
  { name: 'index.json', region: 'us-east-1', size: 2_100 },
  { name: 'manifest.yaml', region: 'ap-south-1', size: 812 },
  { name: 'profile.bin', region: 'eu-west-2', size: 61_440 },
  { name: 'report.pdf', region: 'us-west-1', size: 1_204_000 },
  { name: 'snapshot.img', region: 'eu-central-1', size: 9_800_000 },
  { name: 'trace.log', region: 'ap-south-1', size: 44_900 },
]

/* The first page, in the table's sort and page size. In a server component
   this is what puts the values in the HTML. */
const firstPage = [...rows].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 4)

export function Example() {
  return (
    <helix-data-table
      default-sort="name:asc"
      label="Files"
      page-size={4}
      rows={rows}
    >
      <helix-table-column
        field="name"
        sortable
      >
        Name
      </helix-table-column>
      <helix-table-column
        field="region"
        sortable
      >
        Region
      </helix-table-column>
      <helix-table-column
        cell={(row) => bytes(row.size as number)}
        compare={(row) => row.size}
        field="size"
        sortable
        text-align="end"
      >
        Size
      </helix-table-column>

      {firstPage.map((file) => (
        <helix-table-row key={file.name}>
          <helix-table-cell header>{file.name}</helix-table-cell>
          <helix-table-cell>{file.region}</helix-table-cell>
          <helix-table-cell>{bytes(file.size)}</helix-table-cell>
        </helix-table-row>
      ))}
    </helix-data-table>
  )
}

/* The cell shows a readable size, and `compare` sorts the column by the
   number. Each value gets its own unit, so a small file does not read "0 MB". */
const units = ['B', 'kB', 'MB', 'GB']

const bytes = (value: number): string => {
  const step = Math.min(units.length - 1, Math.floor(Math.log10(Math.max(value, 1)) / 3))
  const amount = new Intl.NumberFormat(undefined, {
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

export function Example() {
  return (
    <helix-data-table
      default-sort="name:asc"
      label="Files"
      page-size="4"
      rows={rows}
    >
      <helix-table-column
        field="name"
        sortable
        width="minmax(9rem, 14rem)"
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
        width="6rem"
      >
        Size
      </helix-table-column>
    </helix-data-table>
  )
}

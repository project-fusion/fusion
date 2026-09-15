import './preview.css'

/* A size a person can read in the cell, and the number under it for the sort.
   The styled twin carries the reasoning. */
const units = ['B', 'kB', 'MB', 'GB']

const bytes = (value: number): string => {
  const step = Math.min(units.length - 1, Math.floor(Math.log10(Math.max(value, 1)) / 3))
  const amount = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: step === 0 ? 0 : 1,
  }).format(value / 1000 ** step)
  return `${amount} ${units[step]}`
}

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
    <helix-headless-data-table
      default-sort="name:asc"
      label="Objects"
      page-size="4"
      rows={rows}
    >
      <helix-headless-table-column
        field="name"
        sortable
        width="minmax(9rem, 14rem)"
      >
        Name
      </helix-headless-table-column>
      <helix-headless-table-column
        field="region"
        sortable
      >
        Region
      </helix-headless-table-column>
      <helix-headless-table-column
        align="end"
        cell={(row) => bytes(row.size as number)}
        compare={(row) => row.size}
        field="size"
        sortable
        width="6rem"
      >
        Size
      </helix-headless-table-column>
    </helix-headless-data-table>
  )
}

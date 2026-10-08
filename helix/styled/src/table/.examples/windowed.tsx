const paths = ['/api/orders', '/api/users', '/api/search', '/health']

/* A thousand generated rows. */
const requests = Array.from({ length: 1000 }, (_, index) => ({
  id: `req-${String(index + 1).padStart(4, '0')}`,
  path: paths[index % paths.length],
  time: `${12 + ((index * 37) % 480)} ms`,
}))

export function Example() {
  return (
    /* `windowed` draws only the rows in view, and the scrollbar still measures
       all thousand. Every row stays in the page as markup, and the table picks
       the ones to draw. Sorting orders every row.

       `--table-block-size` sets the height of the scrolling box. It defaults
       to 24em. */
    <helix-table
      label="Requests"
      windowed
    >
      <helix-table-column
        field="request"
        sortable
        width="8rem"
      >
        Request
      </helix-table-column>
      <helix-table-column
        field="path"
        sortable
      >
        Path
      </helix-table-column>
      <helix-table-column text-align="end">Time</helix-table-column>

      {requests.map((request) => (
        <helix-table-row key={request.id}>
          <helix-table-cell header>{request.id}</helix-table-cell>
          <helix-table-cell>{request.path}</helix-table-cell>
          <helix-table-cell>{request.time}</helix-table-cell>
        </helix-table-row>
      ))}
    </helix-table>
  )
}

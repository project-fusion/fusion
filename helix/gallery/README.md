# @fusion.dev/helix-gallery

The abstract card art for every Helix family, one drawing per file. **Private**:
versioned content about components, rendered by the docs site.

| Here | What it is |
|---|---|
| `src/art/<family>.tsx` | One drawing, named for the family it depicts |
| `src/system.md` | The rules every drawing obeys |
| `src/gallery.css` | The `art*` classes they paint through, and the motion |
| `src/index.tsx` | The `<svg>`, the shared filter and the lattice, stated once |

**Not in `helix/styled`**, which has no React and no JSX transform and which
every consumer installs. Not a CDN either: an external SVG in an `<img>` is cut
off from the page's CSS, so it can read no token and no hover rule can reach it,
and every card here is themed through `light-dark()`.

Read `src/system.md` before adding one. The viewBox is 1:1 with CSS pixels, the
palette is semantic tokens only, and there is no accent.

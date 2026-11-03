# Moving a tenant off the shared platform

A tenant can leave the shared platform in two ways:

- **To a dedicated project.** The tenant gets its own Supabase project, which
  Fusion still runs.
- **To a self-hosted install.** The client runs Valence on their own
  infrastructure.

Both moves follow one procedure. A self-hosted move adds the steps in
[What a self-hosted move adds](#what-a-self-hosted-move-adds).

**Moving a tenant is a routine job only if the
[data rules](README.md#data-rules) hold from the first release.** If they hold,
each move is a runbook: a few hours of work and a few minutes of paused editing.
If they do not, each move is a hand-written migration for that one client.

The Supabase details below come from what we knew before November 2026. They
could not be checked against Supabase's documentation, because the session that
wrote this could not reach supabase.com. They are listed under
[To verify](#to-verify).

## What a tenant consists of

| Part | Where it lives on the shared platform | How it moves |
|---|---|---|
| Approvals and audit trail | Valence tables and Cortex Trace, tagged with the tenant | With the rows |
| Assistant memory | Cortex Engram, in the tenant's scope | With the rows |
| Content, revisions, and changesets | Postgres rows with the tenant's ID | Tenant export and import |
| Media | Objects in the storage bucket, under the tenant's prefix | Copied through the S3 API, then checked by checksum |
| Published site | The client's own git repository | Does not move |
| Repository access | The GitHub App installation on the client's repository | Stays, and the new plane receives the installation's ID |
| Schedules and queued jobs | The Postgres job table | Paused on the old plane, then exported with the rows |
| Search index | Built from the rows | Rebuilt on the new plane |
| Secrets | Webhook secrets, API keys for the site, and the preview secret | Issued again on the new plane, and the old ones revoked |
| Sign-in identities | The sign-in provider | See [Sign-in](#sign-in) |
| Site settings | Environment variables in the client's Vercel project | Updated to point at the new plane |

The published site is in git, so it keeps serving throughout a move. The move
only pauses editing.

## The procedure

1. **Check the target.** The new plane runs the same Valence version and the same
   schema version as the old one. It has the same major Postgres version and
   the same extensions.
2. **Create the target.** For a dedicated move, Fusion creates the Supabase
   project and the bucket, then runs Valence's migrations. For a self-hosted move,
   the client provides Postgres, a store, and a sign-in provider, then runs the
   same migrations.
3. **Pause editing.** The tenant goes read-only on the old plane: the editor
   shows a notice, the assistant's write tools refuse, and the scheduler skips
   the tenant's jobs. A schedule due during the pause runs when editing resumes.
4. **Export.** The export tool writes every row with the tenant's ID to a
   versioned archive, in an order that respects foreign keys. The archive
   records the schema version and a checksum for each table.
5. **Copy media.** Objects under the tenant's prefix are copied to the new store.
   Content holds asset IDs, so no document changes.
6. **Import.** The import tool loads the archive into the new plane and checks
   every table's row count and checksum against the archive.
7. **Move sign-in.** See [Sign-in](#sign-in).
8. **Switch over.**
   - The control plane records the tenant's new location.
   - The site's environment variables point at the new plane.
   - The GitHub App webhook for the client's repository delivers to the new
     plane.
   - New secrets are issued.
9. **Check the site.** `helix visual` captures the live site and the draft-mode
   preview, and compares both with captures taken before the pause. A smoke test
   opens the editor, saves a draft, and discards it.
10. **Resume editing** on the new plane.
11. **Retire the old rows.** They stay read-only on the old plane for a set
    period, such as 30 days, and are then deleted. Until then, undoing the move
    is a routing change in the control plane.

## Large tenants

For most tenants, steps 3 through 10 take minutes. A tenant with years of
revisions, or one that cannot pause editing, can be copied while it stays live:

1. Create a Postgres publication filtered to the tenant's ID. Row filters on
   publications exist from Postgres 15.
2. Subscribe the new plane to it, and let it catch up.
3. Pause editing only for the switch-over and the checks.

This needs logical replication out of a Supabase project, which is under
[To verify](#to-verify). If it is not available, the tenant takes a longer
pause, scheduled with the client.

## Sign-in

Valence users and their sign-in identities are separate records. Only the
identities depend on the provider.

- **To a dedicated Supabase project.**
  - The tenant's users can be copied with their Supabase Auth records, password
    hashes included.
  - Each project signs its own tokens, so every session ends and every editor
    signs in once more.
  - Single sign-on and social sign-in need their redirect addresses updated for
    the new project.
- **To a self-hosted install.** The client's provider issues new identities.
  Each editor signs in once, and Valence links the new identity to their existing
  user by verified email. Authorship, approvals, and history stay intact,
  because they point at the user.

**Passwords are the hard part.** A provider that cannot import Supabase's bcrypt
hashes means every editor sets a new password. Emailed links and single sign-on
avoid this, so they should be the default sign-in methods on the shared
platform.

## What a self-hosted move adds

- **Who runs it.** The client runs Postgres, storage, sign-in, and the Valence
  server, and handles backups, upgrades, and uptime. Fusion provides one
  container image, its migrations, and the editor's static files.
- **Updates.** Releases are versioned and the client upgrades on their own
  schedule. A self-hosted plane can fall behind the platform's schema version,
  so an archive exported from a newer version needs the client to upgrade first.
- **The assistant.** The hosted assistant needs to reach the client's Valence API
  through a scoped token, or the client supplies their own model key and runs
  the assistant in their install. A client that blocks inbound traffic needs
  the second option.
- **Support.** The contract has to say where Fusion's responsibility ends.
- **Repository access.** The client installs the GitHub App themselves, or
  provides an app of their own.

## Moving back

The same procedure runs in reverse. A tenant moves from a dedicated project or
a self-hosted install back to the shared platform. Its IDs are UUIDv7 and no
reference crosses a tenant, so its rows load beside the other tenants' rows
without renumbering.

## What makes a move hard

Each item below turns the runbook into a hand migration. Each is also an easy
choice to make early on a shared Supabase project, which is why each has a rule
in [README.md](README.md#data-rules).

| Choice | What breaks in a move |
|---|---|
| A cache key or search entry with no tenant | It is lost in the export, or it serves one tenant's data to another |
| A child table that gets its tenant only through a join | The export misses its rows, or needs a hand-written query for each table |
| A full URL stored in content | Every document needs rewriting when the store or domain changes |
| Media metadata kept only in Supabase's `storage.objects` | The media list does not exist on any other store |
| Row-level security written against `auth.uid()` | Every policy fails on a plane without Supabase Auth |
| Scheduling in `pg_cron` or Supabase Edge Functions | The schedules do not exist on the new plane |
| Serial IDs | Rows collide when a tenant moves into another database |
| The site calling Supabase directly | The site needs a code change for every move |
| Users keyed by the provider's ID | Authorship and approvals point at IDs the new provider does not have |

## Effort

These are estimates.

- **The export and import tool** is part of the first release, because backups,
  restores, and a client's exit use it too. Building it with its checks, and
  with a test that moves a tenant between two local planes, is a few weeks of
  work.
- **A move to a dedicated project** is a few hours of work, with minutes of
  paused editing.
- **A move to a self-hosted install** takes the same move plus the client's own
  setup, which depends on their infrastructure. Document the setup once, and
  test it in CI by bringing up a self-hosted plane from the container image.

## To verify

These need supabase.com, which the session that wrote this could not reach:

- Whether a Supabase project can publish logical replication to a database
  outside Supabase, and whether it supports publication row filters.
- How Supabase Auth users and their password hashes are exported and imported
  between projects, and which other providers accept the hashes.
- Supabase Storage's S3 compatibility, and its limits for copying a large bucket.
- Supabase's prices for a dedicated project, to compare with Neon and RDS.

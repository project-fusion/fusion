# Valence

**Stage: Declared.** This is committed direction, and no code exists yet.

The name comes from chemistry. An atom's valence is how many bonds it can form,
and Valence bonds each client's content to the Helix components of their brand.

Valence is a content system for websites built on Helix. A client edits their
site in forms or by clicking the page itself. An assistant can make the same
changes, and code changes too, once the client approves them. Every published
change becomes a commit in the site's own repository.

This document records the design decisions made so far and the reasons for
them. [MIGRATION.md](MIGRATION.md) covers moving a client off the shared
platform.

## Why we are building it

We compared the hosted and git-based content systems available in November 2026:

- Sanity, Storyblok, Contentful, Prismic, DatoCMS, Hygraph, and Builder.io.
- Payload, TinaCMS, Keystatic, Decap, and Pages CMS.

Three gaps decided it:

- **No vendor documents click-to-edit inside shadow DOM.** Helix renders its
  components in shadow roots. We own those components, so we can make them
  report their own editable regions.
- **No hosted vendor lets an agency resell its licenses.** A Fusion-branded editor
  that Fusion bills for needs software Fusion runs.
- **No system ties a content change to a code change.** Sanity's releases group
  several documents, and Payload keeps drafts one document at a time. Neither
  can hold back content until the pull request that adds its component merges,
  so a change that needs both has no single unit to preview, check, approve,
  and publish.

Clients who launch before Valence is ready use Sanity, or TinaCMS where they want
their content in git. Valence's click-to-edit layer is built so that it works over
either of those as well.

## Decisions

1. **Content is worked on in Postgres, and git records what is published.**
   Drafts, autosave, revisions, locks, schedules, and search live in the
   database, so edits are instant and several editors can work at once.
   Publishing writes one commit to the site's repository, or opens a pull
   request when the change needs review. The repository always holds the whole
   published site, which gives the client its history, its ownership, and its
   way out.
2. **A changeset is the unit of change.** A changeset groups edits across any
   number of documents. It is previewed, checked, approved, scheduled, and
   published as one, and it becomes one commit. A changeset can name the pull
   request it depends on, such as one that adds a component, and it cannot
   publish until that pull request merges.
3. **Git wins a conflict.** A webhook reads every commit Valence did not write back
   into the database, such as a developer's commit or the assistant's pull
   request. A document changed in both places since the last sync is shown to
   an editor as a conflict to resolve.
4. **Schemas come from the Helix manifest.** Each block is a Helix component,
   and its fields are the component's properties and slots, as
   `helix manifest build` already records them. When the component set changes,
   the schemas change with it, and every site stays on the current brand
   components.
5. **The server is Rust and the interface is TypeScript.** Rust holds the
   content API, the changeset engine, publishing to git, reading commits back,
   the scheduler, and the assistant's tools. That puts Cortex Trace and the
   plugin host in the same process as the code that calls them. TypeScript
   holds the editor app, the click-to-edit overlay, and the Next.js client
   library. The TypeScript client is generated from the Rust types at build
   time, and it is never committed.
6. **We sell the hosted option, and nothing depends on a host.** Each outside
   service sits behind an interface with a standard protocol as its boundary.
   Supabase is one way to provide those services.
7. **Two tenancy models share one codebase.** Small clients share a platform.
   Larger clients, and clients who ask, get a dedicated project or host Valence
   themselves. Every row carries a tenant ID and row-level security is always
   on, even in a dedicated database, so the code takes the same path in both
   models.
8. **Click-to-edit works through a contract in Helix.** Each Helix element
   marks its editable slots and content properties, using names from the
   manifest. No Helix element uses a closed shadow root, so the overlay can
   measure regions inside a component.
9. **The assistant works through the same changesets as a person.** It drafts
   freely. Publishing, scheduling, opening a pull request, and merging each
   wait for the client's approval. Cortex Trace records every action with the
   request that caused it.
10. **Nothing publishes without passing `helix visual`.** A changeset preview is
    the site in draft mode with that changeset selected, and it needs no build.
    `helix visual` captures it and compares it with the site's baselines before
    the publish button is enabled.

## Services and their interfaces

| Need | Interface | Hosted | Self-hosted |
|---|---|---|---|
| Database | Postgres, plus SQLite for local work and small installs | Supabase, Neon, or RDS | Any Postgres |
| Git | A provider trait, GitHub first | GitHub | GitHub, then GitLab and Gitea |
| Live updates and presence | Streams from the Rust server over Postgres `LISTEN/NOTIFY` | The same | The same |
| Media | Any S3-compatible store | Supabase Storage or Cloudflare R2 | MinIO, or a folder on disk |
| Scheduled jobs | A job table in Postgres that the Valence worker drains | The same | The same |
| Sign-in | Any OpenID Connect provider, with tokens checked by Valence | Supabase Auth | Keycloak, Authentik, or Entra ID |

Postgres and SQLite are held in lockstep by one conformance suite, the way
Cortex holds its two stores.

**Valence uses no service a self-hosted install would lack.** Supabase Realtime,
`pg_cron`, Edge Functions, and the Supabase client libraries stay out of the data
path. On the hosted platform, Supabase provides Postgres, storage, and sign-in.

## Parts

| Part | Language | What it does |
|---|---|---|
| Assistant tools | Rust | The content and repository actions, offered to a model through the `fusion:tools` world |
| Changeset engine | Rust | Groups edits, resolves what a changeset depends on, and publishes |
| Content API | Rust | Reads and writes documents, revisions, and changesets for the editor, the site, and the assistant |
| Editor | TypeScript | The editing app, built from Helix components, with `helix/editor` for rich text |
| Git publisher | Rust | Writes a changeset as one commit or one pull request, and reads outside commits back in |
| Next.js client | TypeScript | Draft mode, refreshing pages after a publish, and the editing attributes on Helix elements |
| Overlay | TypeScript | Loads only in draft mode, draws the editable regions, and passes clicks and edits to the editor |
| Scheduler | Rust | Publishes changesets and merges pull requests at their set times, and is safe to run twice |

There are also two planes:

- **The control plane** holds billing, the list of tenants, and where each tenant
  lives.
- **A data plane** runs Valence. It is either a shared plane with many small
  tenants, or a dedicated plane with one tenant.

A self-hosted install is a data plane without our control plane.

## How a change moves

1. An editor, or the assistant, opens a changeset and edits documents in it.
2. The preview shows the site in draft mode with the changeset selected. The
   overlay maps each click to the field that holds it.
3. `helix visual` captures the preview and compares it with the site's
   baselines.
4. The client approves. Valence records who approved, and which version of the
   changeset they saw.
5. The changeset publishes now or at its set time. Valence writes one commit, or
   opens a pull request when the repository's rules require review.
6. The site refreshes the pages the changeset touched.

A code change from the assistant takes the path GitHub already provides:

1. The assistant opens a pull request.
2. Vercel builds a preview.
3. `helix visual` posts its result as a required check.
4. The client's approval is posted as a second required check.
5. Auto-merge merges the pull request once both checks pass.

## Data rules

These rules keep a tenant movable. [MIGRATION.md](MIGRATION.md) explains what
breaks without each one.

- **Every row carries a tenant ID**, join tables and asset records included.
- **No reference crosses a tenant.** No foreign key, and no stored ID, points
  at another tenant's rows.
- **IDs are UUIDv7**, generated by Valence. No serial column exists anywhere, so
  rows from two databases never collide.
- **Content stores asset IDs.** A URL is built when the page renders, so moving
  the media store rewrites nothing.
- **Row-level security reads a Valence setting.** Policies check
  `current_setting('valence.tenant_id')`, which the server sets in each
  transaction, and never a provider's function such as Supabase's `auth.uid()`.
- **A person is a Valence user.** A user links to one or more sign-in identities,
  each an issuer and a subject. Authorship and approvals point at the user, so a
  change of sign-in provider only relinks identities.
- **Superseded revisions are kept.** The audit trail needs them to explain what
  the site showed at any time.
- **Every data plane records its schema version.** A migration adds the new
  form first, moves the data, and drops the old form only after every plane has
  upgraded.

## Build order

1. **The changeset engine and the git publisher.** This is the core idea, and it
   can be tested without an editor interface.
2. **The Helix editing contract and the overlay.** This is the riskiest part,
   and it is worth having over Sanity or TinaCMS even if Valence stops there.
3. **Tenant export and import.** One tool moves a tenant, restores a backup, and
   hands a client their data when they leave. It comes early because every rule
   in [Data rules](#data-rules) needs a test that exercises it.
4. **The editor, the assistant tools, and the scheduler.**
5. **The control plane, billing, and the first dedicated plane.**

## Open questions

- **Clearing the name.** One web search on November 4, 2026 found no content
  system called Valence. A trademark search, and checks of the domain, npm, and
  crates.io names, are still needed.
- **The hosted provider.** Supabase is the leading choice. Because nothing depends
  on it, the decision can wait for a cost comparison with Neon and RDS.
- **Editing together.** Document locks with presence come first. Merging two
  people's edits as they type, with a CRDT such as Yjs, is a later decision.
- **Where the assistant runs.** Claude Managed Agents fits the hosted platform,
  with one session per request and approvals in chat. A self-hosted install
  needs either our hosted assistant to reach its API, or the client's own model
  key.
- **Pricing**, for each tenancy model.

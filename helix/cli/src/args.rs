//! The argument grammar.
//!
//! **`helix <noun> <verb>`, and the noun is not optional.** Scaffolding,
//! templates and theming are the same binary, so `theme` is one branch of a
//! surface that will also hold `new` and `template`. A flat `helix build` would
//! be shorter today and ambiguous the moment the second noun lands, and the
//! version of this that reads well now is the one that has to be broken later.
//!
//! **Two global flags and no more.** `--json` and `--no-color` are about the
//! *channel* rather than the command, so they belong to the binary; everything
//! else belongs to a verb. A global flag that only some verbs honor is a
//! promise the help text makes and the code does not keep.

use std::path::PathBuf;

use clap::{Args, Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(
    name = "helix",
    about = "The Helix command line.",
    /* The release this binary was installed as, not the number it was compiled
    at: one build then serves every release that changes no Rust. */
    version = crate::shipped(),
    /* Every subcommand is required, at every level: a bare `helix` or a bare
    `helix theme` prints help and exits 2 rather than guessing. */
    subcommand_required = true,
    arg_required_else_help = true
)]
pub struct Cli {
    #[command(subcommand)]
    pub noun: Noun,

    /* **Available on every verb, always**, which is the contract rather than a
    convenience: a command that has a human form and no JSON form is one a
    script has to parse prose out of, and prose is the thing this repository
    reserves the right to improve. The reasoning stays here and out of the help
    text, which is a reader's and carries no markup. */
    /// Emit machine-readable JSON on stdout.
    ///
    /// Available on every verb, in a shape a script can read without parsing
    /// sentences.
    #[arg(long, global = true)]
    pub json: bool,

    /// Never color the output.
    ///
    /// Color is already off when stdout is not a terminal and when `NO_COLOR`
    /// is set. This is the third way, for a terminal that reports itself capable
    /// and is not.
    #[arg(long, global = true)]
    pub no_color: bool,
}

#[derive(Debug, Subcommand)]
pub enum Noun {
    /* **Serving is the noun's own action**, so `helix mcp` with no verb
    serves, as it always has, and `init` is the one verb beside it: writing a
    client's configuration is a different act from serving, and a person runs
    it once. */
    /// Serve Helix to an agent, over stdio, as an MCP server.
    ///
    /// With no verb it serves: the client asks for what it wants over the
    /// protocol. `helix mcp init` writes a client's configuration.
    Mcp(Mcp),

    /* **A noun for the installed packages' own description of themselves.**
    Each verb is one of the MCP server's lookups, so a script and an agent
    get the same answer from the same function. */
    /// Look up the installed Helix packages: families, examples, imports, and tokens.
    ///
    /// Reads `api.json`, `examples.json`, and `tokens.json` from the Helix
    /// packages in `node_modules`, every one that publishes `api.json`, so every
    /// answer is the installed versions'.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Api {
        #[command(subcommand)]
        verb: Api,
    },

    /* **The design system saying whether you extended it correctly**, rather
    than a linter to be configured into usefulness. A published binary carries
    the rules any project built on Helix's base classes can run; this
    repository's builds carry Helix's own conventions as well. */
    /// Hold components to the conventions Helix is built on.
    ///
    /// Reads the tiers named by `helix.json`.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Component {
        #[command(subcommand)]
        verb: Component,
    },

    /* **A noun with no verb**: it does one thing, which is to serve, and a
    page asks for the rest over HTTP. */
    /// Receive the runs `initDiagnostics()` sends from your app, and print them.
    ///
    /// Listens on 127.0.0.1 beside any dev server. Pages on a local host post
    /// each run here; it prints each finding the first time a page has it,
    /// writes the latest run of every page to `--out` where given, and serves
    /// your `helix-diagnostics.json` to the page.
    Diagnostics(Diagnostics),

    /* **This repository's compiler, so only in its builds**, for the reason
    `manifest build` gives: it reads Helix's own platform-neutral sources, and
    what a consumer installs is its output. */
    /// Compile each family's platform-neutral source for the web and for React Native.
    #[cfg(feature = "internal")]
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Family {
        #[command(subcommand)]
        verb: Family,
    },

    /* **A noun for the artifact rather than a verb on the component noun.**
    `component` holds a design system to its conventions; a manifest is a file,
    and what is asked of a file is whether two of them say the same thing. */
    /// Read and compare custom elements manifests.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Manifest {
        #[command(subcommand)]
        verb: Manifest,
    },

    /* **A noun with no verb.** `new` does one thing to one subject and there
    is no second verb it could take: `helix new list` would be a word for what
    an omitted `--template` already prints. */
    /// Scaffold a project from a Helix template.
    ///
    /// Reads the templates in `@fusion.dev/helix-templates`, which npm installs
    /// with `@fusion.dev/helix-cli`. Omit the name or `--template` in a terminal
    /// to be asked for it.
    New(New),

    /* **A noun with no verb, like `diagnostics`**: it does one thing to one
    project. */
    /// Read your project's code for what it uses of Helix and what it gets wrong.
    ///
    /// Reads every stylesheet, template, and module in the repository, judges
    /// them against the lint data of the Helix packages you installed, and
    /// prints each finding with its file and line. Writes the run to `--out`
    /// beside the runs `helix diagnostics` writes there. Exits 1 on a finding
    /// at `error`.
    Scan(Scan),

    /* **A noun with no verb, like `scan`**: it does one thing to the code an
    app shares between the web and a phone. */
    /// Check the code an app shares between the web and a phone for what only the web has.
    ///
    /// Reads each module under the paths given, or under the directory it runs
    /// in, except the files named for one platform, such as page.web.tsx and
    /// page.native.tsx. Reports the browser's globals, DOM elements, CSS, and
    /// the Helix families, props, and events a phone does not have, judged
    /// against the Helix packages you installed. Exits 1 on a finding.
    Shared(Shared),

    /// Derive, verify and inspect a theme.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Theme {
        #[command(subcommand)]
        verb: Theme,
    },

    /* **A noun for the pictures of a project**, beside `scan` and
    `diagnostics`, which read its code and its pages. The verbs and their
    flags are the visual crate's own, so its help text is written where its
    behavior is. */
    /// Picture each page and compare it with a baseline kept in git.
    ///
    /// Reads `visual.config.ts` beside where it runs. `test` compares, `update`
    /// writes the baselines the comparison rejects, `accept` writes the
    /// captures of a failed `test` into the baselines, `report` opens the last
    /// run, and `compare` holds two PNG files to each other. `test` and
    /// `update` need Playwright installed.
    #[command(subcommand_required = true, arg_required_else_help = true)]
    Visual {
        #[command(subcommand)]
        verb: fusion_helix_visual::Visual,
    },
}

/// What `helix diagnostics` takes.
#[derive(Args, Debug)]
pub struct Diagnostics {
    /// The port to listen on. 0 picks a free one, and the first line printed
    /// says which.
    #[arg(long, default_value_t = 7417)]
    pub port: u16,

    /// Write the latest run of every page here, as the CI file.
    #[arg(long, value_name = "PATH")]
    pub out: Option<PathBuf>,

    /// The settings to serve to the page. Defaults to `helix-diagnostics.json`
    /// in the directory it runs in.
    #[arg(long, value_name = "PATH")]
    pub config: Option<PathBuf>,

    /// Open this page headless, diagnose it once, print what it found, and
    /// exit, instead of listening. Repeat for each page.
    ///
    /// Needs nothing added to the app: the installed
    /// `@fusion.dev/helix-diagnostics` runs in the page once it holds still,
    /// with Playwright, as `helix visual` does. Exits 1 on a finding at
    /// `error`.
    #[arg(long, value_name = "URL")]
    pub once: Vec<String>,
}

/// What `helix shared` takes.
#[derive(Args, Debug)]
pub struct Shared {
    /// The files and folders to read. Defaults to the directory it runs in.
    #[arg(value_name = "PATH")]
    pub paths: Vec<PathBuf>,
}

/// What `helix scan` takes.
#[derive(Args, Debug)]
pub struct Scan {
    /// The project to read. Defaults to the directory it runs in.
    #[arg(value_name = "DIR")]
    pub dir: Option<PathBuf>,

    /// The folder your bundler writes the browser's files to, with source
    /// maps on, such as `dist` or `.next/static`. Weighs what each Helix
    /// family adds to it.
    #[arg(long, value_name = "DIR")]
    pub build: Option<PathBuf>,

    /// Write the run to this CI file, keeping the runs `helix diagnostics`
    /// wrote there.
    #[arg(long, value_name = "PATH")]
    pub out: Option<PathBuf>,

    /// The settings to use. Defaults to `helix-diagnostics.json` in the
    /// project, then in the directory it runs in.
    #[arg(long, value_name = "PATH")]
    pub config: Option<PathBuf>,

    /// Report only this file's findings. Repeat for each. The whole project
    /// is still read, so the file is judged against every import it has.
    #[arg(long, value_name = "PATH")]
    pub file: Vec<PathBuf>,

    /// Read a snippet from stdin, in this language, such as `tsx` or `css`,
    /// and report only its findings, judged against the project.
    #[arg(long, value_name = "LANGUAGE")]
    pub stdin: Option<String>,

    /// Write the fixes a scan can make into the source, then report what is
    /// left. Today that is `unlinked-trigger`: `aria-describedby` on a
    /// tooltip's plain trigger, and an `id` on the tooltip where it has none.
    #[arg(long, conflicts_with = "stdin")]
    pub fix: bool,
}

#[derive(Debug, Subcommand)]
pub enum Theme {
    /// Write a starter intent.
    Init(Init),
    /// Emit the theme as CSS.
    ///
    /// Both modes as one block of `light-dark()` pairs, unless the intent
    /// names a `scheme`.
    Build(Build),
    /// Report every pair the theme was checked against, in each mode.
    ///
    /// Exits 1 when a pair fails, so it works as a gate, and prints the matrix
    /// either way, so it works as an answer. Opens a screen on a terminal and
    /// prints the table anywhere else.
    Audit(Audit),
    /// Fail if the theme has violations, and print nothing when it does not.
    ///
    /// The CI shape of `audit`: same measurement, quiet on success.
    Check(Common),
}

/// What every theme verb that reads an intent takes.
#[derive(Args, Debug)]
pub struct Common {
    /// The intent to read. Defaults to the nearest `helix.theme.json`.
    pub intent: Option<PathBuf>,

    /// Read the intent from here instead of searching.
    ///
    /// The positional argument does the same; this reads better beside other
    /// flags. The positional wins if both are given.
    #[arg(long, value_name = "PATH")]
    pub config: Option<PathBuf>,
}

#[derive(Args, Debug)]
pub struct Audit {
    #[command(flatten)]
    pub common: Common,

    /// Print the table instead of opening the screen.
    ///
    /// For scrollback, copying a row, or diffing two runs. Not needed in a
    /// pipeline, where the table already prints.
    #[arg(long)]
    pub plain: bool,
}

#[derive(Args, Debug)]
pub struct Build {
    #[command(flatten)]
    pub common: Common,

    /// Write to this file instead of stdout.
    #[arg(long, short, value_name = "PATH")]
    pub out: Option<PathBuf>,

    /// The selector the block is written under.
    ///
    /// `:root` ties the selectors Helix's own stylesheet declares its tokens
    /// under, so the block wins only where it loads after that stylesheet.
    /// `:root[data-helix-theme]` outranks them wherever it loads, on a root
    /// that carries the attribute.
    #[arg(long, default_value = ":root", value_name = "SELECTOR")]
    pub selector: String,

    /* **The default is to refuse**, which is the whole argument for a tool that
    derives rather than generates: writing a failing palette with a warning
    above it produces a file that outlives the warning. */
    /// Emit the block even when a pair fails its target.
    ///
    /// Refused by default: a palette that does not meet the contrast it claims
    /// is the failure this engine exists to prevent. Use it while iterating, to
    /// see what you have.
    #[arg(long)]
    pub force: bool,
}

#[derive(Args, Debug)]
pub struct Init {
    /// Where to write it. Defaults to `helix.theme.json` here.
    #[arg(long, short, value_name = "PATH")]
    pub out: Option<PathBuf>,

    /// The brand color to seed it with. Without one, the theme is ink.
    #[arg(long, value_name = "HEX")]
    pub brand: Option<String>,

    /// Overwrite an existing file.
    #[arg(long)]
    pub force: bool,
}

/// What can be asked of a manifest.
#[derive(Debug, Subcommand)]
pub enum Manifest {
    /* **The instrument a second generator is held to.** Replacing the analyzer
    is only safe if the thing replacing it can be shown to produce what the
    thing it replaces produced, and the manifest is the most-checked artifact
    here: the reference pages, the framework typings and sixty component rules
    all read it. */
    /// Say what two manifests disagree about, in the manifest's own terms.
    ///
    /// Exits 1 on any difference, so a generator that claims to match can be
    /// made to prove it in a pipeline.
    Diff(ManifestDiff),

    /* **This repository's generator, so only in its builds.** `helix-cem`
    runs it to write each tier's manifest, and it reads Helix's own source
    conventions, so a published binary leaves it out. */
    /// Generate a manifest from a package's sources.
    ///
    /// Writes to stdout.
    #[cfg(feature = "internal")]
    Build(ManifestBuild),
}

/// The verbs of `helix family`.
#[cfg(feature = "internal")]
#[derive(Debug, Subcommand)]
pub enum Family {
    /// Write each family's intermediate form and web stylesheet to the package's `dist`.
    ///
    /// With `--check`, writes nothing and exits 1 when a written one differs
    /// from what the sources compile to, so a build and a check are two
    /// builds compared.
    Build(FamilyBuild),

    /// Write each capability's contract into core's sources.
    ///
    /// Writes `src/capabilities/<capability>/contract.generated.ts` and the
    /// types they share, from the contracts the compiler defines. With
    /// `--check`, writes nothing and exits 1 when one is missing or out of
    /// date.
    Capabilities(FamilyCapabilities),

    /// Hold each element's API to the manifest.
    ///
    /// Exits 1 when an element's attributes, events, slots, parts or states
    /// differ from the manifest's.
    Check(FamilyArgs),

    /// Write each family's native components, with their props typed, for the styled package.
    ///
    /// Writes `<family>/index.native.ts` under `--out`: each element's
    /// intermediate form, its props type, and its component, which draws the
    /// form with `@fusion.dev/helix-native`. Each prop, slot and event is
    /// described from the styled manifest, and each event's detail is typed
    /// from core's event classes. With `--check`, writes nothing and exits 1
    /// when a written module is missing or out of date.
    Components(FamilyComponents),

    /// Write the token layer as a Design Tokens Format Module file, with a resolver for its modes.
    ///
    /// Reads the token layer in the styles package and writes
    /// `dist/helix.tokens.json`, light mode at the default density, and
    /// `dist/helix.resolver.json`, which adds dark mode and each density stop.
    /// Refuses a token whose CSS differs from what `tokens.ts` writes for it,
    /// which `dist/tokens.json` records. With `--check`, writes nothing and
    /// exits 1 when a written file is missing or out of date.
    DesignTokens(FamilyDesignTokens),

    /// Print what each element is called on each platform, as JSON.
    ///
    /// For each element with a native component: the component's name, and
    /// the name each property, slot, and event of the web element takes as a
    /// prop. `analyze` writes it into the styled package's `api.json`, which
    /// `helix api` and the MCP server read.
    Platforms(FamilyArgs),

    /// Write each generated stylesheet into the styled package's sources.
    ///
    /// With `--check`, writes nothing and exits 1 when one is missing or out of
    /// date.
    Stylesheets(FamilyStylesheets),

    /// Compile each machine in core to the flat module beside it.
    ///
    /// Reads `src/machines/<machine>/machine.ts` and writes
    /// `<machine>.generated.ts` beside it. Refuses a machine that is not total,
    /// has a state it can never enter, or names anything it does not define.
    /// With `--check`, writes nothing and exits 1 when a written module is
    /// missing or out of date.
    Machines(FamilyMachines),

    /// Write each mode's native token module into the package's sources.
    ///
    /// Reads the token layer in the styles package beside it, types every
    /// token, and writes `src/theme/light.generated.ts` and
    /// `dark.generated.ts` with each token's value as the native renderer
    /// takes it. Refuses a token whose value it cannot type. With `--check`,
    /// writes nothing and exits 1 when a written module is missing or out of
    /// date.
    Tokens(FamilyTokens),

    /// Write the intermediate form's TypeScript types into the package's sources.
    ///
    /// With `--check`, writes nothing and exits 1 when the written types are
    /// missing or out of date.
    Types(FamilyTypes),
}

/// What `family capabilities` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyCapabilities {
    /// Say which written contracts are missing or out of date, and write nothing.
    #[arg(long)]
    pub check: bool,

    /// The package holding the capabilities, which is the directory holding its `src`.
    #[arg(default_value = "helix/core")]
    pub package: PathBuf,
}

/// What `family components` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyComponents {
    /// Say which written modules are missing or out of date, and write nothing.
    #[arg(long)]
    pub check: bool,

    /// The directory each family's module is written under, as
    /// `<family>/index.native.ts`: the `native` folder of the styled package
    /// beside the neutral one, unless given.
    #[arg(long, value_name = "DIR")]
    pub out: Option<PathBuf>,

    /// The package holding the sources, which is the directory holding its `src`.
    #[arg(default_value = "helix/neutral")]
    pub package: PathBuf,
}

/// What `family design-tokens` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyDesignTokens {
    /// Say which written files are missing or out of date, and write nothing.
    #[arg(long)]
    pub check: bool,

    /// The styles package, which is the directory holding its `src`.
    #[arg(default_value = "helix/styles")]
    pub package: PathBuf,
}

/// What `family machines` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyMachines {
    /// Say which written modules are missing or out of date, and write nothing.
    #[arg(long)]
    pub check: bool,

    /// The package holding the machines, which is the directory holding its `src`.
    #[arg(default_value = "helix/core")]
    pub package: PathBuf,
}

/// What `family tokens` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyTokens {
    /// Say which written modules are missing or out of date, and write nothing.
    #[arg(long)]
    pub check: bool,

    /// The package the modules are written into, which is the directory holding its `src`.
    #[arg(default_value = "helix/native")]
    pub package: PathBuf,
}

/// What `family types` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyTypes {
    /// Say whether the written types are missing or out of date, and write nothing.
    #[arg(long)]
    pub check: bool,

    /// The package the types are written into, which is the directory holding its `src`.
    #[arg(default_value = "helix/native")]
    pub package: PathBuf,
}

/// What `family stylesheets` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyStylesheets {
    /// Say which generated stylesheets are missing or out of date, and write nothing.
    #[arg(long)]
    pub check: bool,

    /// The directory a stylesheet's path is under: the `src` of the styled
    /// package beside the neutral one, unless given.
    #[arg(long, value_name = "DIR")]
    pub out: Option<PathBuf>,

    /// The package holding the sources, which is the directory holding its `src`.
    #[arg(default_value = "helix/neutral")]
    pub package: PathBuf,
}

/// What `family build` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyBuild {
    /// Say which written outputs differ from what the sources compile to, and write nothing.
    #[arg(long)]
    pub check: bool,

    /// The package holding the sources, which is the directory holding its `src`.
    #[arg(default_value = "helix/neutral")]
    pub package: PathBuf,
}

/// What `family check` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct FamilyArgs {
    /// The package holding the sources, which is the directory holding its `src`.
    #[arg(default_value = "helix/neutral")]
    pub package: PathBuf,
}

/// What `manifest build` takes.
#[cfg(feature = "internal")]
#[derive(Args, Debug)]
pub struct ManifestBuild {
    /// The package to read, which is the directory holding its `src`.
    pub package: PathBuf,

    /* **Given rather than discovered.** The analyzer takes it from a
    TypeScript config, and a Rust binary that executed one to find out would be
    doing the thing this exists to stop doing. Sandbox declares `styled`, which
    is why it cannot be guessed from the directory either. */
    /// The design-system tier the package belongs to.
    #[arg(default_value = "styled", long)]
    pub tier: String,

    /* **Given rather than resolved**, for the reason `--tier` is: a generator
    that walked `node_modules` would be re-implementing package resolution,
    which is the subsystem this exists to avoid depending on, and it would stop
    being a function of its inputs. A build script knows its own graph; each
    package's `package.json` already writes it down. */
    /// A dependency's manifest, as `<package>=<path>`. Repeat for each.
    ///
    /// Needed to resolve what a class inherits from a base in another package.
    #[arg(long = "dependency", value_name = "PACKAGE=PATH")]
    pub dependencies: Vec<String>,
}

/// What `manifest diff` takes.
#[derive(Args, Debug)]
pub struct ManifestDiff {
    /// The manifest to treat as what is expected.
    pub before: PathBuf,

    /// The manifest to hold against it.
    pub after: PathBuf,

    /* A cap rather than a page, because the question this answers first is
    "did anything move", and a generator part way through its first tier
    answers it with tens of thousands of lines. */
    /// How many differences to print before stopping. Zero for all of them.
    #[arg(default_value_t = 40, long)]
    pub limit: usize,
}

/// What can be asked of the component rules.
#[derive(Debug, Subcommand)]
pub enum Component {
    /// Report every rule and what it found, and exit 1 on a finding.
    Audit(ComponentAudit),
    /// The CI shape of `audit`: same measurement, nothing printed on success.
    Check(Rules),
    /// Run the rules that can write.
    Fix(Rules),
}

/// What `component audit` takes, which is the rules plus how to show them.
#[derive(Args, Debug)]
pub struct ComponentAudit {
    #[command(flatten)]
    pub rules: Rules,

    /* **Not the CI flag**: without a tty the report already prints, so a
    pipeline needs nothing, and a flag that had to be remembered there would be
    one nobody remembered. */
    /// Print the report instead of opening the screen.
    ///
    /// For scrolling your own scrollback, copying a line, or diffing two runs.
    /// Not needed in a pipeline, where the report already prints.
    #[arg(long)]
    pub plain: bool,
}

/// What the component verbs take.
#[derive(Args, Debug)]
pub struct Rules {
    /// Run just these rules.
    #[arg(long, value_delimiter = ',')]
    pub only: Vec<String>,

    /// The workspace to read. Defaults to the current directory.
    #[arg(long)]
    pub root: Option<PathBuf>,
}

#[derive(Debug, Args)]
pub struct New {
    /// The project's name, and the directory it is written into.
    ///
    /// Written wherever the template's register says the name belongs, which is
    /// its manifest and whatever else that template names. Omitted, a terminal
    /// asks for it and anything else is refused.
    pub name: Option<String>,

    /// Which template to use.
    ///
    /// Omitted, a terminal asks which one. Anywhere else the templates are
    /// listed and nothing is written: a scaffolder that picks for you writes a
    /// project the reader did not choose.
    #[arg(long)]
    pub template: Option<String>,

    /// Write into this directory instead of one named after the project.
    #[arg(long)]
    pub into: Option<PathBuf>,
}

/// What `helix mcp` takes.
#[derive(Args, Debug)]
pub struct Mcp {
    #[command(subcommand)]
    pub verb: Option<McpVerb>,
}

#[derive(Debug, Subcommand)]
pub enum McpVerb {
    /// Write a client's configuration to run `helix mcp` in this project.
    ///
    /// Adds a `helix` server to the file the client reads and keeps every
    /// other server in it.
    Init(McpInit),
}

/// What `helix mcp init` takes.
#[derive(Args, Debug)]
pub struct McpInit {
    /// The client to configure.
    #[arg(long, value_enum)]
    pub client: Client,

    /// Replace a `helix` server the file already has.
    #[arg(long)]
    pub force: bool,
}

/// The clients `helix mcp init` writes for, and the file each reads.
#[derive(Clone, Copy, Debug, clap::ValueEnum)]
pub enum Client {
    /// Claude Code: `.mcp.json`.
    Claude,
    /// Cursor: `.cursor/mcp.json`.
    Cursor,
    /// VS Code: `.vscode/mcp.json`.
    Vscode,
    /// Gemini CLI: `.gemini/settings.json`.
    Gemini,
    /// opencode: `opencode.json`.
    Opencode,
    /// Roo Code: `.roo/mcp.json`.
    Roo,
    /// Junie: `.junie/mcp/mcp.json`.
    Junie,
}

/// What can be asked of the installed packages.
#[derive(Debug, Subcommand)]
pub enum Api {
    /// The families that answer a name, an alias, a tag, or a purpose.
    Find(ApiFind),
    /// One family's API: tags, properties, events, slots, parts, words, and imports.
    Family(ApiFamily),
    /// One example of a family, with the import lines it needs.
    Example(ApiExample),
    /// The import lines that register the given tags.
    Imports(ApiImports),
    /// The semantic tokens, by a word in the name or description.
    Tokens(ApiTokens),
}

#[derive(Args, Debug)]
pub struct ApiFind {
    /// What to look for, such as `dropdown` or `date picker`.
    pub query: String,

    /// How many families to list.
    #[arg(long, default_value_t = 10)]
    pub limit: usize,
}

#[derive(Args, Debug)]
pub struct ApiFamily {
    /// The family's slug, label, alias, or one of its tags.
    pub family: String,

    /// The tier to read. Defaults to the styled tier where it is installed.
    #[arg(long, value_parser = ["styled", "headless"])]
    pub tier: Option<String>,
}

#[derive(Args, Debug)]
pub struct ApiExample {
    /// The family's slug, label, alias, or one of its tags.
    pub family: String,

    /// The example's slug. Defaults to the family's first, its preview.
    pub example: Option<String>,

    /// The tier to read. Defaults to the styled tier where it is installed.
    #[arg(long, value_parser = ["styled", "headless"])]
    pub tier: Option<String>,
}

#[derive(Args, Debug)]
pub struct ApiImports {
    /// The tags a page writes, such as `helix-select helix-option`.
    #[arg(required = true)]
    pub tags: Vec<String>,
}

#[derive(Args, Debug)]
pub struct ApiTokens {
    /// A word in the token's name or description.
    pub query: Option<String>,

    /// Only this category, such as `color` or `space`.
    #[arg(long)]
    pub category: Option<String>,
}

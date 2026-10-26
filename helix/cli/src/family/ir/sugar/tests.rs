use super::*;
use crate::family::ir::{styled, Item, Rule};
use crate::family::read::default_export;

fn desugared(source: &str) -> Result<Lit, String> {
    desugar(&default_export(source).unwrap())
}

/// A table in the final syntax, its rules function as written.
fn table(header: &str, rules: &str) -> String {
    format!(
        "import b from './headless.js'\nexport default styles(b, {{ prefix: 'button', stylesheet: 's.css', {header} }}, {rules})"
    )
}

fn rules(source: &str) -> Vec<Rule> {
    styled(&desugared(source).unwrap())
        .unwrap()
        .rules
        .into_iter()
        .filter_map(|item| match item {
            Item::Rule(rule) => Some(*rule),
            Item::Keyframes(_) => None,
        })
        .collect()
}

fn refusal(source: &str) -> String {
    match default_export(source) {
        Ok(export) => desugar(&export)
            .and_then(|lit| styled(&lit).map(|_| lit))
            .unwrap_err(),
        Err(why) => why,
    }
}

#[test]
fn a_table_compiles_to_the_family_shape() {
    let older = default_export(
        "export default family('button', {
          rules: [
            { on: 'host', set: [['display', 'inline-flex']] },
            {
              on: 'button',
              set: [
                ['background-color', hook('background-color', own('button-fill'))],
                ['--icon-size', '1em'],
              ],
              values: [['button-fill', token('color-primary')]],
              when: { emphasis: 'solid' },
            },
            {
              on: { region: 'default' },
              platform: 'web',
              set: [['text-box', 'trim-both cap alphabetic']],
              supports: '(text-box: trim-both cap alphabetic)',
            },
            { on: 'host', set: [['--icon-size', '1em']], slotted: 'helix-icon' },
            { frames: [['to', [['rotate', '1turn']]]], keyframes: 'turn' },
          ],
          stylesheet: 's.css',
        })",
    )
    .unwrap();
    let newer = desugared(&table(
        "hooks: { backgroundColor: null }, own: { buttonFill: null }",
        "({ hook, keyframes, on, own, rule }) => [
          on('host', [rule({ display: 'inline-flex' })]),
          on('button', [
            rule({ emphasis: 'solid' }, {
              backgroundColor: hook.backgroundColor(own.buttonFill),
              '--icon-size': '1em',
              own: { buttonFill: token('color-primary') },
            }),
          ]),
          on({ region: 'default' }, [
            rule({ platform: 'web', supports: '(text-box: trim-both cap alphabetic)' }, { textBox: 'trim-both cap alphabetic' }),
          ]),
          on({ slotted: 'helix-icon' }, [rule({ '--icon-size': '1em' })]),
          keyframes('turn', { to: { rotate: '1turn' } }),
        ]",
    ))
    .unwrap();
    /* The newer syntax keeps each rule's line and group, which the
    intermediate form does not write. */
    let ir = |lit: &Lit| serde_json::to_string(&styled(lit).unwrap().rules).unwrap();
    assert_eq!(ir(&older), ir(&newer));
}

#[test]
fn platform_and_supports_in_a_when_are_the_rules_own() {
    let read = rules(&table(
        "",
        "({ on, rule }) => [on('button', [rule({ disabled: true, platform: 'web' }, { cursor: 'default' })])]",
    ));
    assert!(read[0].web_only);
    assert_eq!(read[0].when.len(), 1);
    let refused = refusal(&table(
        "",
        "({ on, rule }) => [on('button', [rule([{ has: 'a', platform: 'web' }, { has: 'b' }], { opacity: 1 })])]",
    ));
    assert!(refused.contains("the same `platform`"), "{refused}");
}

#[test]
fn variants_are_one_rule_per_value_in_the_order_written() {
    let read = rules(&table(
        "own: { buttonTone: null }",
        "({ on, rule, variants }) => [on('host', [variants('tone', { primary: { own: { buttonTone: 'red' } }, accent: { own: { buttonTone: 'blue' } } })])]",
    ));
    assert_eq!(read.len(), 2);
    assert_eq!(
        format!("{:?}", read[0].when),
        format!(
            "{:?}",
            rules(&table(
                "",
                "({ on, rule }) => [on('host', [rule({ tone: 'primary' }, {})])]"
            ))[0]
                .when
        )
    );
    assert_eq!(read[1].values[0].0, "button-tone");
}

#[test]
fn every_name_is_declared_and_used() {
    let unused = refusal(&table(
        "hooks: { size: null }",
        "({ on, rule }) => [on('host', [rule({ opacity: 1 })])]",
    ));
    assert_eq!(unused, "declared and never used: the hook `size`");
    let undeclared = refusal(&table(
        "",
        "({ hook, on, rule }) => [\n  on('host', [\n    rule({ opacity: hook.size(1) }),\n  ]),\n]",
    ));
    assert!(
        undeclared.starts_with("line 4: `hook.size` is not a hook"),
        "{undeclared}"
    );
}

#[test]
fn each_target_names_its_nodes() {
    let read = rules(&table(
        "",
        "({ on, rule }) => [
          on({ after: 'label' }, [rule({ content: '\"\"' })]),
          on({ part: 'skeleton', exact: true }, [rule({ opacity: 1 })]),
          on({ region: 'end', slotted: '*' }, [rule({ opacity: 1 })]),
          on({ part: 'box', inner: '> *' }, [rule({ platform: 'web' }, { gridArea: '1 / 1' })]),
        ]",
    ));
    assert_eq!(
        (read[0].target.as_str(), read[0].inner.as_deref()),
        ("label", Some("::after"))
    );
    assert!(read[1].exact);
    assert_eq!(
        (read[2].region.as_deref(), read[2].slotted.as_deref()),
        (Some("end"), Some("*"))
    );
    assert_eq!(read[3].inner.as_deref(), Some("> *"));
}

#[test]
fn a_web_only_target_says_so_in_each_rule() {
    let refused = refusal(&table("", "({ on, rule }) => [\n  on({ part: 'box', selector: 'x' }, [\n    rule({ opacity: 1 }),\n  ]),\n]"));
    assert!(
        refused.starts_with("line 4: a rule on `{ part, inner }`"),
        "{refused}"
    );
    let exact_host = refusal(&table(
        "",
        "({ on, rule }) => [on({ part: 'host', exact: true }, [rule({ opacity: 1 })])]",
    ));
    assert!(exact_host.contains("a target names a part"), "{exact_host}");
}

#[test]
fn a_rule_writes_all_first_and_a_shorthand_before_its_longhands() {
    let all = refusal(&table(
        "",
        "({ on, rule }) => [on('button', [rule({ alignItems: 'center', all: web('unset') })])]",
    ));
    assert!(all.contains("`all` comes first"), "{all}");
    let border = refusal(&table(
        "",
        "({ on, rule }) => [on('button', [rule({ borderColor: 'red', border: 'none' })])]",
    ));
    assert!(
        border.contains("`border` after `border-color` resets it"),
        "{border}"
    );
    let physical = refusal(&table(
        "",
        "({ on, rule }) => [on('button', [rule({ width: '1px' })])]",
    ));
    assert!(physical.contains("physical property"), "{physical}");
    rules(&table("", "({ on, rule }) => [on('button', [rule({ all: web('unset'), border: 'none', borderColor: 'red' })])]"));
}

#[test]
fn a_key_written_twice_a_rename_and_a_statement_are_refused() {
    let twice = refusal(
        "import b from './headless.js'\nconst base = { opacity: 1 }\nexport default styles(b, { prefix: 'b', stylesheet: 's' }, ({ on, rule }) => [\n  on('host', [rule({ ...base, opacity: 0 })]),\n])",
    );
    assert!(
        twice.starts_with("line 4: the key `opacity` a second time"),
        "{twice}"
    );
    let renamed = refusal(&table(
        "",
        "({ on: group, rule }) => [group('host', [rule({ opacity: 1 })])]",
    ));
    assert!(renamed.contains("under another name"), "{renamed}");
    let statement = refusal(&table("", "({ on, rule }) => { let x = 1; return [] }"));
    assert!(
        statement.contains("a variable but a `const`"),
        "{statement}"
    );
}

#[test]
fn a_rules_function_reads_its_constants_and_spreads() {
    let read = rules(
        "import b from './headless.js'
        const ease = ['1s', 'linear'] as const
        const card = { tone: ['primary', 'accent'] } as const
        export default styles(b, { prefix: 'button', hooks: { size: null }, stylesheet: 's' }, ({ hook, on, rule }) => {
          const size = hook.size('1em')
          return [on('host', [rule({ hover: true, ...card }, { blockSize: size, transition: ['opacity', ...ease] })])]
        })",
    );
    assert_eq!(read[0].when.len(), 2);
    assert_eq!(read[0].set.len(), 2);
}

#[test]
fn a_fragment_is_rewritten_and_styles_only_its_parts() {
    let export = default_export(
        "export default fragment('field', { parts: ['label'], own: { fieldGap: null } }, ({ on, own, rule }) => [
          on('label', [rule({ gap: own.fieldGap('0px') })]),
        ])",
    )
    .unwrap();
    let Lit::Call(helper, arguments) = fragment(&export).unwrap() else {
        panic!("a call");
    };
    assert_eq!(helper, "fragment");
    assert!(matches!(&arguments[1], Lit::Object(body) if body[0].0 == "rules"));
    let refused = fragment(
        &default_export(
            "export default fragment('field', { parts: ['label'] }, ({ on, rule }) => [\n  on('hint', [rule({ opacity: 1 })]),\n])",
        )
        .unwrap(),
    )
    .unwrap_err();
    assert!(
        refused.starts_with("fragments/field.ts line 2: `hint` is not one of the `parts`"),
        "{refused}"
    );
    let declarations = fragment(
        &default_export("export default declarations('hidden', { blockSize: '1px' })").unwrap(),
    )
    .unwrap();
    assert!(format!("{declarations:?}").contains("block-size"));
}

#[test]
fn an_imported_fragment_is_taken_in_by_its_modules_name() {
    let export = desugared(
        "import b from './headless.js'\nimport field from '../../../fragments/field.js'\nexport default styles(b, { prefix: 'b', stylesheet: 's' }, ({ include }) => [include(field)])",
    )
    .unwrap();
    assert!(
        format!("{export:?}").contains("Call(\"include\", [Text(\"field\")])"),
        "{export:?}"
    );
}

#[test]
fn a_source_in_the_family_shape_is_refused() {
    let older =
        default_export("export default family('b', { stylesheet: 's.css', rules: [] })").unwrap();
    assert!(desugar(&older).unwrap_err().contains("exports `styles("));
    let fragment_older = default_export("export default fragment('f', { rules: [] })").unwrap();
    assert!(fragment(&fragment_older)
        .unwrap_err()
        .contains("exports `fragment("));
}

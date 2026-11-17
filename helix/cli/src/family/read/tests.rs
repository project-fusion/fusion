use super::*;

#[test]
fn reads_a_table_in_the_order_it_is_written() {
    let read = default_export(
        "import { hook } from './style.js'\nexport default f('b', [{ on: 'host', set: [['gap', hook('gap', 4)]] }])",
    )
    .unwrap();
    let Lit::Call(name, arguments) = read else {
        panic!("a call");
    };
    assert_eq!(name, "f");
    assert_eq!(arguments[0], Lit::Text("b".to_owned()));
    let Lit::Array(rules) = &arguments[1] else {
        panic!("an array");
    };
    let Lit::Object(rule) = &rules[0] else {
        panic!("an object");
    };
    assert_eq!(rule[0].0, "on");
    assert_eq!(rule[1].0, "set");
}

#[test]
fn refuses_what_it_would_have_to_run_and_names_the_line() {
    let refused = default_export("const x = 1\nexport default f([x + 1])").unwrap_err();
    assert!(refused.starts_with("line 2:"), "{refused}");
    let named = default_export("const x = 1\nexport default f([x])").unwrap_err();
    assert!(named.contains("a name"), "{named}");
}

#[test]
fn reads_a_machine_with_its_constants_in_place_and_its_functions_by_name() {
    let module = machine_module(
        "export const ready = (context: C): boolean => context.on\n\
         const shared: Answer<S, C, I> = { guard: ready, target: 'on' }\n\
         export const toggle: Statechart<'off' | 'on', 'FLIP', C, undefined, 'say'> = {\n\
           effects: ['say'], events: ['FLIP'], initial: [{ target: 'off' }],\n\
           states: { off: { on: { FLIP: shared } }, on: { on: { FLIP: 'ignore' } } },\n\
         }",
    )
    .unwrap();
    assert_eq!(module.name, "toggle");
    assert_eq!(
        module.types,
        ["'off' | 'on'", "'FLIP'", "C", "undefined", "'say'"]
    );
    assert_eq!(module.functions["ready"], 1);
    let Lit::Object(chart) = &module.chart else {
        panic!("an object");
    };
    let states = &chart.iter().find(|(key, _)| key == "states").unwrap().1;
    let Lit::Object(states) = states else {
        panic!("an object");
    };
    let Lit::Object(off) = &states[0].1 else {
        panic!("an object");
    };
    let Lit::Object(on) = &off[0].1 else {
        panic!("an object");
    };
    assert_eq!(
        on[0].1,
        Lit::Object(vec![
            ("guard".to_owned(), Lit::Name("ready".to_owned())),
            ("target".to_owned(), Lit::Text("on".to_owned())),
        ])
    );
}

#[test]
fn refuses_a_name_a_machine_does_not_define() {
    let refused = machine_module(
        "export const m: Statechart<S, E, C, I, X> = { initial: [{ guard: elsewhere }] }",
    )
    .unwrap_err();
    assert!(
        refused.contains("a name the module does not define"),
        "{refused}"
    );
}

#[test]
fn reads_a_constant_a_headless_source_imports_from_a_module_beside_it() {
    let folder = std::env::temp_dir().join(format!("helix-beside-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    std::fs::write(
        folder.join("api.ts"),
        "import { web } from '../../../render.js'\nexport const props = { label: '', open: web(false) }\n",
    )
    .unwrap();
    let render = "render: () => <View part=\"x\" />";
    let written = |import: &str, key: &str| {
        format!("import {{ {key} }} from '{import}'\nexport default headless('x', {{ {key}, {render} }})")
    };
    let split = headless_tsx_in(&written("./api.js", "props"), &folder);
    let inline = headless_tsx(&format!(
        "export default headless('x', {{ props: {{ label: '', open: web(false) }}, {render} }})"
    ));
    let elsewhere = headless_tsx_in(&written("../api.js", "props"), &folder);
    let missing = headless_tsx_in(&written("./api.js", "events"), &folder);
    let unread = headless_tsx(&written("./api.js", "props"));
    std::fs::remove_dir_all(&folder).unwrap();
    assert_eq!(split.unwrap(), inline.unwrap());
    let elsewhere = elsewhere.unwrap_err();
    assert!(
        elsewhere.contains("imported from a module beside"),
        "{elsewhere}"
    );
    let missing = missing.unwrap_err();
    assert!(
        missing.contains("exports no constant `events`"),
        "{missing}"
    );
    assert!(unread.unwrap_err().contains("a name"));
}

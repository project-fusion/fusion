use super::doc;

fn names(list: &[&str]) -> Vec<String> {
    list.iter().map(|one| (*one).to_owned()).collect()
}

#[test]
fn writes_a_short_doc_on_one_line_and_a_longer_one_as_a_block() {
    assert_eq!(doc("  ", &names(&["Short."])), "  /** Short. */\n");
    assert_eq!(
        doc("", &names(&["One.", "@default 'Tabs'"])),
        "/**\n * One.\n *\n * @default 'Tabs'\n */\n"
    );
    assert_eq!(doc("", &[]), "");
    let long = "word ".repeat(30).trim_end().to_owned();
    let block = doc("", &[long]);
    assert!(
        block.lines().all(|line| line.len() <= 3 + 80),
        "every line fits the measure:\n{block}"
    );
    assert_eq!(block.matches("word").count(), 30, "{block}");
    assert_eq!(
        doc("", &names(&["Ends */ here."])),
        "/** Ends *\\/ here. */\n"
    );
}

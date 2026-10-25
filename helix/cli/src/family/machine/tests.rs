use super::*;

/// A machine's module, with `fns` exported as functions of `(context, input)`.
fn module(fns: &[&str], chart: &str) -> String {
    let mut source = String::new();
    for name in fns {
        /* `name:1` reads the context alone, as a guard of `initial` must. */
        let line = match name.strip_suffix(":1") {
            Some(one) => format!("export const {one} = (context: C): boolean => true\n"),
            None => format!("export const {name} = (context: C, input: I): boolean => true\n"),
        };
        source.push_str(&line);
    }
    source + "export const m: Statechart<S, E, C, I, X> = " + chart
}

fn compiled(fns: &[&str], chart: &str) -> String {
    let read = machine(&module(fns, chart)).unwrap();
    assert_eq!(read.faults(), Vec::<String>::new());
    emit::module(&read)
}

fn faults(fns: &[&str], chart: &str) -> Vec<String> {
    machine(&module(fns, chart)).unwrap().faults()
}

const TOGGLE: &str = "{
  effects: ['say', 'wait'], events: ['FLIP', 'ASK'],
  initial: [{ guard: ready, target: 'on' }, { target: 'off' }],
  states: {
    off: {
      entry: ['say'],
      on: {
        ASK: { accept: { target: 'on' }, ask: ['before-turn', 'turn'], refuse: { update: flip } },
        FLIP: { effects: [{ effect: 'wait', with: { ms: 500 } }], target: 'on', update: flip },
      },
    },
    on: { exit: ['say'], on: { ASK: 'ignore', FLIP: [{ guard: ready, update: flip }, { target: 'off' }] } },
  },
}";

#[test]
fn a_total_closed_reachable_machine_has_no_faults() {
    compiled(&["ready:1", "flip"], TOGGLE);
}

#[test]
fn a_move_runs_the_effects_it_leaves_then_its_own_then_those_it_enters() {
    let module = compiled(&["ready:1", "flip"], TOGGLE);
    assert!(
        module.contains("{ context: flip(context, input), effects: [[EFFECT_WAIT, { ms: 500 }]], state: STATE_ON }"),
        "{module}"
    );
    assert!(
        module.contains("[STATE_OFF]")
            || module.contains(
                "{ context: context, effects: [[EFFECT_SAY], [EFFECT_SAY]], state: STATE_OFF }"
            ),
        "{module}"
    );
}

#[test]
fn a_request_asks_in_order_and_names_both_moves() {
    let module = compiled(&["ready:1", "flip"], TOGGLE);
    assert!(
        module.contains("{ accept: { context: context, effects: [], state: STATE_ON }, ask: [ASK_BEFORE_TURN, ASK_TURN], refuse: { context: flip(context, input), effects: [], state: STATE_OFF } }"),
        "{module}"
    );
    assert!(
        module.contains("export const ASKS = ['before-turn', 'turn'] as const"),
        "{module}"
    );
}

#[test]
fn says_each_rule_a_machine_breaks() {
    assert_eq!(
        faults(
            &["ready"],
            "{
              effects: [], events: ['GO', 'STOP'], initial: [{ guard: ready, target: 'idle' }],
              states: {
                idle: { entry: ['beep'], on: { GO: [{ target: 'run' }, { guard: ready, target: 'idle' }], STOP: { guard: ready } } },
                lost: { on: { GO: 'ignore', STOP: 'ignore' } },
              },
            }"
        ),
        vec![
            "`initial` reads only the context, and a guard there reads an input",
            "`idle` asks for `beep`, which is not an effect the machine lists",
            "a move goes to `run`, which is not a state",
            "the last way in `initial` has a guard, so the machine may start nowhere",
            "`idle` on `GO` has a way after one with no guard, which is never taken",
            "`idle` on `STOP` ends in a guarded way; end it with a way with no guard or with 'ignore'",
        ]
    );
    assert_eq!(
        faults(
            &[],
            "{
              effects: [], events: ['GO'], initial: [{ target: 'idle' }],
              states: { idle: { on: { GO: 'ignore' } }, lost: { on: { GO: 'ignore' } }, quiet: { on: {} } },
            }"
        ),
        vec!["`quiet` does not answer `GO`", "`lost` can never be entered", "`quiet` can never be entered"]
    );
}

#[test]
fn refuses_a_function_named_as_the_module_exports() {
    assert_eq!(
        faults(
            &["step"],
            "{ effects: [], events: ['GO'], initial: [{ target: 'idle' }], states: { idle: { on: { GO: [{ guard: step }, 'ignore'] } } } }"
        ),
        vec!["`step` is a name the compiled module exports itself, so the function needs another"]
    );
}

const NESTED: &str = "{
  effects: ['open', 'close', 'pick'], events: ['TOGGLE', 'NEXT'],
  initial: [{ target: 'closed' }],
  states: {
    closed: { on: { NEXT: 'ignore', TOGGLE: { target: 'open' } } },
    open: {
      entry: ['open'], exit: ['close'], initial: 'first',
      on: { NEXT: { target: 'second' }, TOGGLE: { target: 'closed' } },
      states: {
        first: { entry: ['pick'] },
        second: { on: { NEXT: 'ignore' } },
      },
    },
  },
}";

#[test]
fn a_child_answers_what_it_names_and_its_parent_the_rest() {
    let module = compiled(&[], NESTED);
    assert!(
        module.contains("export const STATES = ['closed', 'first', 'second'] as const"),
        "{module}"
    );
    assert!(
        module.contains("case EVENT_TOGGLE:\n      return { context: context, effects: [[EFFECT_OPEN], [EFFECT_PICK]], state: STATE_FIRST }"),
        "entering a parent runs its entry, then its child's: {module}"
    );
    assert!(
        module.contains("{ context: context, effects: [[EFFECT_CLOSE]], state: STATE_CLOSED }"),
        "leaving runs the parent's exit: {module}"
    );
    assert!(
        module.contains(
            "case EVENT_NEXT:\n      return { context: context, effects: [], state: STATE_SECOND }"
        ),
        "a move between children leaves the parent alone: {module}"
    );
}

const PARALLEL: &str = "{
  effects: ['drawn'], events: ['GLIDED', 'DRAWN', 'GO'],
  initial: [{ target: 'idle' }],
  states: {
    idle: { on: { DRAWN: 'ignore', GLIDED: 'ignore', GO: { target: 'landing' } } },
    landing: {
      done: { target: 'idle' },
      regions: {
        draw: { initial: 'drawing', states: {
          drawing: { on: { DRAWN: { target: 'drawn' }, GLIDED: 'ignore', GO: 'ignore' } },
          drawn: { entry: ['drawn'], final: true, on: { DRAWN: 'ignore', GLIDED: 'ignore', GO: 'ignore' } },
        } },
        glide: { initial: 'gliding', states: {
          gliding: { on: { DRAWN: 'ignore', GLIDED: { target: 'glided' }, GO: 'ignore' } },
          glided: { final: true, on: { DRAWN: 'ignore', GLIDED: 'ignore', GO: 'ignore' } },
        } },
      },
    },
  },
}";

#[test]
fn regions_flatten_into_pairings_and_a_done_parallel_state_leaves() {
    let module = compiled(&[], PARALLEL);
    assert!(
        module.contains("export const STATES = ['idle', 'landing(drawing, gliding)', 'landing(drawing, glided)', 'landing(drawn, gliding)', 'landing(drawn, glided)'] as const"),
        "{module}"
    );
    assert!(
        module.contains(
            "{ context: context, effects: [[EFFECT_DRAWN]], state: STATE_LANDING__DRAWN__GLIDING }"
        ),
        "a region moves alone: {module}"
    );
    assert!(
        module.contains("{ context: context, effects: [], state: STATE_IDLE }"),
        "the last region done takes `done`: {module}"
    );
}

#[test]
fn refuses_two_regions_answering_one_event() {
    let both = PARALLEL.replace(
        "gliding: { on: { DRAWN: 'ignore'",
        "gliding: { on: { DRAWN: { target: 'glided' }",
    );
    assert_eq!(
        faults(&[], &both),
        vec!["`landing` answers `DRAWN` in regions `draw` and `glide`; at most one region answers an event"]
    );
}

#[test]
fn refuses_an_answer_written_on_a_state_with_regions() {
    let answered = PARALLEL.replace(
        "done: { target: 'idle' },",
        "done: { target: 'idle' }, on: { GO: { target: 'idle' } },",
    );
    assert_eq!(
        faults(&[], &answered),
        vec!["`landing` holds regions and answers `GO` itself, which no event reaches; write it in the region that answers it"]
    );
}

#[test]
fn a_deadline_starts_on_entry_ends_on_exit_and_expires_into_its_way() {
    let module = compiled(
        &[],
        "{
          effects: [], events: ['GO'], initial: [{ target: 'idle' }],
          states: {
            idle: { on: { GO: { target: 'waiting' } } },
            waiting: { after: { ms: 500, target: 'idle' }, on: { GO: { target: 'idle' } } },
          },
        }",
    );
    assert!(
        module.contains("export const EFFECTS = ['deadline', 'deadline-end'] as const"),
        "{module}"
    );
    assert!(
        module.contains("{ context: context, effects: [[EFFECT_DEADLINE, { ms: 500, owner: 1 }]], state: STATE_WAITING }"),
        "{module}"
    );
    assert!(
        module.contains("case STATE_WAITING:\n      return owner === 1 ? { context: context, effects: [[EFFECT_DEADLINE_END, { owner: 1 }]], state: STATE_IDLE } : undefined"),
        "{module}"
    );
}

#[test]
fn a_cancel_leaves_every_state() {
    let module = compiled(
        &[],
        "{
          cancel: { target: 'idle' }, effects: ['bye'], events: ['GO'], initial: [{ target: 'idle' }],
          states: {
            busy: { exit: ['bye'], on: { GO: 'ignore' } },
            idle: { on: { GO: { target: 'busy' } } },
          },
        }",
    );
    assert!(
        module.contains("case STATE_BUSY:\n      return { context: context, effects: [[EFFECT_BYE]], state: STATE_IDLE }"),
        "{module}"
    );
}

#[test]
fn states_that_answer_alike_share_one_function() {
    let module = compiled(
        &[],
        "{
          effects: [], events: ['GO', 'TO_C'], initial: [{ target: 'a' }],
          states: {
            a: { on: { GO: { target: 'b' }, TO_C: { target: 'c' } } },
            b: { on: { GO: { target: 'b' }, TO_C: { target: 'c' } } },
            c: { on: { GO: { target: 'b' }, TO_C: { target: 'c' } } },
          },
        }",
    );
    assert!(
        module.contains("/** What `a`, `b`, and `c` do with each event. */\nconst inA ="),
        "{module}"
    );
    assert!(
        module.contains("    case STATE_A:\n    case STATE_B:\n    case STATE_C:\n      return inA(context, event, input)\n"),
        "{module}"
    );
}

#[test]
fn a_machine_that_always_starts_in_one_state_reads_nothing_to_start() {
    let module = compiled(
        &[],
        "{ effects: [], events: ['GO'], initial: [{ target: 'idle' }], states: { idle: { on: { GO: 'ignore' } } } }",
    );
    assert!(
        module.contains("export const start = (_context: C): number =>\n  STATE_IDLE\n"),
        "{module}"
    );
}

#[test]
fn writes_the_same_module_every_time() {
    let read = machine(&module(&["ready:1", "flip"], TOGGLE)).unwrap();
    assert_eq!(emit::module(&read), emit::module(&read));
}

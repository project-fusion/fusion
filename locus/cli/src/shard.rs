//! Which entries a run takes when CI splits it: `--shard <i> --of <n>`.
//!
//! **A function of the entries and their weights, and never of timing.** The
//! same list and the same `n` give the same split on every machine, so a
//! failing shard is reproduced by running it again with the same arguments,
//! and the `n` shards together are the unsharded run exactly. A queue that gave
//! the next entry to whichever job was free would balance better and make a
//! finding depend on which runner was slow.
//!
//! **Packed by weight, and weighed in seconds where a measurement exists.** An
//! entry is not a unit of cost: Fusion's contrast check once split 142, 142,
//! 142 and 141 examples into shards that took 118, 43, 40 and 43 seconds. The
//! heaviest name goes first, each onto the lightest shard so far, ties to the
//! lower index and equal weights in name order.
//!
//! **A name's entries share a shard.** One name in two sources is one thing
//! pictured two ways, and a measurement is taken for the name, so splitting it
//! would weigh each half by the whole.
//!
//! **Counted from 0 on the command line and from 1 in what a run prints**, so
//! no printed line carries a bare 0 that reads as a run that tested nothing.

use std::collections::BTreeMap;

/// `--shard index --of of`, already checked.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Shard {
    pub index: usize,
    pub of: usize,
}

impl Shard {
    /// Refuses an index outside the count and a count of none, because a job
    /// that silently took every entry would pass while its siblings did the
    /// same work, and one that took none would pass having checked nothing.
    ///
    /// # Errors
    ///
    /// Why the pair cannot be a shard.
    pub fn new(index: usize, of: usize) -> Result<Self, String> {
        if of == 0 || index >= of {
            return Err(format!(
                "--shard takes a whole number from 0 to one less than --of, and was given --shard {index} --of {of}"
            ));
        }
        Ok(Self { index, of })
    }

    /// `shard 2 of 5`, counted from 1.
    pub fn label(self) -> String {
        format!("shard {} of {}", self.index + 1, self.of)
    }
}

/// Each name's shard, for `of` shards.
pub fn assign(weights: &BTreeMap<String, f64>, of: usize) -> BTreeMap<String, usize> {
    let mut loads = vec![0.0_f64; of];
    let mut ordered: Vec<(&String, f64)> = weights
        .iter()
        .map(|(name, weight)| (name, *weight))
        .collect();
    ordered.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(b.0)));
    let mut placed = BTreeMap::new();
    for (name, weight) in ordered {
        let mut lightest = 0;
        for at in 1..of {
            if loads[at] < loads[lightest] {
                lightest = at;
            }
        }
        loads[lightest] += weight;
        placed.insert(name.clone(), lightest);
    }
    placed
}

#[cfg(test)]
mod tests {
    use super::*;

    fn weights(pairs: &[(&str, f64)]) -> BTreeMap<String, f64> {
        pairs
            .iter()
            .map(|(name, weight)| ((*name).to_string(), *weight))
            .collect()
    }

    #[test]
    fn malformed_arguments_are_refused() {
        assert!(Shard::new(0, 0).is_err());
        assert!(Shard::new(3, 3).is_err());
        assert_eq!(Shard::new(2, 3).unwrap().label(), "shard 3 of 3");
    }

    #[test]
    fn the_heaviest_go_first_onto_the_lightest_shard() {
        let placed = assign(
            &weights(&[("a", 1.0), ("b", 5.0), ("c", 3.0), ("d", 3.0)]),
            2,
        );
        /* b to 0; c to 1; d to 1 (3 < 5); a to 0 (5 < 6). */
        assert_eq!(placed["b"], 0);
        assert_eq!(placed["c"], 1);
        assert_eq!(placed["d"], 1);
        assert_eq!(placed["a"], 0);
    }

    /// The same packing `@fusion.dev/scripts/shard` does, so the two agree on a
    /// corpus measured once: equal weights fall in name order.
    #[test]
    fn equal_weights_deal_out_in_name_order() {
        let placed = assign(&weights(&[("c", 1.0), ("a", 1.0), ("b", 1.0)]), 3);
        assert_eq!((placed["a"], placed["b"], placed["c"]), (0, 1, 2));
    }

    #[test]
    fn every_name_lands_in_exactly_one_shard() {
        let many: BTreeMap<String, f64> = (0..50)
            .map(|n| (format!("n{n}"), f64::from(n % 7)))
            .collect();
        let placed = assign(&many, 6);
        assert_eq!(placed.len(), 50);
        assert!(placed.values().all(|shard| *shard < 6));
    }
}

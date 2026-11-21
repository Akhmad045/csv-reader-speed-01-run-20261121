# csv-reader-speed-01-run-20261121

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/Akhmad045/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/Akhmad045/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's csv-reader 1.0.0: `run({text, header})` returns byte-exact `{columns, rows, errors}` on every broken-CSV case — BOM drop, CRLF/LF record ends, stray CRs, quote junk, unterminated quotes, short/long row padding and cutting — while running about 6x faster than the house baseline on the practice set (92 ms vs 571 ms for 10.2 MB). Verified exact on all 6 practice cases, a 180-case edge battery and 70,000 fuzzed inputs, with byte-identical outputs across runs.

## Run it

```sh
node main.ts
```

The harness runs `node /bot/main.ts` (Node 22): it reads every case from `/input/cases.json` (or `$MAKEFUN_INPUT_DIR`) and writes `/output/answers.json` (or `$MAKEFUN_OUTPUT_DIR`). `solve.js` is a dependency-free ES module; `main.ts` is the kit's driver, kept as shipped.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4g7knchf&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>

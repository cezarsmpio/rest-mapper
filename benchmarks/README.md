# Benchmarks

These benchmarks use Node's native [`node:bench`](https://nodejs.org/api/bench.html) runner.

Requirements:

- Node.js 26+
- A fresh build of `dist/`

Run:

```bash
npm run bench
```

Write structured JSON results:

```bash
npm run bench:json
# benchmarks/latest.json
```

See `baseline.txt` for the pre-optimization results and `RESULTS.md` for the before/after comparison. Compare median rates rather than single samples; benchmarks are affected by CPU frequency, GC, and system load.

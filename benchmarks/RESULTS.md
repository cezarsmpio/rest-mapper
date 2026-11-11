# Benchmark results

Measured with Node 26's native `node:bench` runner:

```bash
npm run bench
# 50 samples, 20 warmup samples
```

Median throughput before and after optimization:

| Case | Baseline | Optimized | Change |
|---|---:|---:|---:|
| resources + CRUD | 238.37k ops/s | **260.16k ops/s** | **+9%** |
| path params | 133.04k ops/s | **258.09k ops/s** | **+94%** |
| path params + query | 98.99k ops/s | **248.63k ops/s** | **+151%** |
| nested query merge | 109.71k ops/s | **274.77k ops/s** | **+150%** |
| CRUD get | 117.92k ops/s | **242.46k ops/s** | **+106%** |
| request + response interceptors | 111.93k ops/s | **248.97k ops/s** | **+122%** |
| fetch JSON response | 212.56k ops/s | **280.22k ops/s** | **+32%** |
| fetch mapper path + query | 71.03k ops/s | **97.94k ops/s** | **+38%** |

Optimizations:

- Cache the stable defaults/resource merge per request method.
- Avoid interceptor calls when no interceptor is configured.
- Use allocation-light iteration in the deep merge and header normalization paths.
- Add fast paths for empty query strings and URLs without placeholders.
- Avoid per-request header and no-body allocations in the fetch transport.

The full suite is intentionally noisy because it benchmarks small in-process
operations. Use median rates and repeat runs when comparing local changes.

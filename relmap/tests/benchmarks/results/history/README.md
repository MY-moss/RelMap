# Benchmark History

This directory stores historical benchmark results for trend analysis.

## File naming

- Results are exported as `benchmark-{timestamp}.json` from `tests/benchmarks/run-benchmarks.ts`.
- Compare script (`npx tsx tests/benchmarks/compare-benchmarks.ts`) reads the two most recent files.

## Viewing history

```bash
# Run a fresh benchmark
npx tsx tests/benchmarks/run-benchmarks.ts

# Compare against previous baseline
npx tsx tests/benchmarks/compare-benchmarks.ts
```

## Thresholds (from quality engineering plan)

| Metric | Threshold |
|--------|-----------|
| DB query (1000 rows) | < 10ms |
| Search (5000 entities) | < 50ms |
| Graph layout (500 nodes) | < 2s |
| Cold start | < 3s |
| Idle memory | < 80MB |
| Bundle size | < 5MB (warning) |

# Benchmarking Guide

This directory contains benchmarks for performance-critical modules.

## Running Benchmarks

Use Vitest's built-in `bench` API for microbenchmarks:

```bash
npx vitest bench --config tests/vitest.config.ts
```

## Writing Benchmarks

Create `*.bench.ts` files alongside unit tests. Example:

```ts
import { bench, describe } from 'vitest'
import { levenshteinDistance } from '../../src/main/ai/duplicate_detect'

describe('levenshteinDistance', () => {
  bench('short strings', () => {
    levenshteinDistance('kitten', 'sitting')
  })

  bench('long strings', () => {
    levenshteinDistance('a'.repeat(1000), 'b'.repeat(1000))
  })
})
```

## Key Modules to Benchmark

- **duplicate_detect**: Levenshtein distance on large datasets
- **text_analysis**: N-gram extraction on long diary entries
- **smart_grouping**: Louvain community detection on large graphs

## Guidelines

- Run benchmarks on a quiet machine for consistent results
- Use warm-up iterations before measuring
- Compare against baseline after making changes
- Document environment (CPU, RAM, Node version) in results

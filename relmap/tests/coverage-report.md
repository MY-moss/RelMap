# Coverage Report

Date: 2026-07-15

## Current Coverage

- Lines: 3.86%
- Functions: 1.61%
- Branches: 3.75%
- Statements: 4.18%

> **Note:** Overall coverage is low because the project includes a large amount of Electron/React (UI) code that is not yet covered by Node-based unit tests. The `src/main/ai` module is the primary focus of current testing.

## AI Module Breakdown

| Module | Lines | Functions | Branches | Notes |
|--------|-------|-----------|----------|-------|
| text_analysis | 96.47% | 100% | 86.15% | Excellent coverage via tests/unit/text-analysis.test.ts |
| intimacy | 38.29% | 50% | 47.61% | Pure functions (`scoreFrequency`, `scoreRecency`) fully covered; `calculateIntimacy` needs DB |
| duplicate_detect | 36.70% | 33.33% | 26.31% | `levenshteinDistance` & `stringSimilarity` covered; `detectDuplicates` needs DB |
| bridge_detector | 26.02% | 22.22% | 14.58% | `buildAdjacencyList` & `bfsShortestPaths` covered; `detectBridges` needs DB |
| face | 0% | 0% | 0% | Requires face-api.js + canvas runtime |
| intimacy_prediction | 0% | 0% | 0% | Requires DB |
| lost_contact | 0% | 0% | 0% | Requires DB |
| ocr | 0% | 0% | 0% | Requires tesseract.js runtime |
| personality_profile | 0% | 0% | 0% | Requires DB |
| smart_grouping | 0% | 0% | 0% | Algorithm tested via reimplementation in smart-grouping.test.ts |
| suggestion_engine | 0% | 0% | 0% | Rules tested via reimplementation in suggestion-engine.test.ts |

## Test Summary

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/unit/text-analysis.test.ts | 15 | ✅ All pass |
| tests/unit/duplicate-detect.test.ts | 16 | ✅ All pass |
| tests/unit/smart-grouping.test.ts | 5 | ✅ All pass |
| tests/unit/intimacy.test.ts | 11 | ✅ All pass |
| tests/unit/suggestion-engine.test.ts | 9 | ✅ All pass |
| tests/unit/bridge-detector.test.ts | 14 | ✅ All pass |
| **Total Unit Tests** | **70** | **✅ All pass** |
| tests/smoke/smoke-test.ts | 59 assertions | ✅ All pass |

## Next Steps

1. **Increase coverage for DB-dependent modules**: Mock `better-sqlite3` or use an in-memory SQLite to test `calculateIntimacy`, `detectDuplicates`, `detectBridges`, and `generateSuggestions`.
2. **Add tests for `lost_contact.ts`**, `intimacy_prediction.ts`, `personality_profile.ts`, and `smart_grouping.ts` (the DB-dependent functions within them).
3. **Add UI component tests** with `@testing-library/react` for the React components in `src/components/` and `src/pages/`.
4. **Setup file for vitest** to auto-mock `electron` and `better-sqlite3` for all tests importing from `src/main/`.
5. **Add end-to-end tests** using Playwright or similar for the full Electron app.
6. **Raise thresholds** as coverage improves over time.

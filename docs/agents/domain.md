# Domain Docs

How engineering skills should consume this repository's domain documentation.

## Before exploring, read these

- `CONTEXT.md` at the repository root.
- `docs/adr/` for ADRs related to the area being explored.

If a file does not exist, proceed silently. Do not flag its absence or suggest creating it upfront. The domain-modeling skill creates domain documentation lazily when terms or decisions are resolved.

## File structure

This is a single-context repository:

```
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary vocabulary

When naming a domain concept in an issue, hypothesis, test, or refactor proposal, use the term defined in `CONTEXT.md`. Do not use synonyms explicitly avoided by the glossary.

If a required concept is missing from the glossary, note the gap for domain-modeling.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.

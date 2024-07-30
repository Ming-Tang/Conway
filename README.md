# conway

Conway normal form of surreal numbers and their arithmetic.

# Summary

## Creation

```typescript
Conway.zero // 0
Conway.one // 1
Conway.unit // omega
Conway.real(r) // real number value
Conway.mono(coeff, exponent) // coeff * omega^exponent
new Conway([[p1, c1], [p2, c2], [p3, c3]]); // from power and coefficient array
```

## Operations

- Comparison: `eq, ne, gt, ge, lt, le`
- Addition, subtraction and multiplication: `add, sub, mul`
- Long division: `divRem, divRemIters`
- Ordinal add: `isOrdinal, ordinalAdd, ordinalRightSub`
- Surreal birthday: `birthday`

# Install

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

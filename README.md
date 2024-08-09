# conway

Library for representing surreal numbers in Conway normal form.

Also includes functionalities for dealing with ordinal numbers and transfinite sequences.

# Summary

## Types

### Surreal number: `Conway`

Represents a surreal number that can be expressed in terms of a finite expression
in Conway normal form.

Internally the sum is represented as an array of `[exponent, coefficient]` pairs
sorted by the exponent descending with zero coefficients discarded.

The exponent is either a real number (if possible) or a `Conway` (if it must
be represented as an expression).

The real coefficients can be `number` or `bigint`.

The upper limit of this representation is epsilon_0 (`e0 = w^e0`) and the lower
limit is its negation.

The upper limit of the birthday is the ordinal epsilon_0.

### Ordinal number: `Conway`

The `Conway` class is re-used for representing ordinal numbers in Cantor normal form.

The `isOrdinal` property determines if a particular value is an ordinal number,
and there are ordinal arithmetic operations as well.

### Transfinite sequence: `Seq`

A transfinite sequence is a sequence indexed by an ordinal number.

The `length` property determines the order type of the sequence.

```typescript
type Ord = Conway & { isOrdinal: true };

interface Seq<T> {
    length: Ord;
    index(index: Ord): T;
}
```

Example of transfinite sequences:

```typescript
import {...} from "seq";

// order type w, [1, 2, 3, 1, 2, 3, 1, 2, 3, ...]
cycleArray([1, 2, 3]);

// order type w + 2, [ 2, 3, 4, 2, 3, 4, ... | 0, 1 ]
const c2 = concat(cycleArray([2, 3, 4]), fromArray([0, 1]));

c2.index(unit.add(1)); // c2[w + 1] = 1
```

## API Design

### Class method

```typescript
// num1 : Conway
num1.add(num2).mult(num3)
```

`num1` must be `Conway` and if `num1` could be a real number, `Conway.ensure` is required
to wrap it.

### Static method

Unlike class methods, the arguments can be real numbers or `Conway` and return real numbers if possible.

```typescript
// num1 : Real | Conway
Conway.mult(Conway.add(num1, num2))
```

### Module exports

Similar to static method, without the `Conway.` prefix.

```typescript
import { ... } from "...";
// num1 : Real | Conway
mult(add(num1, num2))
```

Similar to static method

## Creation

```typescript
import { ... } from "op"
zero // 0
one // 1
unit // w (omega)
real(r) // real number value
mono(coeff, exponent) // coeff * w^exponent
new Conway([[p1, c1], [p2, c2], [p3, c3]]); // from a list of (power, coeff)
```

## Operations

- Comparison: `eq, ne, gt, ge, lt, le`
- Surreal arithmetic: `add, sub, mul`
- Surreal exponential: `exp, log`
- Long division: `divRem, divRemIters`
- Surreal birthday: `birthday`
- Ordinal numbers: `isOrdinal, ordinalAdd, ordinalRightSub, ordinalDivRem`

# Install

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

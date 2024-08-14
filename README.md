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

### Creation

Applies to both surreal numbers and ordinal numbers.

| Operation | Code | Description |
|--|--|--|
| $0$ | `zero` | Zero |
| $1$ | `one` | One |
| $\omega$ | `unit` | Omega |
| $\sum_i \omega^{p_i} c_i$ | `create([[p0, c0], ...])` or `new Conway(...)` | Construct from Conway/Cantor normal form given an array or `Iterable` of `[power, coefficient]` tuples.
| $\omega^p$ | `mono1(p)` | Monomial (given coefficient of 1 and power `p`) |
| $\omega^p c$ | `mono(c, p)` | Monomial (given coefficient `c` and power `p`) |
| N/A | `ensure(r)` | Given a real number, convert it to `Conway`, otherwise return the value itself.
| N/A | `fromReal(r)` | Given a real number, construct a `Conway` representing it.

### Comparison

Let `a, b` be ordinal numbers or surreal numbers.

| Operation | Code | Description |
|--|--|--|
| $a = b$ | `eq(a, b)` | Equals |
| $a \ne b$ | `ne(a, b)` | Not equals |
| $a > b$ | `gt(a, b)` | Greater than |
| $a \ge b$ | `ge(a, b)` | Greater than or equals |
| $a < b$ | `lt(a, b)` | Less than |
| $a \le b$ | `le(a, b)` | Less than or equals |
| N/A | `compare(a, b)` | [`Array#sort`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#description) comparator |

### Conway/Cantor normal form

Let `a` be a surreal number or ordinal number.

| Code | Description |
|--|--|
| `Conway` | The type for Conway/Cantor normal forms.
| `a.length` | Number of terms |
| `a.getByIndex(i)` | Get the `[power, coefficient]` tuple by index `i` |
| `a.has(p)` | Has non-zero term for power `p`? |
| `a.get(p)` | Get coefficient (or zero) for power `p` |
| `[...a]`, [`a[Symbol.iterator]`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterable_protocol) | Iterate the `[power, coefficient]` tuples in descending order bypower |
| `+a`, [`a[Symbol.toPrimitive]("number")`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive) | Convert the value to a `number`. If the value is infinite `+Infinity` or `-Infinity` is returned
| `a.toString()` | Return a readable representation for the term |
| `a.toJson()` | Return a JSON structure for the term |

### Surreal number operations

Let `a, b` be surreal numbers.

| Operation | Code | Description |
|--|--|--|
| $a + b$ | `add(a, b)` | Addition |
| $a - b$ | `sub(a, b)` | Subtraction |
| $a * b$ | `mult(a, b)` | Multiplication |
| $a / b$ | `divRem(a, b)` | Surreal long division (returns quotient, remainder tuple) |
| $a / b$ | `divRemIters(a, b, n)` | Repeat surreal long division by `n` times and returns (quotient, remainder) |
| $-a$ | `neg(a)` | Negation |
| $a ^ b$ | `pow(a, b)` | Exponentiation |
| $\exp(a)$ | `exp(a)` | Exponential |
| $\log(a)$ | `log(a, n)` | Logarithm (to the first `n` terms if infinite sum is needed) |

### Surreal number properties

Let `a = inf + r + low` be a surreal number that can be decomposed into a sum of
 - purely infinite value `inf`
 - real value `r`
 - and purely infinitesimal value `low`

| Operation | Code | Description |
|--|--|--|
| $b(a)$ | `birthday(a)` | Birthday of a surreal number (returns an ordinal number) |
| `inf` | `a.infinitePart` | Purely infinite part, or zero
| `r` | `a.realPart` | Real part, or zero
| `low` | `a.infinitesimalPart` | Purely infinitesimal part, or zero
| N/A | `a.realValue` | If `a` is purely real (`inf = low = 0`), its real part. Otherwise, `null`
| $r > 0$ | `isPositive(a)` | Is `a` positive? |
| $r < 0$ | `isNegative(a)` | Is `a` negative? |
| $r = 0$ | `isZero(a)` | `a` equals zero? |
| $r = 1$ | `isOne(a)` | `a` equals one? |
| $r = \omega$ | `isUnit(a)` | `a` equals omega? |
| $r > \mathbb{R}$ | `isAboveReals(a)` | Is `a` infinite (or `inf` is positive)?
| $r < -\mathbb{R}$ | `isBelowNegativeReals(a)` | Is `-a` infinite (or `inf` is negative)?
| $a \in \text{Ord}$ | `isOrdinal(a)` | `a` represents an ordinal number? |

### Ordinal number operations

Let `a, b` be ordinal numbers.

| Operation | Code | Description |
|--|--|--|
| $a + b$ | `ordinalAdd(a, b)` | [Ordinal addition](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Addition) |
| $a - b$ | `ordinalRightSub(b, a)` | Ordinal right subtraction (solution to `a + ? = b`) |
| $a \times b$ | `ordinalMult(a, b)` | [Ordinal multiplication](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Multiplication) |
| $a / b$ | `ordinalDivRem(b, a)` | Ordinal division and remainder (solution to `b . quotient + remainder`) |
| $a^b$ | `ordinalPow(a, b)` | [Ordinal exponentiation](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Exponentiation) |
| $a\oplus b$ | `add(a, b)` | [Natural sum](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Natural_operations) (implemented as surreal sum) |
| $a \otimes b$ | `mult(a, b)` | [Natural product](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Natural_operations) (implemented as surreal product) |

# Install

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

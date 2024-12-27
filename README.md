# Conway

`conway` is a TypeScript library for working with surreal numbers
in Conway normal form and transfinite sequences.

# Summary

## Overview of features

- Dyadic rationals
  - Arbitrary precision based on `bigint`
  - Equality and comparison
  - Addition, subtraction, multiplication
  - Converting from/to JavaScript `number`
- Surreal numbers in Conway normal form
  - Equality and comparison
  - To JSON, string and LaTeX
  - Addition, subtraction, mulitplication
  - Long division (quotient and remainder)
  - Birthday
  - Converting from/to sign expansions
- Ordinal numbers in Cantor normal form
  - Ordinal addition and multiplication
  - Natural addition and multiplication
  - Right subtraction
  - Long division (quotient and remainder)
- Transfinite sequences
  - Indexing and length in ordinal numbers
  - Cycle array or transfinite sequence
  - Concatenate two sequences together
  - Cartesian product

## Types

### Dyadic rational number: `Dyadic`

Represents an arbitrary-precision
[dyadic rational number](https://en.wikipedia.org/wiki/Dyadic_rational),
which is a rational number with a `bigint` the numerator and a power of 2 (positive `bigint`) as the denominator.

### Surreal number: `Conway`

Represents a surreal number that can be expressed in terms of a finite expression
in Conway normal form.

Internally, the value is represented as an array of `[exponent, coefficient]`
pairs sorted by the exponent descending with zero coefficients discarded.

The exponent is either a real number (if possible) or a `Conway` (if it must
be represented as an expression).


#### Limits

The real coefficients must be representable as a dyadic rational (in other words,
finite birthday).

The number of terms in each Conway normal form must be finite.

### Ordinal number: `Ord`

The `Conway` class is re-used for representing ordinal numbers in Cantor normal form.

The `isOrdinal` property determines if a particular value is an ordinal number,
and there are ordinal arithmetic operations as well. It also appears in the
first generic parameter of `Conway`.

#### Type-safe tracking of `isOrdinal`

The first type parameter of `Conway` keeps track of a value is definitely an ordinal
number of not. `Conway<true>` indicates the values of the type are definitely
ordinal numbers, while `Conway` or `Conway<boolean>` does not care if the values
are ordinal numbers or not.

The type alias `Ord` is defined to be `Conway`, while `Ord0 = Real | Ord`. Most
functions that reference to ordinal numbers use these type aliases.

Some functions overload based on the `isOrdinal` property of the arguments to
determine if the return type is ordinal or not.

These functions are: `mono, mono1, ensure, add, mult`

```typescript
// positive bigints are inferred to be Ord0
mult(one, mono1(4n)) // mult(Ord0, Ord0): Ord0
add(one, 3n) // add(Ord0, Ord0): Ord0
```

### Transfinite sequence: `Seq`

A transfinite sequence is a sequence indexed by an ordinal number.
The index cannot be unwrapped in `Seq`-related APIs.

The `length` property determines the order type of the sequence.

```typescript
interface Seq<T> {
    length: Ord;
    index(index: Ord): T;
}
```

#### Constant sequences: `isConstant`

If all elements of a `Seq<T>` equals to the first element, the implementations
of `Seq<T>` can set the field `isConstant = true`. Some sequence functions will
take `isConstant` into account simplified the sequences generated.

If the `Seq<T>` has length zero or one, `isConstant` should be `true`.

#### Examples of transfinite sequences

```typescript
import { ... } from "conway/seq";

// order type w, [1, 2, 3, 1, 2, 3, 1, 2, 3, ...]
cycleArray([1, 2, 3]);

// order type w + 2, [ 2, 3, 4, 2, 3, 4, ... | 0, 1 ]
const c2 = concat(cycleArray([2, 3, 4]), fromArray([0, 1]));
c2.index(unit.add(1)); // c2[w + 1] = 1

// Natural numbers reordered with odd numbers before even numbers
// order type w.2, [ 0, 2, 4, 6, ... | 1, 3, 5, 7, ... ]
concat(mapNatural((i) => i * 2), mapNatural((i) => i * 2 + 1));
```

## API Design

### Immutability

`Conway` and `Dyadic` are immutable and all functions that act on them
return existing or new references.

### Real numbers

A real number in this library is a type alias:
```typescript
type Real = number | bigint | Dyadic
```

This type is used by `Conway` to represent the coefficients.

To avoid the loss of precision, use `bigint` or `Dyadic`.

### Unwrapped vs. wrapped

Many surreal and ordinal operations take either a real number or
a `Conway` as an input or output, allowing the caller to avoid
wrapping finite values using `fromReal` or `ensure` and the function
can return an unwrapped real number if possible.

The type alias `Conway0` and `Ord0` correspond to either a value in
either wrapped or unwrapped form.

The exponents in the array of tuple representations of Conway/Cantor
normal forms area always unwrapped reals if possible.

The `maybeUnwrap` function takes a `Conway` and returns an
unwrapped `Real` if possible, otherwise the argument itself is
returned.

```typescript
type Conway = ...;
type Conway0 = Conway | Real;

type Ord = ...;
type Ord0 = Ord | Real;
```

### Equality and hashing

`Conway` and `Dyadic` are reference types with their own equality
functions `eq` and `dyadicEq`.

The `eqHash` field provides the hash code for equality.

If `x.eqHash !== y.eqHash`, then `!eq(x, y)`.

### Comparison and ordering

The `ordHash` field of `Conway` provides an order-preserving hash
code in `bigint`.

If `x.ordHash < y.ordHash`, then `lt(x, y)`.

### Class method

Additional class methods of `Conway` can be added by importing the `op/methods/ord` module for ordinal operations and and `op/methods/arith` for arithmetic operations.
These operations will always return wrapped `Conway` objects, unlike regular functions.

- `import "conway/op/methods/ord"`
  - `x.ordinalDivRem(y)`
  - `x.ordinalPow(y)`
  - `x.ordinalRightSub(y)`
  - `x.ordinalAdd(y)`
  - `x.ordinalMult(y)`
- `import "conway/op/methods/arith`
  - `x.neg()`
  - `x.add(y)`
  - `x.sub(y)`
  - `x.mult(y)`
 
### Sign expansions

Sign expansions are represented as a finite list (array or iterable) of entries. Each entry `Entry` is a plus or minus repeated an ordinal number times.

```
interface Entry {
  sign: boolean; // true for +, false for -
  length: Ord0;
}
```

The `SignExpansionReader` interface is used to iterate through a sign expansion, and an instance can be created from the `makeReader` function.

## Creation

```typescript
import { ... } from "conway/op"

zero // 0
one // 1
unit // w (omega)
real(r) // real number value
mono(coeff, exponent) // w^exponent . coeff
mono1(exponent) // w^exponent
create([[p1, c1], [p2, c2], [p3, c3]]); // from a list of [power, coeff] tuples
```

`zero`, `one` and `unit` are typed as `Ord` and this can cause type errors for an
mutable variable intended not to be ordinals. In that case, specify the type
for the variable explicitly.

```typescript
let sum: Conway = zero;
for (...) {
    const d: Conway = ...;
    sum = add(sum, d);
}
```

## Operations

### Creation

Applies to both surreal numbers and ordinal numbers.

| Operation | Code | Description |
|--|--|--|
| $0$ | `zero` | Zero |
| $1$ | `one` | One |
| $\omega$ | `unit` | Omega |
| $\sum_i \omega^{p_i} c_i$ | `create([[p0, c0], ...])` | Construct from Conway/Cantor normal form given an array or `Iterable` of `[power, coefficient]` tuples.
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
| $a \times b$ | `mult(a, b)` | Multiplication |
| $a / b$ | `divRem(a, b)` | Surreal long division (returns quotient, remainder tuple) |
| $a / b$ | `divRemIters(a, b, n)` | Repeat surreal long division by `n` times and returns (quotient, remainder) |
| $-a$ | `neg(a)` | Negation |
| $a ^ b$ | `pow(a, b)` | Exponentiation |
| $\exp(a)$ | `exp(a)` | Exponential |
| $\log(a)$ | `log(a, n)` | Logarithm (to the first `n` terms if infinite sum is needed) |

### Surreal number properties

Let `a = inf + r + low` be a surreal number that can be decomposed into a sum of
 - purely infinite value `inf` $\ \in \mathbb{J}$
 - real value `r` $\ \in \mathbb{R}$
 - and purely infinitesimal value `low` $\ \in \mathbf{No}^\prec$

| Operation | Code | Description |
|--|--|--|
| $b(a)$ | `birthday(a)` | Birthday of a surreal number (returns an ordinal number) |
| `inf` | `a.infinitePart` | Purely infinite part, or zero
| `r` | `a.realPart` | Real part, or zero
| `low` | `a.infinitesimalPart` | Purely infinitesimal part, or zero
| N/A | `a.realValue` | If `a` is purely real (`inf = low = 0`), its real part. Otherwise, `null`
| $a > 0$ | `isPositive(a)` | Is `a` positive? |
| $a < 0$ | `isNegative(a)` | Is `a` negative? |
| $a = 0$ | `isZero(a)` | `a` equals zero? |
| $a = 1$ | `isOne(a)` | `a` equals one? |
| $a = \omega$ | `isUnit(a)` | `a` equals omega? |
| $a > \mathbb{R}$ | `isAboveReals(a)` | Is `a` infinite (or `inf` is positive)?
| $a < -\mathbb{R}$ | `isBelowNegativeReals(a)` | Is `-a` infinite (or `inf` is negative)?
| $a \in \text{Ord}$ | `isOrdinal(a)` | `a` represents an ordinal number? |

### Ordinal number operations

Let `a, b` be ordinal numbers.

| Operation | Code | Description |
|--|--|--|
| $a + b$ | `ordinalAdd(a, b)` | [Ordinal addition](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Addition) |
| $a - b$ | `ordinalRightSub(b, a)` | Ordinal right subtraction (solution to $a + ? = b$) |
| $a \times b$ | `ordinalMult(a, b)` | [Ordinal multiplication](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Multiplication) |
| $a / b$ | `ordinalDivRem(b, a)` | Ordinal division and remainder (returns `[q, r]` where $a = b q + r$ and $q$ is maximized) |
| $a^b$ | `ordinalPow(a, b)` | [Ordinal exponentiation](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Exponentiation) |
| $a\oplus b$ | `add(a, b)` | [Natural sum](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Natural_operations) (implemented as surreal sum) |
| $a \otimes b$ | `mult(a, b)` | [Natural product](https://en.wikipedia.org/wiki/Ordinal_arithmetic#Natural_operations) (implemented as surreal product) |

# Install

To install dependencies:

```bash
bun install
```

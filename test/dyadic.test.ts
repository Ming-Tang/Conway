import fc from "fast-check";
import {
	dyadicEq,
	dyadicFromBigint,
	dyadicFromNumber,
	dyadicMult,
	dyadicToMixed,
} from "../dyadic";
import {
	propCommAssoc,
	propDist,
	propIdentity,
	propTotalOrder,
	propZero,
} from "./propsTest";
import {
	birthday,
	lca,
	minus,
	plus,
	signExpansionFrac,
	toMixed,
} from "../dyadic/birthday";
import {
	abs,
	add,
	half,
	isSafeNumber,
	neg,
	negOne,
	one,
	sub,
	zero,
} from "../dyadic/arith";
import { compare, eq, ge, le, lt, gt } from "../dyadic/comp";
import { dyadicNew } from "../dyadic/class";

fc.configureGlobal({ numRuns: 2000, verbose: false });

const arbBigint = fc.bigInt({ min: -1n << 32n, max: 1n << 32n });

const arbDyadic = fc
	.tuple(arbBigint, fc.bigInt({ min: -(1n << 8n), max: 1n << 8n }))
	.map(([x, y]) => dyadicNew(x, y));

const arbNumber = fc.float({
	noDefaultInfinity: true,
	noNaN: true,
	min: -1e4,
	max: -1e4,
});

describe("constructor", () => {
	it("if numerator is zero, power is zero", () => {
		fc.assert(fc.property(fc.bigInt(), (x) => dyadicNew(0n, x).power === 0n));
	});

	it("power is never negative", () => {
		fc.assert(fc.property(arbDyadic, (x) => x.power >= 0n));
	});
});

describe("fromBigint", () => {
	it("equal to bigintQuotient", () => {
		fc.assert(
			fc.property(fc.bigInt(), (n) => dyadicFromBigint(n).bigintQuotient === n),
		);
	});

	it("equal in toString forms", () => {
		fc.assert(
			fc.property(
				fc.bigInt(),
				(n) => dyadicFromBigint(n).toString() === n.toString(),
			),
		);
	});
});

describe("fromNumber", () => {
	it("equal to quotient", () => {
		fc.assert(
			fc.property(arbNumber, (x) => {
				expect(dyadicFromNumber(x).quotient).toBeCloseTo(x);
			}),
		);
	});

	it("equivalence: dyadicEq(dyadicNew(p, q), dyadicNew(p << r, q + r))", () => {
		fc.assert(
			fc.property(
				fc.bigInt(),
				fc.bigInt({ min: 0n, max: 512n }),
				fc.bigInt({ min: 0n, max: 16n }),
				(p, q, r) => dyadicEq(dyadicNew(p, q), dyadicNew(p << r, q + r)),
			),
		);
	});
});

describe("dyadicNew interning", () => {
	it("dyadicNew returns interned value within range (-128, 128), (0, 4)", () => {
		fc.assert(
			fc.property(
				fc.bigInt({ min: -128n, max: 128n }),
				fc.bigInt({ min: 0n, max: 4n }),
				// biome-ignore lint/suspicious/noSelfCompare: ensure reference equality
				(p, q) => dyadicNew(p, q) === dyadicNew(p, q),
			),
		);
	});
});

describe("ordering", () => {
	propTotalOrder(it, arbDyadic, compare, eq);
});

describe("add", () => {
	propIdentity(it, arbDyadic, zero, add, eq);
	propCommAssoc(it, arbDyadic, add, eq);
});

describe("sub", () => {
	it("a - 0 = a", () => {
		fc.assert(
			fc.property(arbDyadic, (a) => {
				expect(sub(a, zero)).toEqual(a);
			}),
		);
	});
	it("0 - a = -a", () => {
		fc.assert(
			fc.property(arbDyadic, (a) => {
				expect(sub(zero, a)).toEqual(neg(a));
			}),
		);
	});

	it("a + (-b) = a - b", () => {
		fc.assert(
			fc.property(arbDyadic, arbDyadic, (a, b) => {
				expect(sub(a, b)).toEqual(add(a, neg(b)));
			}),
		);
	});
});

describe("mult", () => {
	propZero(it, arbDyadic, zero, dyadicMult, eq);
	propIdentity(it, arbDyadic, one, dyadicMult, eq);
	propCommAssoc(it, arbDyadic, dyadicMult, eq);
	propDist(it, arbDyadic, add, dyadicMult, eq);
});

describe("toMixed", () => {
	it("add back", () => {
		fc.assert(
			fc.property(arbDyadic, (x) => {
				const [n, q] = dyadicToMixed(x);
				expect(add(dyadicFromBigint(n), q)).toEqual(x);
			}),
		);
	});

	it("fractional part of integer is zero", () => {
		fc.assert(
			fc.property(arbBigint, (x) => {
				const [n, q] = dyadicToMixed(dyadicFromBigint(x));
				expect(q.isZero).toBe(true);
				expect(n).toBe(x);
			}),
		);
	});

	it("integer value has zero fractional part", () => {
		fc.assert(
			fc.property(arbBigint, (n) => {
				const [m, q] = dyadicToMixed(dyadicFromBigint(n));
				return q.isZero && m === n;
			}),
		);
	});

	it("same sign", () => {
		fc.assert(
			fc.property(arbDyadic, (x) => {
				const [n, q] = dyadicToMixed(x);
				if (x.isPositive) {
					expect(n >= 0).toBe(true);
					expect(q.isNegative).toBe(false);
				} else {
					expect(n <= 0).toBe(true);
					expect(q.isPositive).toBe(false);
				}
			}),
		);
	});

	it("abs of fractional part is between 0 and 1", () => {
		fc.assert(
			fc.property(arbDyadic, (x) => {
				const [, q] = dyadicToMixed(x);
				const aq = abs(q);
				expect(ge(aq, zero)).toBe(true);
				expect(le(aq, one)).toBe(true);
			}),
		);
	});
});

describe("birthday", () => {
	it("constants", () => {
		expect(birthday(zero)).toBe(0n);
		expect(birthday(one)).toBe(1n);
		expect(birthday(dyadicFromBigint(2n))).toBe(2n);
		expect(birthday(half)).toBe(2n);
		expect(birthday(add(one, half))).toBe(3n);
		expect(birthday(neg(one))).toBe(1n);
	});

	it("birthday(-x) = birthday(x)", () => {
		fc.assert(fc.property(arbDyadic, (x) => birthday(x) === birthday(neg(x))));
	});

	it("birthday(1/2^n) = n + 1 for integer n >= 0", () => {
		fc.assert(
			fc.property(
				arbBigint.filter((n) => n >= 0n),
				(n) => expect(birthday(dyadicNew(1n, n))).toBe(n + 1n),
			),
		);
	});

	it("birthday(1/2^(n + 1)) = birthday(1/2^n) + 1 for integer n > 0", () => {
		fc.assert(
			fc.property(
				arbBigint.filter((n) => n > 0n),
				(n) =>
					birthday(dyadicNew(1n, n + 1n)) === birthday(dyadicNew(1n, n)) + 1n,
			),
		);
	});

	it("birthday(n) = |n| for integer n", () => {
		fc.assert(
			fc.property(
				arbBigint,
				(n) => birthday(dyadicFromBigint(n)) === (n < 0n ? -n : n),
			),
		);
	});

	it("birthday(n + 1/2) = birthday(n) + 2 for integer n >= 0", () => {
		fc.assert(
			fc.property(
				arbBigint.filter((n) => n >= 0n),
				(n) => {
					const dn = dyadicFromBigint(n);
					return birthday(add(dn, half)) === 2n + birthday(dn);
				},
			),
		);
	});

	it("birthday(f / 2) = birthday(f) + 1 for 0 < f < 1", () => {
		fc.assert(
			fc.property(
				arbDyadic.filter((x) => x.isPositive && lt(x, one)),
				(x) => birthday(dyadicMult(x, half)) === 1n + birthday(x),
			),
		);
	});
});

describe("plus", () => {
	it("constants", () => {
		expect(plus(zero)).toEqual(one);
		expect(plus(one)).toEqual(dyadicFromBigint(2n));
		expect(plus(half)).toEqual(dyadicNew(3n, 2n));
		expect(plus(negOne)).toEqual(neg(half));
	});

	it("plus(x) > x", () => {
		fc.assert(fc.property(arbDyadic, (x) => gt(plus(x), x)));
	});

	it("birthday(plus(x)) = birthday(x) + 1", () => {
		fc.assert(
			fc.property(arbDyadic, (x) => birthday(plus(x)) === 1n + birthday(x)),
		);
	});

	it("plus(n) = n + 1 for integer n >= 0", () => {
		fc.assert(
			fc.property(arbBigint.filter((n) => n >= 0).map(dyadicFromBigint), (n) =>
				eq(plus(n), add(n, one)),
			),
		);
	});

	it("plus(n) = n + 1/2 for integer n < 0", () => {
		fc.assert(
			fc.property(arbBigint.filter((n) => n < 0).map(dyadicFromBigint), (n) =>
				eq(plus(n), add(n, half)),
			),
		);
	});

	it("plus(minus(x)) < minus(plus(x))", () => {
		fc.assert(
			fc.property(arbDyadic, (x) => lt(plus(minus(x)), minus(plus(x)))),
		);
	});
});

describe("minus", () => {
	it("minus(x) = -plus(-x)", () => {
		fc.assert(fc.property(arbDyadic, (x) => eq(neg(minus(x)), plus(neg(x)))));
	});

	it("minus(x) < x", () => {
		fc.assert(fc.property(arbDyadic, (x) => lt(minus(x), x)));
	});
});

describe("lca", () => {
	const arbPair = fc.tuple(arbDyadic, arbDyadic).filter(([a, b]) => le(a, b));

	it("constants (integers)", () => {
		expect(lca(zero, zero)).toEqual(zero);
		expect(lca(zero, one)).toEqual(zero);
		expect(lca(dyadicFromBigint(-2n), dyadicFromBigint(5n))).toEqual(zero);
		expect(lca(dyadicFromBigint(2n), dyadicFromBigint(5n))).toEqual(
			dyadicFromBigint(2n),
		);
		expect(lca(dyadicFromBigint(-5n), zero)).toEqual(zero);
		expect(lca(dyadicFromBigint(-5n), dyadicFromBigint(-2n))).toEqual(
			dyadicFromBigint(-2n),
		);
	});

	it("constants (fractions 1)", () => {
		// 0.5 = [+-], 1.5 = [++-], lca(0.5, 1.5) = 1
		expect(lca(dyadicNew(1n, 2n), dyadicNew(3n, 1n))).toEqual(one);
		// lca(1.5, 2) = 2
		expect(lca(dyadicNew(3n, 1n), dyadicFromBigint(2n))).toEqual(
			dyadicFromBigint(2n),
		);
		// lca(0.5, 2) = 1
		expect(lca(half, dyadicFromBigint(2n))).toEqual(one);
		// lca(0.5, 1) = 1
		expect(lca(half, one)).toEqual(one);
	});

	it("constants (fractions 2)", () => {
		// lca(0.25, 0.75) = 0.5
		expect(lca(dyadicNew(1n, 2n), dyadicNew(3n, 2n))).toEqual(half);
		// lca(0.25, 1) = 1
		expect(lca(dyadicNew(1n, 2n), dyadicFromBigint(1n))).toEqual(one);
		// lca(0.25, 2) = 1
		expect(lca(dyadicNew(1n, 2n), dyadicFromBigint(2n))).toEqual(one);
	});

	it("a <= lca(a, b) <= b", () => {
		fc.assert(
			fc.property(arbPair, ([a, b]) => {
				const c = lca(a, b);
				return le(a, c) && le(c, b);
			}),
		);
	});

	it("birthday(lca(a, b)) <= birthday(a) && birthday(lca(a, b)) <= birthday(b)", () => {
		fc.assert(
			fc.property(arbPair, ([a, b]) => {
				const bc = birthday(lca(a, b));
				return bc <= birthday(a) && bc <= birthday(b);
			}),
		);
	});

	it("lca(a, a) = a", () => {
		fc.assert(fc.property(arbDyadic, (a) => eq(a, lca(a, a))));
	});

	it("lca(0, a) = 0", () => {
		fc.assert(
			fc.property(
				arbDyadic.filter((x) => x.isPositive),
				(a) => lca(zero, a).isZero,
			),
		);
	});

	it("lca(a, b) = 0 for a < 0 and b > 0", () => {
		fc.assert(
			fc.property(
				arbPair.filter(([a, b]) => a.isNegative && b.isPositive),
				([a, b]) => lca(a, b).isZero,
			),
		);
	});

	it("lca(a, plus(a)) = a", () => {
		fc.assert(fc.property(arbDyadic, (a) => eq(a, lca(a, plus(a)))));
	});

	it("lca(minus(a), a) = a", () => {
		fc.assert(fc.property(arbDyadic, (a) => eq(a, lca(minus(a), a))));
	});

	it("lca(minus(a), plus(a)) = a", () => {
		fc.assert(fc.property(arbDyadic, (a) => eq(a, lca(minus(a), plus(a)))));
	});

	it("lca(p, q) = p for integer p >= 0", () => {
		fc.assert(
			fc.property(
				arbPair.filter(([a]) => a.isInteger && !a.isNegative),
				([a, b]) => eq(a, lca(a, b)),
			),
		);
	});
});

describe("signExpansionFrac", () => {
	it("should reconstruct value from based on traversal", () => {
		fc.assert(
			fc.property(
				arbDyadic
					.filter((x) => x.isPositive)
					.map((x) => toMixed(x)[1])
					.filter((x) => x.isPositive),
				(x) => {
					const se = [...signExpansionFrac(x)];
					const fromTraversal = se.reduce(
						(v, s) => (s ? plus(v) : minus(v)),
						one,
					);
					expect(x).toEqual(fromTraversal);
				},
			),
		);
	});
});

describe("isSafeNumber", () => {
	const arbDyadicWide = fc
		.tuple(
			fc.bigInt({ min: -(1n << 64n), max: 1n << 64n }),
			fc.bigInt({ min: -32n, max: 32n }),
		)
		.map(([x, y]) => dyadicNew(x, y));

	it("isSafeNumber(x) implies fromNumber(x.quotient) = x", () => {
		fc.assert(
			fc.property(arbDyadicWide, (x) => {
				fc.pre(isSafeNumber(x));
				return eq(x, dyadicFromNumber(x.quotient));
			}),
		);
	});
});

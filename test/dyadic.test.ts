import fc from "fast-check";
import {
	dyadicAdd,
	dyadicCompare,
	dyadicEq,
	dyadicFromBigint,
	dyadicFromNumber,
	dyadicHalf,
	dyadicIsPositive,
	dyadicLe,
	dyadicLt,
	dyadicMult,
	dyadicNeg,
	dyadicOne,
	dyadicSub,
	dyadicToMixed,
	dyadicZero,
} from "../dyadic";
import {
	abs,
	add,
	dyadicLog2,
	dyadicPow2,
	fromBigint,
	half,
	isSafeNumber,
	longDivision,
	longDivisionIters,
	mult,
	neg,
	negOne,
	one,
	sub,
	zero,
} from "../dyadic/arith";
import {
	birthday,
	commonAncestor,
	dyadicConstruct,
	minus,
	plus,
	signExpansionFrac,
	toMixed,
} from "../dyadic/birthday";
import { type Dyadic, dyadicNew } from "../dyadic/class";
import { compare, eq, ge, gt, le, lt } from "../dyadic/comparison";
import { ORD_HASH_EPSILON, dyadicOrdHash } from "../dyadic/ordHash";
import {
	propCommAssoc,
	propDist,
	propIdentity,
	propTotalOrder,
	propZero,
} from "./propsTest.test";

fc.configureGlobal({ numRuns: 2000 });

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

describe("Number", () => {
	it("should be convertible to from integers to integers", () => {
		fc.assert(
			fc.property(fc.integer(), (x) => Number(dyadicFromNumber(x)) === x),
		);
	});

	it("should be convertible to from finite floats to floats", () => {
		fc.assert(
			fc.property(
				fc.float({ noNaN: true, noDefaultInfinity: true }),
				(x) => Number(dyadicFromNumber(x)) === x,
			),
		);
	});

	it("arithmetic with Number", () => {
		expect(+dyadicNew(3n, 1n) + 1.5).toBe(3);
		expect(+dyadicNew(5n, 1n) / -4).toBe(-0.625);
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

describe("longDivision", () => {
	it("17 div 3 = 5 R 2", () => {
		const [q, r] = longDivision(fromBigint(17n), fromBigint(3n));
		expect(q.toString()).toBe("5");
		expect(r.toString()).toBe("2");
	});

	describe("zero remainder guarantee", () => {
		const arbZeroRemainder = fc
			.record({
				m: fc.bigInt({ min: 1n, max: 1n << 256n }),
				n: fc.bigInt({ min: 1n, max: 1n << 256n }),
				p1: fc.bigInt({ min: -64n, max: 64n }),
				p2: fc.bigInt({ min: -64n, max: 64n }),
			})
			.map(({ m, n, p1, p2 }) => ({
				n: dyadicNew(m * n, p1),
				d: dyadicNew(n, p2),
			}));

		it("numerators are divisible", () => {
			fc.assert(
				fc.property(
					arbZeroRemainder,
					({ n, d }) => longDivision(n, d)[1].isZero,
				),
			);
		});

		it("numerators are divisible, invariant under multiplication", () => {
			fc.assert(
				fc.property(
					arbZeroRemainder,
					arbDyadic.filter((x) => !x.isZero),
					({ n, d }, k) => {
						const [q1, r1] = longDivision(n, d);
						const [q2, r2] = longDivision(mult(n, k), mult(d, k));
						return r1.isZero && r2.isZero && eq(q1, q2);
					},
				),
			);
		});

		it("divide by powers of 2", () => {
			fc.assert(
				fc.property(
					arbDyadic,
					fc.bigInt({ min: -32n, max: 32n }).map((n) => dyadicNew(1n, n)),
					(n, d) => longDivision(n, d)[1].isZero,
				),
			);
		});
	});

	it("absolute value of remainder does not increase for non-zero remainders", () => {
		fc.assert(
			fc.property(
				arbDyadic,
				arbDyadic.filter((x) => x.isPositive),
				(n, d) => {
					const r = longDivision(n, d)[1];
					return n.isZero || lt(abs(r), abs(n));
				},
			),
		);
	});

	it("divide by 0 throws error", () => {
		fc.assert(
			fc.property(arbDyadic, (n) => {
				expect(() => longDivision(n, zero)).toThrowError(RangeError);
			}),
		);
	});

	it("divide by 1", () => {
		fc.assert(
			fc.property(arbDyadic, (n) => {
				const [q, r] = longDivision(n, one);
				return r.isZero && eq(q, n);
			}),
		);
	});

	it("add back", () => {
		fc.assert(
			fc.property(
				arbDyadic,
				arbDyadic.filter((x) => x.isPositive),
				(n, d) => {
					const [q, r] = longDivision(n, d);
					return eq(add(r, mult(q, d)), n);
				},
			),
		);
	});

	it("negation symmetry", () => {
		fc.assert(
			fc.property(
				arbDyadic,
				arbDyadic.filter((x) => x.isPositive),
				(n, d) => {
					const [q1, r1] = longDivision(n, d);
					const [q2, r2] = longDivision(neg(n), d);
					return eq(q1, neg(q2)) && eq(r1, neg(r2));
				},
			),
		);
	});
});

describe("longDivisionIters", () => {
	it("zero iterations", () => {
		fc.assert(
			fc.property(
				arbDyadic,
				arbDyadic.filter((x) => x.isPositive),
				(n, d) => {
					const [q, r] = longDivisionIters(n, d, 0n);
					return q.isZero && eq(r, n);
				},
			),
		);
	});

	it("absolute value of remainder does not increase with more iterations", () => {
		fc.assert(
			fc.property(
				arbDyadic,
				arbDyadic.filter((x) => x.isPositive),
				fc.bigInt({ min: 1n, max: 30n }),
				fc.bigInt({ min: 1n, max: 30n }),
				(n, d, k, m) => {
					const [, r1] = longDivisionIters(n, d, k);
					const [, r2] = longDivisionIters(n, d, k + m);
					return le(abs(r2), abs(r1));
				},
			),
		);
	});
});

describe("commonAncestor", () => {
	const arbPair = fc.tuple(arbDyadic, arbDyadic).filter(([a, b]) => le(a, b));

	it("constants (integers)", () => {
		expect(commonAncestor(zero, zero)).toEqual(zero);
		expect(commonAncestor(zero, one)).toEqual(zero);
		expect(commonAncestor(dyadicFromBigint(-2n), dyadicFromBigint(5n))).toEqual(
			zero,
		);
		expect(commonAncestor(dyadicFromBigint(2n), dyadicFromBigint(5n))).toEqual(
			dyadicFromBigint(2n),
		);
		expect(commonAncestor(dyadicFromBigint(-5n), zero)).toEqual(zero);
		expect(
			commonAncestor(dyadicFromBigint(-5n), dyadicFromBigint(-2n)),
		).toEqual(dyadicFromBigint(-2n));
	});

	it("constants (fractions 1)", () => {
		// 0.5 = [+-], 1.5 = [++-], commonAncestor(0.5, 1.5) = 1
		expect(commonAncestor(dyadicNew(1n, 2n), dyadicNew(3n, 1n))).toEqual(one);
		// commonAncestor(1.5, 2) = 2
		expect(commonAncestor(dyadicNew(3n, 1n), dyadicFromBigint(2n))).toEqual(
			dyadicFromBigint(2n),
		);
		// commonAncestor(0.5, 2) = 1
		expect(commonAncestor(half, dyadicFromBigint(2n))).toEqual(one);
		// commonAncestor(0.5, 1) = 1
		expect(commonAncestor(half, one)).toEqual(one);
	});

	it("constants (fractions 2)", () => {
		// commonAncestor(0.25, 0.75) = 0.5
		expect(commonAncestor(dyadicNew(1n, 2n), dyadicNew(3n, 2n))).toEqual(half);
		// commonAncestor(0.25, 1) = 1
		expect(commonAncestor(dyadicNew(1n, 2n), dyadicFromBigint(1n))).toEqual(
			one,
		);
		// commonAncestor(0.25, 2) = 1
		expect(commonAncestor(dyadicNew(1n, 2n), dyadicFromBigint(2n))).toEqual(
			one,
		);
	});

	it("a <= commonAncestor(a, b) <= b", () => {
		fc.assert(
			fc.property(arbPair, ([a, b]) => {
				const c = commonAncestor(a, b);
				return le(a, c) && le(c, b);
			}),
		);
	});

	it("birthday(commonAncestor(a, b)) <= birthday(a) && birthday(commonAncestor(a, b)) <= birthday(b)", () => {
		fc.assert(
			fc.property(arbPair, ([a, b]) => {
				const bc = birthday(commonAncestor(a, b));
				return bc <= birthday(a) && bc <= birthday(b);
			}),
		);
	});

	it("commonAncestor(a, a) = a", () => {
		fc.assert(fc.property(arbDyadic, (a) => eq(a, commonAncestor(a, a))));
	});

	it("commonAncestor(0, a) = 0", () => {
		fc.assert(
			fc.property(
				arbDyadic.filter((x) => x.isPositive),
				(a) => commonAncestor(zero, a).isZero,
			),
		);
	});

	it("commonAncestor(a, b) = 0 for a < 0 and b > 0", () => {
		fc.assert(
			fc.property(
				arbPair.filter(([a, b]) => a.isNegative && b.isPositive),
				([a, b]) => commonAncestor(a, b).isZero,
			),
		);
	});

	it("commonAncestor(a, plus(a)) = a", () => {
		fc.assert(fc.property(arbDyadic, (a) => eq(a, commonAncestor(a, plus(a)))));
	});

	it("commonAncestor(minus(a), a) = a", () => {
		fc.assert(
			fc.property(arbDyadic, (a) => eq(a, commonAncestor(minus(a), a))),
		);
	});

	it("commonAncestor(minus(a), plus(a)) = a", () => {
		fc.assert(
			fc.property(arbDyadic, (a) => eq(a, commonAncestor(minus(a), plus(a)))),
		);
	});

	it("commonAncestor(p, q) = p for integer p >= 0", () => {
		fc.assert(
			fc.property(
				arbPair.filter(([a]) => a.isInteger && !a.isNegative),
				([a, b]) => eq(a, commonAncestor(a, b)),
			),
		);
	});
});

describe("dyadicConstruct", () => {
	it("zero", () => {
		expect(dyadicConstruct().isZero).toBe(true);
	});

	/**
	 * Generates two lists of `Dyadic`s, `left`, `right`,
	 * where everything in `left` are less than everything
	 * in `right`.
	 */
	const arbCut = fc.array(arbDyadic).chain((arr) => {
		if (arr.length === 0) {
			return fc.constant({ left: [], right: [] });
		}
		const arr1 = [...arr];
		arr1.sort(dyadicCompare);
		const n = fc.integer({ min: 0, max: arr.length });
		return n.map((i) => ({
			left: arr1.slice(i),
			right: arr1.slice(0, i),
		}));
	});

	it("all arbCut follow the left < right property", () => {
		fc.property(arbCut, ({ left, right }) =>
			left.every((l) => right.every((r) => dyadicLt(l, r))),
		);
	});

	it("negation symmetry", () => {
		fc.property(arbCut, ({ left, right }) =>
			dyadicEq(
				dyadicNeg(dyadicConstruct(right.map(dyadicNeg), left.map(dyadicNeg))),
				dyadicConstruct(left, right),
			),
		);
	});

	it("result is between left and right", () => {
		fc.property(arbCut, ({ left, right }) => {
			const x = dyadicConstruct(left, right);
			return left.every((l) => lt(l, x)) && right.every((r) => lt(x, r));
		});
	});

	it("definition of surreal addition", () => {
		fc.property(
			arbCut,
			arbCut,
			({ left: xl, right: xr }, { left: yl, right: yr }) => {
				const x = dyadicConstruct(xl, xr);
				const y = dyadicConstruct(yl, yr);
				const add = dyadicAdd(x, y);
				const addL = [
					...xl.map((x1) => dyadicAdd(x1, y)),
					...yl.map((y1) => dyadicAdd(x, y1)),
				];
				const addR = [
					...xr.map((x1) => dyadicAdd(x1, y)),
					...yr.map((y1) => dyadicAdd(x, y1)),
				];
				return dyadicEq(dyadicConstruct(addL, addR), add);
			},
		);
	});

	it("definition of surreal multiplication", () => {
		const part = (
			x: Dyadic,
			xos: Dyadic[],
			y: Dyadic,
			yos: Dyadic[],
		): Dyadic[] => {
			// must range over 2 variables like this: { ... | xo1 <- xo, yo1 <- yo },
			// not { ... + ... | xo1 <- xo, yo1 <- yo } - { ... | xo1 <- xo, yo1 <- yo }
			//     = { sum - prod | sum <- ..., prod <- ... }
			// or else the left < right invariant can fail
			const res: Dyadic[] = [];
			for (const xo of xos) {
				for (const yo of yos) {
					res.push(
						dyadicSub(
							dyadicAdd(dyadicMult(x, xo), dyadicMult(y, yo)),
							dyadicMult(xo, yo),
						),
					);
				}
			}
			return res;
		};

		fc.property(
			arbCut,
			arbCut,
			({ left: xl, right: xr }, { left: yl, right: yr }) => {
				const x = dyadicConstruct(xl, xr);
				const y = dyadicConstruct(yl, yr);
				const mult = dyadicMult(x, y);
				const multL = [...part(x, xl, y, yl), ...part(x, xr, y, yr)];
				const multR = [...part(x, xl, y, yr), ...part(x, xr, y, yl)];
				return dyadicEq(dyadicConstruct(multL, multR), mult);
			},
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

describe("dyadicLog2", () => {
	it("powers of 2", () => {
		expect(dyadicLog2(dyadicOne.half(2n))).toBe(-2n);
		expect(dyadicLog2(dyadicHalf)).toBe(-1n);
		expect(dyadicLog2(dyadicOne)).toBe(0n);
		expect(dyadicLog2(dyadicFromBigint(2n))).toBe(1n);
		expect(dyadicLog2(dyadicFromBigint(4n))).toBe(2n);
		expect(dyadicLog2(dyadicFromBigint(8n))).toBe(3n);
	});

	it("dyadicLog2(dyadicPow2(n)) = n", () => {
		fc.assert(
			fc.property(
				fc.bigInt({ min: -(1n << 8n), max: 1n << 8n }),
				(n) => dyadicLog2(dyadicPow2(n)) === n,
			),
		);
	});

	it("non-decreasing", () => {
		fc.assert(
			fc.property(
				arbDyadic.filter(dyadicIsPositive),
				arbDyadic.filter(dyadicIsPositive),
				(a, b) => {
					fc.pre(dyadicLe(a, b));
					return dyadicLog2(a) <= dyadicLog2(b);
				},
			),
		);
	});

	it("dyadicLog2(x + x) >= dyadicLog2(x)", () => {
		fc.assert(
			fc.property(
				arbDyadic.filter(dyadicIsPositive),
				(a) => dyadicLog2(dyadicAdd(a, a)) >= dyadicLog2(a),
			),
		);
	});
});

describe("dyadicOrdHash", () => {
	it("hash of zero is zero", () => {
		expect(dyadicOrdHash(dyadicZero)).toBe(0n);
	});

	it("hash of half, 1 and 2 are different", () => {
		expect(dyadicOrdHash(dyadicOne)).not.toBe(dyadicOrdHash(dyadicHalf));
		expect(dyadicOrdHash(dyadicOne)).not.toBe(
			dyadicOrdHash(dyadicFromBigint(2n)),
		);
	});

	it("increasing", () => {
		fc.assert(
			fc.property(arbDyadic.filter(dyadicIsPositive), arbDyadic, (a, b) => {
				fc.pre(dyadicLe(a, b));
				return dyadicOrdHash(a) <= dyadicOrdHash(b);
			}),
		);
	});

	it("odd function", () => {
		fc.assert(
			fc.property(
				arbDyadic,
				(a) => dyadicOrdHash(a) === -dyadicOrdHash(dyadicNeg(a)),
			),
		);
	});

	it("difference betwen ordHashes is at most 1 for a piecewise increasing sequence", () => {
		const seq = (n: bigint) => (n <= 0n ? dyadicPow2(n) : dyadicFromBigint(1n));
		fc.assert(
			fc.property(
				fc.bigInt({ min: -1024n, max: 1024n }),
				(n) => dyadicOrdHash(seq(n + 1n)) - dyadicOrdHash(seq(n)) <= 1n,
			),
		);
	});
});

describe("ORD_HASH_EPSILON", () => {
	it("ordHash is 1", () => {
		expect(dyadicOrdHash(ORD_HASH_EPSILON)).toBe(1n);
	});

	it("all positive dyadics below it have ordHash of 0", () => {
		fc.assert(
			fc.property(
				arbDyadic.filter(
					(x) => dyadicIsPositive(x) && dyadicLt(x, ORD_HASH_EPSILON),
				),
				(x) => dyadicOrdHash(x) === 0n,
			),
		);
	});
});

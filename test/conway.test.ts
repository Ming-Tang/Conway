import fc from "fast-check";
import {
	Conway,
	type Conway0,
	type InferIsOrd,
	type Ord,
	type Ord0,
} from "../conway";
import { dyadicPow2 } from "../dyadic/arith";
import {
	create,
	ensure,
	maybeUnwrap,
	mono,
	mono1,
	negOne,
	one,
	fromReal as real,
	unit,
	zero,
} from "../op";
import {
	compare,
	eq,
	gt,
	isAboveReals,
	isNegative,
	isPositive,
	isZero,
	le,
	lt,
	ne,
} from "../op";
import "../op/methods/arith";
import { dyadicIsPositive } from "../dyadic";
import { add, mult, neg, sub } from "../op/arith";
import { longDivisionIters } from "../op/longDivision";
import type { Real } from "../real";
import {
	arbConway1,
	arbConway2,
	arbConway3,
	arbConway5,
	arbConwayReal,
	arbDyadic,
	arbFinite,
	arbFiniteBigint,
	arbRealGeneral,
} from "./generators";
import {
	propCommAssoc,
	propDist,
	propIdentity,
	propTotalOrder,
	propZero,
} from "./propsTest.test";

const ensureIncreasing = (x: Conway) => {
	const es = [...x].map((c) => c[0]);
	fc.pre(es.length >= 2);
	for (let i = 0; i < es.length - 1; i++) {
		const a = es[i];
		const b = es[i + 1];
		if (!gt(a, b)) {
			return false;
		}
	}
	return true;
};

const ensureSimplified = (x: Conway) => {
	const f = (x: Conway0, root: boolean) => {
		if (!(x instanceof Conway)) {
			return true;
		}

		if (!root && x instanceof Conway && x.realValue !== null) {
			return false;
		}

		for (const [p, c] of x) {
			if (isZero(c)) {
				return false;
			}

			if (!f(p, false)) {
				return false;
			}
		}

		return true;
	};

	return f(x, true);
};

describe("Conway", () => {
	describe("constants", () => {
		it("zero = itself", () => {
			expect(zero.eq(mono(0, 0))).toBe(true);
			expect(mono(0n, 0n).eq(mono(0, 0))).toBe(true);
		});

		it("0 + 0 = 0", () => {
			expect(zero.add(zero).eq(zero)).toBe(true);
			expect(zero.add(real(0)).eq(zero)).toBe(true);
			expect(zero.add(real(0n)).eq(zero)).toBe(true);
			expect(zero.add(zero).eq(real(0n))).toBe(true);
			expect(zero.add(zero).eq(real(0))).toBe(true);
		});

		it("1 + 0 = 1", () => {
			expect(one.add(zero).eq(one)).toBe(true);
			expect(zero.add(one).eq(one)).toBe(true);
		});

		it("1 * 0 = 0", () => {
			expect(one.mult(zero).eq(zero)).toBe(true);
			expect(zero.mult(one).eq(zero)).toBe(true);
		});

		it("1 * 1 = 1", () => {
			expect(one.mult(zero).eq(zero)).toBe(true);
			expect(one.mult(one).eq(one)).toBe(true);
		});

		it("0 * w = 0", () => {
			console.log(unit.mult(one));
			expect(unit.mult(zero).eq(zero)).toBe(true);
			expect(zero.mult(unit).eq(zero)).toBe(true);
		});

		it("1 * w = w", () => {
			expect(unit.mult(one).eq(unit)).toBe(true);
			expect(one.mult(unit).eq(unit)).toBe(true);
		});

		it("0 and 1 have real value", () => {
			expect(zero.realValue).toBe(0n);
			expect(one.realValue).toBe(1n);
		});

		it("w has no real value", () => {
			expect(unit.realValue).toBeNull();
		});

		it("0, 1, w are simplified", () => {
			expect(ensureSimplified(zero)).toBe(true);
			expect(ensureSimplified(one)).toBe(true);
			expect(ensureSimplified(unit)).toBe(true);
		});

		it("gt", () => {
			expect(gt(2, 0)).toBe(true);
			expect(gt(2n, 0)).toBe(true);
			expect(gt(2, 0n)).toBe(true);
			expect(gt(0, 2)).toBe(false);
			expect(gt(2, 1)).toBe(true);
			expect(gt(1, 2)).toBe(false);
			expect(gt(zero, zero)).toBe(false);
			expect(gt(one, zero)).toBe(true);
			expect(gt(zero, one)).toBe(false);
			expect(gt(unit, one)).toBe(true);
			expect(gt(one, unit)).toBe(false);
		});
	});

	describe("zeros", () => {
		it("should be true for zero monomials", () => {
			expect(zero.isZero).toBe(true);
			expect(mono(0n, 0n).isZero).toBe(true);
			expect(mono(0, 0).isZero).toBe(true);
			expect(create([[0n, 0n]]).isZero).toBe(true);
			expect(
				create([
					[0n, -2n],
					[0n, 2n],
				]),
			).toHaveLength(0);
		});

		it("should have zero length", () => {
			expect(zero).toHaveLength(0);
			expect(mono(0n, 0n)).toHaveLength(0);
			expect(mono(0, 0)).toHaveLength(0);
			expect(create([[0n, 0n]])).toHaveLength(0);
			expect(
				create([
					[0n, -2n],
					[0n, 2n],
				]),
			).toHaveLength(0);
		});
	});

	describe("specific tests", () => {
		it("4^4 times 1", () => {
			const v = mono(4n, 4n);
			const v1 = v.mult(one);
			expect(v.eq(v1)).toBe(true);
			expect(v.compare(v1)).toEqual(0);
		});

		it("-w^(-w)", () => {
			const v = mono(-1n, mono(-1n, 1n));
			expect(v.mult(one).eq(v)).toBe(true);
			expect(one.mult(v).eq(v)).toBe(true);
			expect(eq(mult(one, v), v)).toBe(true);
			expect(eq(mult(v, one), v)).toBe(true);
		});
	});

	describe("constants (different number types)", () => {
		it("0 = 0n", () => {
			expect(real(0).eq(real(0n))).toBe(true);
		});

		it("1.0 = 1n", () => {
			expect(real(1.0).eq(real(1n))).toBe(true);
		});

		it("0 < 1", () => {
			expect(lt(real(0), real(1n))).toBe(true);
			expect(lt(real(0n), real(1))).toBe(true);
		});
	});

	const arithProps = (
		arb: fc.Arbitrary<Conway>,
		skip = false,
		numRuns?: number,
	) => {
		(skip ? describe.skip : describe)("arithmetic", () => {
			describe("add", () => {
				propIdentity<Conway0>(it, arb, zero, add, eq, { numRuns });
				propCommAssoc<Conway0>(it, arb, add, eq, { numRuns });

				it("static method is equivalent to instance method ", () => {
					fc.assert(
						fc.property(arb, arb, (x, y) => eq(x.add(y), add(x, y))),
						{ numRuns },
					);
				});
			});

			describe("mult", () => {
				propIdentity<Conway0>(it, arb, one, mult, eq, { numRuns });
				propZero<Conway0>(it, arb, zero, mult, eq, { numRuns });
				propCommAssoc<Conway0>(it, arb, mult, eq, { numRuns });

				it("static method is equivalent to instance method ", () => {
					fc.assert(
						fc.property(arb, arb, (x, y) => eq(x.mult(y), mult(x, y))),
						{ numRuns },
					);
				});
			});

			describe("neg", () => {
				it("preserves length", () => {
					fc.assert(
						fc.property(arb, (x) => x.length === x.neg().neg().length),
						{ numRuns },
					);
				});

				it("involution", () => {
					fc.assert(
						fc.property(arb, (x) => eq(x, x.neg().neg())),
						{ numRuns },
					);
				});

				it("static method is equivalent to instance method ", () => {
					fc.assert(
						fc.property(arb, (x) => eq(x.neg(), neg(x))),
						{ numRuns },
					);
				});
			});

			describe("sub", () => {
				it("a - 0 = a", () => {
					fc.assert(
						fc.property(arb, (a) => a.sub(zero).eq(a)),
						{ numRuns },
					);
				});

				it("a - b = -(b - a)", () => {
					fc.assert(
						fc.property(arb, arb, (a, b) => a.sub(b).eq(b.sub(a).neg())),
						{ numRuns },
					);
				});

				it("(a + b) - b = a", () => {
					fc.assert(
						fc.property(arb, arb, (a, b) => a.add(b).sub(b).eq(a)),
						{ numRuns },
					);
				});

				it("(a - b) + b = a", () => {
					fc.assert(
						fc.property(arb, arb, (a, b) => a.sub(b).add(b).eq(a)),
						{ numRuns },
					);
				});

				it("0 - a = -a", () => {
					fc.assert(
						fc.property(arb, (a) => zero.sub(a).eq(a.neg())),
						{ numRuns },
					);
				});

				it("static method is equivalent to instance method ", () => {
					fc.assert(
						fc.property(arb, arb, (x, y) => eq(x.sub(y), sub(x, y))),
						{ numRuns },
					);
				});
			});

			describe("distributive", () => {
				propDist<Conway0>(it, arb, add, mult, eq, { numRuns });
			});
		});
	};

	const eqProps = (arb: fc.Arbitrary<Conway>, skip = false) => {
		const d = skip ? describe.skip : describe;
		d("eq", () => {
			it("negation of ne", () => {
				fc.assert(fc.property(arb, arb, (x, y) => eq(x, y) === !ne(x, y)));
			});

			it("same as compare (self)", () => {
				fc.assert(fc.property(arb, (x) => eq(x, x) && compare(x, x) === 0));
			});

			it("same as compare (different)", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => eq(x, y) === (compare(x, y) === 0)),
				);
			});

			it("static method is equivalent to instance method ", () => {
				fc.assert(fc.property(arb, arb, (x, y) => eq(x, y) === x.eq(y)));
			});
		});

		d("eqHash", () => {
			it("different hash implies not equals", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => {
						fc.pre(x.eqHash !== y.eqHash);
						return ne(x, y);
					}),
				);
			});
		});

		d("ordHash", () => {
			it("different hash implies not equals", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => {
						fc.pre(x.ordHash !== y.ordHash);
						return ne(x, y);
					}),
				);
			});

			it("less than in ordHash implies less than", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => {
						fc.pre(x.ordHash < y.ordHash);
						return lt(x, y);
					}),
				);
			});
		});

		d("decomposition", () => {
			it("infinite + real + infinitesimal", () => {
				fc.assert(
					fc.property(arb, (x) =>
						x.infinitePart.add(x.realPart).add(x.infinitesimalPart).eq(x),
					),
				);
			});
		});
	};

	describe("No0 = R", () => {
		const arb = arbConwayReal(arbFiniteBigint);
		describe("total order", () => {
			propTotalOrder(it, arb, compare, eq);

			it("equal real vs. power zero", () => {
				fc.assert(
					fc.property(arbRealGeneral, (a) => {
						return eq(real(a), mono(a, zero));
					}),
				);
			});

			it("equal real vs. real", () => {
				fc.assert(
					fc.property(arbRealGeneral, (a) => {
						return eq(real(a), a);
					}),
				);
			});

			it("greater than with real", () => {
				fc.assert(
					fc.property(arbFiniteBigint, arbFiniteBigint, (a, b) => {
						return compare(real(a), real(b)) > 0 === b - a > 0n;
					}),
				);
			});

			it("greater than", () => {
				fc.assert(
					fc.property(arbFinite, arbFinite, (a, b) => {
						return gt(a, b) === a > b;
					}),
				);
			});
		});

		eqProps(arb);
		arithProps(arb);

		it("simplified", () => {
			fc.assert(fc.property(arb, ensureSimplified));
		});

		describe("ordHash", () => {
			it("reals < 0", () => {
				fc.assert(
					fc.property(arbFinite, (v) => {
						ensure(v).ordHash < 0n === v < 0;
					}),
				);
			});

			it("reals >= 0", () => {
				fc.assert(
					fc.property(arbFinite, (v) => {
						ensure(v).ordHash >= 0n === v >= 0;
					}),
				);
			});

			it("preserves ordering", () => {
				fc.assert(
					fc.property(arbFinite, arbFinite, (a, b) => {
						le(ensure(a).ordHash, ensure(b).ordHash) === a <= b;
					}),
				);
			});
		});

		describe("add", () => {
			it("with zero", () => {
				fc.assert(
					fc.property(arbFiniteBigint, (a) => {
						return eq(real(a).add(zero), real(a));
					}),
				);
			});

			it("bigint", () => {
				fc.assert(
					fc.property(arbFiniteBigint, arbFiniteBigint, (a, b) => {
						return eq(real(a).add(real(b)), real(a + b));
					}),
				);
			});

			it("number", () => {
				fc.assert(
					fc.property(arbFinite, arbFinite, (a, b) => {
						return eq(real(a).add(real(b)), real(a + b));
					}),
				);
			});
		});

		describe("mult", () => {
			it("by zero", () => {
				fc.assert(
					fc.property(arbFinite, (a) => {
						return eq(real(a).mult(zero), real(0));
					}),
				);
			});

			it("by one", () => {
				fc.assert(
					fc.property(arbFinite, (a) => {
						return eq(real(a).mult(one), real(a));
					}),
				);
			});

			it("bigint", () => {
				fc.assert(
					fc.property(arbFiniteBigint, arbFiniteBigint, (a, b) => {
						return eq(real(a).mult(real(b)), real(a * b));
					}),
				);
			});

			it("number", () => {
				fc.assert(
					fc.property(arbFinite, arbFinite, (a, b) => {
						return eq(real(a).mult(real(b)), real(a * b));
					}),
				);
			});
		});
	});

	describe("No1 = R[[w^R]]", () => {
		const arb = arbConway1(arbFiniteBigint, { maxLength: 10 });

		it("should have terms with descending exponents", () => {
			fc.assert(fc.property(arb, ensureIncreasing));
		});

		it("simplified", () => {
			fc.assert(fc.property(arb, ensureSimplified));
		});

		describe("total order", () => {
			propTotalOrder(it, arb, compare, eq);
		});

		eqProps(arb);
		arithProps(arb);
	});

	describe("No2 = R[[w^No1]]", () => {
		const arb = arbConway2(arbFiniteBigint, { maxLength: 5 });

		it("should have terms with descending exponents", () => {
			fc.assert(fc.property(arb, ensureIncreasing));
		});

		it("simplified", () => {
			fc.assert(fc.property(arb, ensureSimplified));
		});

		describe("total order", () => {
			propTotalOrder(it, arb, compare, eq);
		});

		eqProps(arb);
		arithProps(arb, false, 100);
	});

	describe("No3 = R[[w^No2]]", () => {
		const arb = arbConway3(arbFiniteBigint, { maxLength: 3 });

		it("should have terms with descending exponents", () => {
			fc.assert(fc.property(arb, ensureIncreasing));
		});

		it("simplified", () => {
			fc.assert(fc.property(arb, ensureSimplified));
		});

		describe("total order", () => {
			propTotalOrder(it, arb, compare, eq);
		});

		eqProps(arb);
		arithProps(arb, false, 100);
	});

	describe("ordHash - distinct guarantee", () => {
		const towers: Conway0[] = [];
		let a = 1n as Conway0;
		for (let i = 0; i < 10; i++) {
			towers.push(a);
			a = mono1(a);
		}

		const powInts: Conway0[] = [];
		for (let i = -4; i <= 8; i++) {
			powInts.push(mono1(i));
		}

		const ints: Conway0[] = [];
		for (let i = 16; i <= 16; i++) {
			ints.push(i);
		}

		const fracs: Conway0[] = [];
		for (let i = 1n; i <= 8n; i++) {
			fracs.push(dyadicPow2(-i));
		}

		const ensureDistinct = (xs: Conway0[]) => {
			for (let i = 0; i < xs.length - 1; i++) {
				const a = ensure(xs[i]);
				const b = ensure(xs[i + 1]);
				expect(a.ordHash).not.toEqual(b.ordHash);
			}
		};

		it("power towers", () => {
			ensureDistinct(towers);
		});

		it("integer powers", () => {
			ensureDistinct(powInts);
		});

		it("integers", () => {
			ensureDistinct(ints);
		});

		it("fractions", () => {
			ensureDistinct(fracs);
		});

		it("1, w, w^2, w^w", () => {
			expect(one.ordHash).not.toBe(mono1(1n).ordHash);
			expect(mono1(1n).ordHash).not.toBe(mono1(2n).ordHash);
			expect(mono1(2n).ordHash).not.toBe(mono1(mono1(1n)).ordHash);
		});

		it("1 and w^-1", () => {
			expect(one.ordHash).not.toBe(mono1(-1n).ordHash);
		});

		it("w^-1, w^-2, w^-w w^-(w^w)", () => {
			const t2 = mono1(neg(mono1(1n)));
			expect(mono1(-2n).ordHash).not.toBe(t2);
			expect(mono1(-1n).ordHash).not.toBe(mono1(-2n).ordHash);
			const t3 = mono1(neg(mono1(mono1(1n))));
			expect(t3.ordHash).not.toBe(t2.ordHash);
		});
	});

	describe("ordHash - No5", () => {
		const arb = arbConway5(arbDyadic(8));

		it("is preserved under recrating the same value", () => {
			fc.assert(
				fc.property(arb, (a) => {
					const a1 = a.mult(one);
					const a2 = a.add(zero);
					const a3 = create([...a.terms]);
					return (
						a.ordHash === a1.ordHash &&
						a1.ordHash === a2.ordHash &&
						a2.ordHash === a3.ordHash
					);
				}),
			);
		});

		it("ordHash of zero is zero", () => {
			expect(zero.ordHash).toBe(0n);
		});

		it("ordHash of negative is non-positive", () => {
			fc.assert(fc.property(arb.filter(isNegative), (a) => a.ordHash <= 0n));
		});

		it("ordHash of positive is non-negative", () => {
			fc.assert(fc.property(arb.filter(isPositive), (a) => a.ordHash >= 0n));
		});

		it("squaring of >= 1 does not decrease ordHash", () => {
			fc.assert(
				fc.property(
					arb.filter((a) => gt(a, 1n)),
					(a) => compare(a.ordHash, a.mult(a).ordHash) >= 0,
				),
			);
		});

		it("preserves ordering of ordHash by adding a positive", () => {
			fc.assert(
				fc.property(arb, arb.filter(isPositive), (a, b) => {
					const c = a.add(b);
					fc.pre(compare(a, c) >= 0);
					return compare(a.ordHash, c.ordHash) >= 0;
				}),
			);
		});

		it("preserves ordering under multiplication of greater than 1 quantities", () => {
			fc.assert(
				fc.property(
					arb.filter((a) => gt(a, 1n)),
					arb.filter((a) => gt(a, 1n)),
					(a, b) => {
						const c = a.mult(b);
						return compare(a.ordHash, c.ordHash) >= 0;
					},
				),
			);
		});

		it("preserves anti-ordering under neg", () => {
			fc.assert(
				fc.property(arb, arb, (a, b) => {
					const ha = ensure(a).neg().ordHash;
					const hb = ensure(b).neg().ordHash;
					return hb <= ha === ensure(a).ordHash <= ensure(b).ordHash;
				}),
			);
		});

		it("preserves ordering under mono1", () => {
			fc.assert(
				fc.property(arb, arb, (a, b) => {
					const ha = mono1(a).ordHash;
					const hb = mono1(b).ordHash;
					fc.pre(ha !== hb);
					return ha <= hb === ensure(a).ordHash <= ensure(b).ordHash;
				}),
			);
		});

		it("preserves anti-ordering under mono1 neg", () => {
			fc.assert(
				fc.property(arb, arb, (a, b) => {
					const ha = mono1(neg(a)).ordHash;
					const hb = mono1(neg(b)).ordHash;
					fc.pre(ha !== hb);
					return hb <= ha === ensure(a).ordHash <= ensure(b).ordHash;
				}),
			);
		});

		describe("distinct guarantee", () => {
			it("ordHash of non-zeros are non-zero", () => {
				fc.assert(fc.property(arb, (x) => (x.ordHash !== 0n) === !isZero(x)));
			});

			it("mono1 of positives given different ordHash", () => {
				fc.assert(
					fc.property(
						arb.filter(isPositive),
						arb.filter(isPositive),
						(a, b) => {
							fc.pre(lt(a, b) && a.ordHash !== b.ordHash);
							return mono1(a).ordHash < mono1(b).ordHash;
						},
					),
				);
			});

			it("infinites above all reals", () => {
				fc.assert(
					fc.property(
						arbDyadic(64),
						arb.filter((x) => isPositive(x) && !isZero(x.infinitePart)),
						(real, inf) => ensure(real).ordHash < inf.ordHash,
					),
				);
			});

			it("positive reals above all infinitesimals", () => {
				fc.assert(
					fc.property(
						arbDyadic(64).filter(dyadicIsPositive),
						arb.filter(isPositive).map((x) => x.infinitesimalPart),
						(real, low) => ensure(real).ordHash > low.ordHash,
					),
				);
			});
		});
	});

	describe("longDivision", () => {
		describe("examples", () => {
			let k = 0;
			let a: Conway;
			let b: Conway;
			let expected: [Conway0, Real][];

			beforeEach(() => {
				k = 0;
				a = zero;
				b = zero;
				expected = [];
			});

			// taken from https://mathoverflow.net/a/224694
			it("1/(w+1)", () => {
				a = one;
				b = unit.add(one);
				expected = Array(k)
					.fill(null)
					.map((_, i) => [BigInt(-i - 1), i % 2 === 0 ? 1n : -1n]);
			});

			it("1/(w+2)", () => {
				a = one;
				b = unit.add(real(2n));
				expected = Array(k)
					.fill(null)
					.map((_, i) => [
						BigInt(-i - 1),
						(i % 2 === 0 ? 1n : -1n) * (1n << BigInt(i)),
					]);
			});

			it("(2w-1)/(w-1)^2", () => {
				a = mono(2, 1).sub(one);
				const b1 = unit.sub(one);
				b = b1.mult(b1);
				expected = Array(k)
					.fill(null)
					.map((_, i) => [BigInt(-i - 1), BigInt(i + 2)]);
			});

			it("(w^3-2w^2-4)/(w-3)", () => {
				k = 3;
				a = create([
					[3n, 1n],
					[2n, -2n],
					[0n, -4n],
				]);
				b = create([
					[1n, 1n],
					[0n, -3n],
				]);
				expected = [
					[2n, 1n],
					[1n, 1n],
					[0n, 3n],
				];
			});

			afterEach(() => {
				if (!k) {
					return;
				}

				const [q] = longDivisionIters(a, b, k);
				expect([...ensure(q)]).toEqual(
					expected.map(([c, r]) => [expect.conwayEq(c), expect.conwayEq(r)]),
				);
			});
		});

		// TODO test leading term elimination

		const arbDivisible = (arb: fc.Arbitrary<Conway>) =>
			fc.tuple(arb, arb).filter(([a, b]) => {
				const ac = a.leadingCoeff;
				const bc = b.leadingCoeff;
				if (typeof ac === "number" && typeof bc === "number") {
					return !b.isZero && (ac / bc) * bc === ac;
				}
				if (typeof ac === "bigint" && typeof bc === "bigint") {
					return !b.isZero && (ac / bc) * bc === ac;
				}
				return false;
			});

		it("leading term removal for the remainder", () => {
			fc.assert(
				fc.property(arbDivisible(arbConway2(arbFiniteBigint)), ([a, b]) => {
					const [_, r] = longDivisionIters(a, b, 1);
					const lp = a.leadingPower;
					fc.pre(lp !== null);
					fc.pre(r instanceof Conway);
					expect(isZero(r.get(lp))).toBe(true);
				}),
				{ numRuns: 100 },
			);
		});

		it("zero remainder: a b / b = a rem 0", () => {
			fc.assert(
				fc.property(arbDivisible(arbConway2(arbFiniteBigint)), ([a, b]) => {
					const ab = a.mult(b);
					const k = a.length + b.length;
					const [q, r] = longDivisionIters(ab, b, k);
					expect(isZero(r)).toBe(true);
					expect(eq(q, a)).toBe(true);
				}),
				{ numRuns: 100 },
			);
		});

		it("zero remainder: (a^2 - b^2)/(a - b) = a + b rem 0", () => {
			fc.assert(
				fc.property(
					arbConway2(arbFiniteBigint),
					arbConway2(arbFiniteBigint),
					(a, b) => {
						const p = a.mult(a).sub(b.mult(b));
						const k = a.length + b.length;
						fc.pre(!p.isZero);
						const sub = a.sub(b);
						const [q, r] = longDivisionIters(p, sub, k);
						expect(isZero(r)).toBe(true);
						expect(eq(q, a.add(b))).toBe(true);
					},
				),
			);
		});

		const leadingCoeff1 = (t: Conway) => t.length > 0 && t.leadingCoeff === 1n;
		it("add back check: a/b = q + r/b --> a = q b + r", () => {
			fc.assert(
				fc.property(
					arbConway2(arbFiniteBigint).filter(leadingCoeff1),
					arbConway2(arbFiniteBigint).filter(leadingCoeff1),
					fc.integer({ min: 1, max: 5 }),
					(a, b, k) => {
						const [q, r] = longDivisionIters(a, b, k);
						const addBack = add(mult(q, b), r);
						expect(eq(addBack, a)).toBe(true);
					},
				),
				{ numRuns: 200 },
			);
		});
	});

	describe("order and negativeOrder", () => {
		it("constants", () => {
			expect(zero.order).toBe(0);
			expect(one.order).toBe(0);
			expect(unit.order).toBe(1);
			expect(mono(1n, unit).order).toBe(2);
			expect(mono(1n, mono(1n, unit)).order).toBe(3);
		});
		it("order(negative) = 0", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFinite).filter(isNegative),
					(x) => x.order === 0,
				),
			);
		});

		it("order(finite) = 0", () => {
			fc.assert(fc.property(arbFinite.map(ensure), (x) => x.order === 0));
		});

		it("order(w^(R>0)) = 1", () => {
			fc.assert(
				fc.property(
					arbConway1(arbFinite).filter(isAboveReals),
					(x) => x.order === 1,
				),
			);
		});

		it("order(w^(w^(R>0))) = 2", () => {
			fc.assert(
				fc.property(
					arbConway1(arbFinite).filter(isAboveReals).map(mono1),
					(x) => x.order === 2,
				),
			);
		});

		it("order(c w^x) = order(x) + 1 if c > 0 and x > 1", () => {
			fc.assert(
				fc.property(
					arbConway3(arbFinite).filter((x) => gt(x, one)),
					arbFinite.filter(isPositive),
					(x, c) => mono(c, x).order === x.order + 1,
				),
			);
		});

		const tower = (n: number): Conway => (n <= 0 ? one : mono1(tower(n - 1)));
		it("x <= T(order(x) + 1) for power tower T(x)", () => {
			fc.assert(
				fc.property(arbConway3(arbFinite), (x) => lt(x, tower(x.order + 1))),
			);
		});

		it("if order(x) > 0, then order(-x) != 0", () => {
			fc.assert(
				fc.property(arbConway3(arbFinite), (x) => {
					fc.pre(x.order > 0);
					return x.order > 0 !== x.neg().order > 0;
				}),
			);
		});

		it("for x > 0, if order(x) = 0, then order(-x) = 0", () => {
			fc.assert(
				fc.property(arbConway3(arbFinite).filter(isPositive), (x) => {
					fc.pre(x.order === 0);
					return x.neg().order === 0;
				}),
			);
		});

		it("negativeOrder(x) = order(-x)", () => {
			fc.assert(
				fc.property(arbConway3(arbFinite), (x) => {
					return x.neg().order === x.negativeOrder;
				}),
			);
		});
	});

	describe("isPositiveInfinitesimal and isNegativeInfinitesimal", () => {
		it("isPositiveInfinitesimal --> equals to its infinitesimalPart", () => {
			fc.property(arbConway3(arbFinite).filter(isPositive), (x) => {
				fc.pre(x.isPositiveInfinitesimal);
				return eq(x, x.infinitesimalPart);
			});
		});

		it("isNegativeInfinitesimal --> equals to its infinitesimalPart", () => {
			fc.property(arbConway3(arbFinite).filter(isNegative), (x) => {
				fc.pre(x.isNegativeInfinitesimal);
				return eq(x, x.infinitesimalPart);
			});
		});

		it("both cannot be true at the same time", () => {
			fc.property(
				arbConway3(arbFinite),
				(x) => !(x.isPositiveInfinitesimal && x.isNegativeInfinitesimal),
			);
		});
	});
});

// Should type check
function testOrdinalInference() {
	const constantsOrd: [Ord, Ord, Ord] = [zero, one, unit];
	const zeroIsOrd: InferIsOrd<0> = true;
	const negOneIsNotOrd: InferIsOrd<-1> = false;
	const mono1NonOrd: Conway = mono1(2.5);
	// @ts-expect-error Cannot cast Conway to Ord
	const mono1NonOrdError: Ord = mono1(2.5);

	const mono1Ord: Ord = mono1(unit);
	const monoOrd: Ord = mono(1n, unit);
	const ensureOrd: Ord = ensure(mono1Ord);
	const maybeUnwrapOrd0: Ord0 = maybeUnwrap(mono1Ord);
	const addOrdLiteral: Ord0 = add(unit, 3n);
	const addOrd1: Ord0 = add(unit, monoOrd);
	// @ts-expect-error Not an ordinal
	const addNonOrdLiteral: Ord0 = add(unit, -3n);
	const multOrdLiteral: Ord0 = mult(unit, 3n);
	const multOrd1: Ord0 = mult(unit, monoOrd);
	console.log({
		constantsOrd,
		zeroIsOrd,
		negOneIsNotOrd,
		mono1NonOrd,
		mono1NonOrdError,
		monoOrd,
		mono1Ord,
		ensureOrd,
		maybeUnwrapOrd0,
		addOrdLiteral,
		addOrd1,
		addNonOrdLiteral,
		multOrdLiteral,
		multOrd1,
	});
}

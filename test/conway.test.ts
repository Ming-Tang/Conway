import fc from "fast-check";
import { Conway } from "../conway";
import type { Real } from "../conway";
import {
	propCommAssoc,
	propDist,
	propIdentity,
	propTotalOrder,
	propZero,
} from "./propsTest";
import {
	arbConway1,
	arbConway2,
	arbConway3,
	arbConway4,
	arbConway5,
	arbConwayReal,
	arbFiniteBigint,
	arbRealGeneral,
	arbFinite,
} from "./generators";

// fc.configureGlobal({ numRuns: 200000, verbose: false });

const ensureIncreasing = (x: Conway) => {
	const es = [...x].map((c) => c[0]);
	fc.pre(es.length >= 2);
	for (let i = 0; i < es.length - 1; i++) {
		const a = es[i];
		const b = es[i + 1];
		if (!Conway.gt(a, b)) {
			return false;
		}
	}
	return true;
};

const ensureSimplified = (x: Conway) => {
	const f = (x: Conway | Real, root: boolean) => {
		if (!(x instanceof Conway)) {
			return true;
		}

		if (!root && x instanceof Conway && x.realValue !== null) {
			return false;
		}

		for (const [p, c] of x) {
			if (Conway.isZero(c)) {
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
			expect(Conway.zero.eq(Conway.mono(0, 0))).toBe(true);
			expect(Conway.mono(0n, 0n).eq(Conway.mono(0, 0))).toBe(true);
		});

		it("0 + 0 = 0", () => {
			expect(Conway.zero.add(Conway.zero).eq(Conway.zero)).toBe(true);
			expect(Conway.zero.add(Conway.real(0)).eq(Conway.zero)).toBe(true);
			expect(Conway.zero.add(Conway.real(0n)).eq(Conway.zero)).toBe(true);
			expect(Conway.zero.add(Conway.zero).eq(Conway.real(0n))).toBe(true);
			expect(Conway.zero.add(Conway.zero).eq(Conway.real(0))).toBe(true);
		});

		it("1 + 0 = 1", () => {
			expect(Conway.one.add(Conway.zero).eq(Conway.one)).toBe(true);
			expect(Conway.zero.add(Conway.one).eq(Conway.one)).toBe(true);
		});

		it("1 * 0 = 0", () => {
			expect(Conway.one.mult(Conway.zero).eq(Conway.zero)).toBe(true);
			expect(Conway.zero.mult(Conway.one).eq(Conway.zero)).toBe(true);
		});

		it("1 * 1 = 1", () => {
			expect(Conway.one.mult(Conway.zero).eq(Conway.zero)).toBe(true);
			expect(Conway.one.mult(Conway.one).eq(Conway.one)).toBe(true);
		});

		it("0 * w = 0", () => {
			expect(Conway.unit.mult(Conway.zero).eq(Conway.zero)).toBe(true);
			expect(Conway.zero.mult(Conway.unit).eq(Conway.zero)).toBe(true);
		});

		it("1 * w = w", () => {
			expect(Conway.unit.mult(Conway.one).eq(Conway.unit)).toBe(true);
			expect(Conway.one.mult(Conway.unit).eq(Conway.unit)).toBe(true);
		});

		it("0 and 1 have real value", () => {
			expect(Conway.zero.realValue).toBe(0n);
			expect(Conway.one.realValue).toBe(1n);
		});

		it("w has no real value", () => {
			expect(Conway.unit.realValue).toBeNull();
		});

		it("0, 1, w are simplified", () => {
			expect(ensureSimplified(Conway.zero)).toBe(true);
			expect(ensureSimplified(Conway.one)).toBe(true);
			expect(ensureSimplified(Conway.unit)).toBe(true);
		});

		it("gt", () => {
			expect(Conway.gt(2, 0)).toBe(true);
			expect(Conway.gt(2n, 0)).toBe(true);
			expect(Conway.gt(2, 0n)).toBe(true);
			expect(Conway.gt(0, 2)).toBe(false);
			expect(Conway.gt(2, 1)).toBe(true);
			expect(Conway.gt(1, 2)).toBe(false);
			expect(Conway.gt(Conway.zero, Conway.zero)).toBe(false);
			expect(Conway.gt(Conway.one, Conway.zero)).toBe(true);
			expect(Conway.gt(Conway.zero, Conway.one)).toBe(false);
			expect(Conway.gt(Conway.unit, Conway.one)).toBe(true);
			expect(Conway.gt(Conway.one, Conway.unit)).toBe(false);
		});
	});

	describe("zeros", () => {
		it("should be true for zero monomials", () => {
			expect(Conway.zero.isZero).toBe(true);
			expect(Conway.mono(0n, 0n).isZero).toBe(true);
			expect(Conway.mono(0, 0).isZero).toBe(true);
			expect(new Conway([[0n, 0n]]).isZero).toBe(true);
			expect(
				new Conway([
					[0n, -2n],
					[0n, 2n],
				]),
			).toHaveLength(0);
		});

		it("should have zero length", () => {
			expect(Conway.zero).toHaveLength(0);
			expect(Conway.mono(0n, 0n)).toHaveLength(0);
			expect(Conway.mono(0, 0)).toHaveLength(0);
			expect(new Conway([[0n, 0n]])).toHaveLength(0);
			expect(
				new Conway([
					[0n, -2n],
					[0n, 2n],
				]),
			).toHaveLength(0);
		});
	});

	describe("specific tests", () => {
		it("4^4 times 1", () => {
			const v = Conway.mono(4n, 4n);
			const v1 = v.mult(Conway.one);
			expect(v.eq(v1)).toBe(true);
			expect(v.compare(v1)).toEqual(0);
		});

		it("-w^(-w)", () => {
			const v = Conway.mono(-1n, Conway.mono(-1n, 1n));
			expect(v.mult(Conway.one).eq(v)).toBe(true);
			expect(Conway.one.mult(v).eq(v)).toBe(true);
			expect(Conway.eq(Conway.mult(Conway.one, v), v)).toBe(true);
			expect(Conway.eq(Conway.mult(v, Conway.one), v)).toBe(true);
		});
	});

	describe("constants (different number types)", () => {
		it("0 = 0n", () => {
			expect(Conway.real(0).eq(Conway.real(0n))).toBe(true);
		});

		it("1.0 = 1n", () => {
			expect(Conway.real(1.0).eq(Conway.real(1n))).toBe(true);
		});

		it("0 < 1", () => {
			expect(Conway.lt(Conway.real(0), Conway.real(1n))).toBe(true);
			expect(Conway.lt(Conway.real(0n), Conway.real(1))).toBe(true);
		});
	});

	// TODO doesn't work
	describe.skip("derivative", () => {
		it("real' = 0", () => {
			expect(Conway.zero.derivative().eq(Conway.zero)).toBe(true);
			expect(Conway.one.derivative().eq(Conway.zero)).toBe(true);
			expect(Conway.real(-4.0).derivative().eq(Conway.zero)).toBe(true);
		});

		it("w' = 1", () => {
			expect(Conway.unit.derivative().eq(Conway.one)).toBe(true);
		});

		it("(w^2)' = 2w", () => {
			expect(
				Conway.unit.mult(Conway.unit).derivative().eq(Conway.unit.mult(2)),
			).toBe(true);
		});

		it("((w+1)^2)' = 2(w+1)", () => {
			const a = Conway.unit.add(Conway.one);
			expect(a.mult(a).derivative().eq(a.mult(2))).toBe(true);
		});

		it("(w^5)' = 5 w^4", () => {
			expect(Conway.mono(1, 5).derivative().eq(Conway.mono(5, 4))).toBe(true);
		});

		it("(w^-3.5)' = -3.5 w^-4.5", () => {
			expect(
				Conway.mono(1, -3.5).derivative().eq(Conway.mono(-3.5, -4.5)),
			).toBe(true);
		});

		describe("exponential", () => {
			for (const { x, expX } of [
				{ x: Conway.mono(1, Conway.inverseUnit), expX: Conway.unit },
				{ x: Conway.unit, expX: Conway.expUnit },
				{
					x: Conway.unit.mult(Conway.logUnit),
					expX: Conway.mono(
						1,
						Conway.mono(1, Conway.add(Conway.one, Conway.inverseUnit)),
					),
				},
			]) {
				it(`x=${x}, exp(x)=${expX}`, () => {
					// exp(w^x) = w^w^x for infinite x and below epsilon_0
					const l = expX.derivative();
					const r = expX.mult(x.derivative());
					if (!l.eq(r)) {
						throw new Error(
							`not equal, x=${x}, exp(x)=${expX}, exp(x)'=${l}, exp(x) x'=${r}`,
						);
					}
					expect(l.eq(r));
				});
			}
		});
	});

	describe.skip("sample values", () => {
		const arbSampleReal = fc.bigInt({ min: -5n, max: 5n });
		it("No1 = R[[w^R]]", () => {
			for (const s of fc.sample(arbConway1(arbSampleReal, { maxLength: 5 }), {
				seed: 1,
				numRuns: 10,
			})) {
				console.log(s.toString());
			}
		});

		it("No2 = R[[w^No1]]", () => {
			for (const s of fc.sample(arbConway2(arbSampleReal, { maxLength: 3 }), {
				seed: 1,
				numRuns: 10,
			})) {
				console.log(s.toString());
			}
		});

		it("No3 = R[[w^No2]]", () => {
			for (const s of fc.sample(arbConway3(arbSampleReal, { maxLength: 3 }), {
				seed: 1,
				numRuns: 10,
			})) {
				console.log(s.toString());
			}
		});

		it("No4 = R[[w^No3]]", () => {
			for (const s of fc.sample(arbConway4(arbSampleReal, { maxLength: 3 }), {
				seed: 1,
				numRuns: 10,
			})) {
				console.log(s.toString());
			}
		});

		it("No5 = R[[w^No4]]", () => {
			for (const s of fc.sample(arbConway5(arbSampleReal, { maxLength: 3 }), {
				seed: 1,
				numRuns: 10,
			})) {
				console.log(s.toString());
			}
		});
	});

	const arithProps = (
		arb: fc.Arbitrary<Conway>,
		skip = false,
		numRuns?: number,
	) => {
		(skip ? describe.skip : describe)("arithmetic", () => {
			describe("add", () => {
				propIdentity(it, arb, Conway.zero, Conway.add, Conway.eq, { numRuns });
				propCommAssoc(it, arb, Conway.add, Conway.eq, { numRuns });

				it("static method is equivalent to instance method ", () => {
					fc.assert(
						fc.property(arb, arb, (x, y) =>
							Conway.eq(x.add(y), Conway.add(x, y)),
						),
						{ numRuns },
					);
				});
			});

			describe("mult", () => {
				propIdentity(it, arb, Conway.one, Conway.mult, Conway.eq, { numRuns });
				propZero(it, arb, Conway.zero, Conway.mult, Conway.eq, { numRuns });
				propCommAssoc(it, arb, Conway.mult, Conway.eq, { numRuns });

				it("static method is equivalent to instance method ", () => {
					fc.assert(
						fc.property(arb, arb, (x, y) =>
							Conway.eq(x.mult(y), Conway.mult(x, y)),
						),
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
						fc.property(arb, (x) => Conway.eq(x, x.neg().neg())),
						{ numRuns },
					);
				});

				it("static method is equivalent to instance method ", () => {
					fc.assert(
						fc.property(arb, (x) => Conway.eq(x.neg(), Conway.neg(x))),
						{ numRuns },
					);
				});
			});

			describe("sub", () => {
				it("a - 0 = a", () => {
					fc.assert(
						fc.property(arb, (a) => a.sub(Conway.zero).eq(a)),
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
						fc.property(arb, (a) => Conway.zero.sub(a).eq(a.neg())),
						{ numRuns },
					);
				});

				it("static method is equivalent to instance method ", () => {
					fc.assert(
						fc.property(arb, arb, (x, y) =>
							Conway.eq(x.sub(y), Conway.sub(x, y)),
						),
						{ numRuns },
					);
				});
			});

			describe("distributive", () => {
				propDist(it, arb, Conway.add, Conway.mult, Conway.eq, { numRuns });
			});
		});
	};

	const derivProps = (
		arb: fc.Arbitrary<Conway>,
		skip = false,
		numRuns?: number,
	) => {
		(skip ? describe.skip : describe)("derivative", () => {
			it("sum rule", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) =>
						x.add(y).derivative().eq(x.derivative().add(y.derivative())),
					),
					{ numRuns },
				);
			});

			it("product rule", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => {
						const l = x.mult(y).derivative();
						const r = x.derivative().mult(y).add(x.mult(y.derivative()));
						// if (!l.eq(r)) {
						// 	throw new Error(`not equal, xy=${x.mult(y)}, xy'=${l}, pr=${r}`);
						// }
						return l.eq(r);
					}),
					{ numRuns },
				);
			});
		});
	};

	const eqProps = (arb: fc.Arbitrary<Conway>, skip = false) => {
		const d = skip ? describe.skip : describe;
		d("eq", () => {
			it("negation of ne", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => Conway.eq(x, y) === !Conway.ne(x, y)),
				);
			});

			it("same as compare (self)", () => {
				fc.assert(
					fc.property(
						arb,
						(x) => Conway.eq(x, x) && Conway.compare(x, x) === 0,
					),
				);
			});

			it("same as compare (different)", () => {
				fc.assert(
					fc.property(
						arb,
						arb,
						(x, y) => Conway.eq(x, y) === (Conway.compare(x, y) === 0),
					),
				);
			});

			it("static method is equivalent to instance method ", () => {
				fc.assert(fc.property(arb, arb, (x, y) => Conway.eq(x, y) === x.eq(y)));
			});
		});

		d("eqHash", () => {
			it("different hash implies not equals", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => {
						fc.pre(x.eqHash !== y.eqHash);
						return Conway.ne(x, y);
					}),
				);
			});
		});

		d("ordHash", () => {
			it("different hash implies not equals", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => {
						fc.pre(x.ordHash !== y.ordHash);
						return Conway.ne(x, y);
					}),
				);
			});

			it("less than in ordHash implies less than", () => {
				fc.assert(
					fc.property(arb, arb, (x, y) => {
						fc.pre(x.ordHash < y.ordHash);
						return Conway.lt(x, y);
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
			propTotalOrder(it, arb, Conway.compare, Conway.eq);

			it("equal real vs. power zero", () => {
				fc.assert(
					fc.property(arbRealGeneral, (a) => {
						return Conway.eq(Conway.real(a), Conway.mono(a, Conway.zero));
					}),
				);
			});

			it("equal real vs. Conway.real", () => {
				fc.assert(
					fc.property(arbRealGeneral, (a) => {
						return Conway.eq(Conway.real(a), a);
					}),
				);
			});

			it("greater than with Conway.real", () => {
				fc.assert(
					fc.property(arbFiniteBigint, arbFiniteBigint, (a, b) => {
						return (
							Conway.compare(Conway.real(a), Conway.real(b)) > 0 === b - a > 0n
						);
					}),
				);
			});

			it("greater than", () => {
				fc.assert(
					fc.property(arbFinite, arbFinite, (a, b) => {
						return Conway.gt(a, b) === a > b;
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
						Conway.ensure(v).ordHash < 0n === v < 0;
					}),
				);
			});

			it("reals >= 0", () => {
				fc.assert(
					fc.property(arbFinite, (v) => {
						Conway.ensure(v).ordHash >= 0n === v >= 0;
					}),
				);
			});

			it("preserves ordering", () => {
				fc.assert(
					fc.property(arbFinite, arbFinite, (a, b) => {
						Conway.le(Conway.ensure(a).ordHash, Conway.ensure(b).ordHash) ===
							a <= b;
					}),
				);
			});
		});

		describe("add", () => {
			it("with zero", () => {
				fc.assert(
					fc.property(arbFiniteBigint, (a) => {
						return Conway.eq(Conway.real(a).add(Conway.zero), Conway.real(a));
					}),
				);
			});

			it("bigint", () => {
				fc.assert(
					fc.property(arbFiniteBigint, arbFiniteBigint, (a, b) => {
						return Conway.eq(
							Conway.real(a).add(Conway.real(b)),
							Conway.real(a + b),
						);
					}),
				);
			});

			it("number", () => {
				fc.assert(
					fc.property(arbFinite, arbFinite, (a, b) => {
						return Conway.eq(
							Conway.real(a).add(Conway.real(b)),
							Conway.real(a + b),
						);
					}),
				);
			});
		});

		describe("mult", () => {
			it("by zero", () => {
				fc.assert(
					fc.property(arbFinite, (a) => {
						return Conway.eq(Conway.real(a).mult(Conway.zero), Conway.real(0));
					}),
				);
			});

			it("by one", () => {
				fc.assert(
					fc.property(arbFinite, (a) => {
						return Conway.eq(Conway.real(a).mult(Conway.one), Conway.real(a));
					}),
				);
			});

			it("bigint", () => {
				fc.assert(
					fc.property(arbFiniteBigint, arbFiniteBigint, (a, b) => {
						return Conway.eq(
							Conway.real(a).mult(Conway.real(b)),
							Conway.real(a * b),
						);
					}),
				);
			});

			it("number", () => {
				fc.assert(
					fc.property(arbFinite, arbFinite, (a, b) => {
						return Conway.eq(
							Conway.real(a).mult(Conway.real(b)),
							Conway.real(a * b),
						);
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
			propTotalOrder(it, arb, Conway.compare, Conway.eq);
		});

		eqProps(arb);
		//derivProps(arb);
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
			propTotalOrder(it, arb, Conway.compare, Conway.eq);
		});

		eqProps(arb);
		//derivProps(arb);
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
			propTotalOrder(it, arb, Conway.compare, Conway.eq);
		});

		eqProps(arb);
		//derivProps(arb);
		arithProps(arb, false, 100);
	});

	describe("divRem", () => {
		describe("examples", () => {
			let k = 0;
			let a: Conway;
			let b: Conway;
			let expected: [Conway | Real, Real][];

			beforeEach(() => {
				k = 0;
				a = Conway.zero;
				b = Conway.zero;
				expected = [];
			});

			// taken from https://mathoverflow.net/a/224694
			it("1/(w+1)", () => {
				a = Conway.one;
				b = Conway.unit.add(Conway.one);
				expected = Array(k)
					.fill(null)
					.map((_, i) => [BigInt(-i - 1), i % 2 === 0 ? 1n : -1n]);
			});

			it("1/(w+2)", () => {
				a = Conway.one;
				b = Conway.unit.add(Conway.real(2n));
				expected = Array(k)
					.fill(null)
					.map((_, i) => [
						BigInt(-i - 1),
						(i % 2 === 0 ? 1n : -1n) * (1n << BigInt(i)),
					]);
			});

			it("(2w-1)/(w-1)^2", () => {
				a = Conway.mono(2, 1).sub(Conway.one);
				const b1 = Conway.unit.sub(Conway.one);
				b = b1.mult(b1);
				expected = Array(k)
					.fill(null)
					.map((_, i) => [BigInt(-i - 1), BigInt(i + 2)]);
			});

			it("(w^3-2w^2-4)/(w-3)", () => {
				k = 3;
				a = new Conway([
					[3n, 1n],
					[2n, -2n],
					[0n, -4n],
				]);
				b = new Conway([
					[1n, 1n],
					[0n, -3n],
				]);
				expected = [
					[2n, 1],
					[1n, 1],
					[0n, 3],
				];
			});

			afterEach(() => {
				if (!k) {
					return;
				}

				const [q] = a.divRemIters(b, k);
				expect([...Conway.ensure(q)]).toEqual(expected);
			});
		});

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
					const [_, r] = a.divRemIters(b, 1);
					const lp = a.leadingPower;
					fc.pre(lp !== null);
					fc.pre(r instanceof Conway);
					expect(Conway.isZero(r.get(lp))).toBe(true);
				}),
				{ numRuns: 100 },
			);
		});

		it("zero remainder: a b / b = a rem 0", () => {
			fc.assert(
				fc.property(arbDivisible(arbConway2(arbFiniteBigint)), ([a, b]) => {
					const ab = a.mult(b);
					const k = a.length + b.length;
					const [q, r] = ab.divRemIters(b, k);
					expect(r.isZero).toBe(true);
					expect(Conway.eq(q, a)).toBe(true);
				}),
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
						const [q, r] = p.divRemIters(sub, k);
						expect(r.isZero).toBe(true);
						expect(Conway.eq(q, a.add(b))).toBe(true);
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
						const [q, r] = a.divRemIters(b, k);
						const addBack = Conway.add(Conway.mult(q, b), r);
						expect(Conway.eq(addBack, a)).toBe(true);
					},
				),
				{ numRuns: 200 },
			);
		});
	});
});

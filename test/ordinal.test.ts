import fc from "fast-check";
import "./expect.test";
import { Conway, type Ord, type Ord0 } from "../conway";
import {
	ensure as conwayEnsure,
	create,
	fromReal,
	isMono,
	one,
	unit,
	zero,
} from "../op";
import { eq, ge, gt, isAboveReals, isPositive, isZero, le, lt } from "../op";
import {
	canon,
	ordinalEnsure as ensure,
	isLimit,
	isOrdinal,
	isSucc,
	ordinalMono as mono,
	ordinalMono1 as mono1,
	noSucc,
	ordinalAdd,
	ordinalDivRem,
	ordinalMult,
	ordinalPow,
	ordinalRightSub,
	pred,
	succ,
} from "../op/ordinal";
import { type Real, realToBigint } from "../real";
import {
	arbFiniteBigint,
	arbFiniteBigintOrd,
	arbOrd2,
	arbOrd3,
} from "./generators";

fc.configureGlobal({ numRuns: 2000 });

const propUnwrapPreserve =
	(f: (a: Ord0, b: Ord0) => Ord0) =>
	(a: bigint, b: bigint): boolean =>
		typeof f(a, b) === "bigint";

describe("ordinals", () => {
	describe("ordinalAdd", () => {
		it("constants", () => {
			expect(zero.ordinalAdd(unit).eq(unit));
			expect(unit.ordinalAdd(one).eq(unit.ordinalAdd(one)));
			expect(one.ordinalAdd(unit).eq(unit));
		});

		it("any ordinal ordinalAdd zero", () => {
			fc.assert(fc.property(arbOrd3, (a) => a.ordinalAdd(zero).eq(a)));
		});
		it("zero ordinalAdd any ordinal", () => {
			fc.assert(fc.property(arbOrd3, (a) => zero.ordinalAdd(a).eq(a)));
		});

		it("ordinalAdd result is ordinal", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) => a.ordinalAdd(b).isOrdinal),
			);
		});

		it("increasing", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) => ge(a.ordinalAdd(b), a)),
			);
		});

		it("strictly increasing (<) on right argument", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, arbOrd3, (a, b, c) => {
					fc.pre(lt(a, b));
					return lt(c.ordinalAdd(a), c.ordinalAdd(b));
				}),
			);
		});

		it("increasing (<=) on right argument", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, arbOrd3, (a, b, c) => {
					fc.pre(lt(a, b));
					return le(a.ordinalAdd(c), b.ordinalAdd(c));
				}),
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) =>
					eq(a.ordinalAdd(b), ordinalAdd(a, b)),
				),
			);
		});
	});

	describe("ordinalRightSub", () => {
		it("constants", () => {
			expect(eq(ordinalRightSub(zero, zero), zero)).toBe(true);
			expect(eq(ordinalRightSub(zero, one), one)).toBe(true);
			expect(eq(ordinalRightSub(one, one), zero)).toBe(true);
			expect(eq(ordinalRightSub(one, unit), unit)).toBe(true);
			expect(eq(ordinalRightSub(one, unit.add(one)), unit.add(one))).toBe(true);
			expect(eq(ordinalRightSub(unit, unit), zero)).toBe(true);
		});

		it("constant (w + finite)", () => {
			const lhs = unit.add(3n);
			const large = unit.add(5n);
			const d = lhs.ordinalRightSub(large);
			expect(d).conwayEq(2n);
		});

		it("ordinalRightSub equal value", () => {
			fc.assert(fc.property(arbOrd3, (a) => a.ordinalRightSub(a).isZero));
		});

		it("ordinalRightSub result is ordinal", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) => {
					fc.pre(ge(b, a));
					return a.ordinalRightSub(b).isOrdinal;
				}),
			);
		});

		it("ordinalRightSub result can be added back (with self)", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => {
					const c = a.ordinalRightSub(a);
					return a.ordinalAdd(c).eq(a);
				}),
			);
		});

		it("ordinalRightSub result can be added back (ordinal plus finite)", () => {
			const arbOrdPlusFinite = fc
				.tuple(arbOrd3, arbFiniteBigintOrd)
				.map(([x, v]) => x.add(v)) as fc.Arbitrary<Ord>;
			fc.assert(
				fc.property(arbOrdPlusFinite, arbOrdPlusFinite, (a, b) => {
					fc.pre(gt(b, a));
					const c = a.ordinalRightSub(b);
					return a.ordinalAdd(c).eq(b);
				}),
			);
		});

		it("ordinalRightSub result can be added back", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) => {
					fc.pre(gt(b, a));
					const c = a.ordinalRightSub(b);
					return a.ordinalAdd(c).eq(b);
				}),
			);
		});

		it("static method is equivalent to instance method", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, (a, b) => {
					fc.pre(ge(b, a));
					return eq(a.ordinalRightSub(b), ordinalRightSub(a, b));
				}),
			);
		});
	});

	describe("ordinalMult", () => {
		it("constants", () => {
			expect(ordinalMult(one, one)).conwayEq(one);
			expect(ordinalMult(one, unit)).conwayEq(unit);
			expect(ordinalMult(unit, unit)).conwayEq(unit.mult(unit));
		});

		it("constants (absorbing)", () => {
			expect(ordinalMult(2n, unit)).conwayEq(unit);
			expect(ordinalMult(3n, unit.add(1n))).conwayEq(unit.add(3n));
			expect(ordinalMult(unit.add(3n), 5n)).conwayEq(unit.mult(5n).add(3n));
		});

		it("constants (assoc)", () => {
			expect(ordinalMult(unit, 2n)).conwayEq(unit.mult(2n));
			expect(ordinalMult(ordinalMult(unit, 2n), unit)).conwayEq(
				unit.mult(unit),
			);
			expect(ordinalMult(unit, ordinalMult(2n, unit))).conwayEq(
				unit.mult(unit),
			);
			// w.(2.(w + 1)) = w.(w + 2) = w^2 + w.2
			expect(ordinalMult(unit, ordinalMult(2n, unit.add(1n)))).conwayEq(
				unit.mult(unit).add(unit.mult(2n)),
			);
			// (w.2).(w + 1) = (w.2).w + (w.2).1 = w^2 + w.2
			expect(unit.mult(2n).ordinalMult(unit.add(1n))).conwayEq(
				unit.mult(unit).add(unit.mult(2n)),
			);
		});

		it("constants (distr)", () => {
			// (w + 1)(w + 1) = (w+1).w + (w+1).1
			// = w^2 + w + 1
			expect(unit.add(1n).ordinalMult(unit.add(1n))).conwayEq(
				unit.mult(unit).add(unit).add(1n),
			);
		});

		it("left zero", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => {
					expect(ordinalMult(zero, a)).conwayEq(zero);
				}),
			);
		});

		it("right zero", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => {
					expect(ordinalMult(a, zero)).conwayEq(zero);
				}),
			);
		});

		it("left identity", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => {
					expect(ordinalMult(one, a)).conwayEq(a);
				}),
			);
		});

		it("right identity", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => {
					expect(ordinalMult(a, one)).conwayEq(a);
				}),
			);
		});

		it("result must be ordinal", () => {
			fc.assert(
				fc.property(
					arbOrd3.filter(isPositive),
					arbOrd3.filter(isPositive),
					(a, b) => isOrdinal(ordinalMult(a, b)),
				),
			);
		});

		it("finite * w = w", () => {
			fc.assert(
				fc.property(fc.integer({ min: 1 }), (x) => {
					expect(ordinalMult(fromReal(x) as Ord, unit)).toEqual(unit);
				}),
			);
		});

		it("increasing", () => {
			fc.assert(
				fc.property(
					arbOrd3.filter(isPositive),
					arbOrd3.filter(isPositive),
					(a, b) => ge(ordinalMult(a, b), a),
				),
			);
		});

		const arbFinite = fc.integer({ min: 1, max: 32 });
		describe("finite absorption", () => {
			it("(pure infinite + finite) * pure infinite = pure infinite * pure infinite", () => {
				fc.assert(
					fc.property(
						arbOrd3,
						arbOrd3.map((x) => x.infinitePart),
						(a, b) => {
							expect(ordinalMult(a.infinitePart, b)).conwayEq(
								ordinalMult(a.infinitePart, b),
							);
						},
					),
				);
			});

			it("left absorption of finite * pure infinite", () => {
				fc.assert(
					fc.property(
						arbFinite,
						arbOrd3.map((x) => x.infinitePart),
						(n, a) => {
							expect(ordinalMult(fromReal(n) as Ord, a)).conwayEq(a);
						},
					),
				);
			});
		});

		const arbs: [fc.Arbitrary<Ord0>, string][] = [
			[arbFinite, "finite"],
			[arbOrd3, "infinite"],
		];
		const arb3s: [
			fc.Arbitrary<Ord0>,
			fc.Arbitrary<Ord0>,
			fc.Arbitrary<Ord0>,
			string,
		][] = [];
		for (const [arb0, name0] of arbs) {
			for (const [arb1, name1] of arbs) {
				for (const [arb2, name2] of arbs) {
					const title =
						name0 === "infinite" && name1 === "infinite" && name2 === "infinite"
							? "(general)"
							: `(${name0}, ${name1}, ${name2})`;
					arb3s.push([arb0, arb1, arb2, title]);
				}
			}
		}

		describe("left distributive: a*(b+c) = a*b + a*c", () => {
			for (const [arb0, arb1, arb2, title] of arb3s) {
				it(title, () => {
					fc.assert(
						fc.property(arb0, arb1, arb2, (a, b, c) => {
							expect(ordinalMult(a, ordinalAdd(b, c))).conwayEq(
								ordinalAdd(ordinalMult(a, b), ordinalMult(a, c)),
							);
						}),
					);
				});
			}
		});

		describe("associative: (a*b)*c = a*(b*c)", () => {
			for (const [arb0, arb1, arb2, title] of arb3s) {
				it(title, () => {
					fc.assert(
						fc.property(arb0, arb1, arb2, (a, b, c) => {
							expect(ordinalMult(ordinalMult(a, b), c)).conwayEq(
								ordinalMult(a, ordinalMult(b, c)),
							);
						}),
					);
				});
			}
		});

		it("is repeated addition for finite multipliers", () => {
			fc.assert(
				fc.property(arbOrd3, fc.integer({ min: 1, max: 32 }), (a, n) => {
					let sum: Ord0 = zero;
					for (let i = 0; i < n; i++) {
						sum = ordinalAdd(sum, a);
					}

					expect(ordinalMult(a, fromReal(n) as Ord)).conwayEq(sum);
				}),
			);
		});

		it("returns unwrapped if both parameters are unwrapped", () => {
			fc.assert(
				fc.property(
					arbFiniteBigintOrd,
					arbFiniteBigintOrd,
					propUnwrapPreserve(ordinalMult),
				),
			);
		});
	});

	describe("ordinalPow", () => {
		describe("constants", () => {
			it("finite^finite", () => {
				expect(ordinalPow(1n, 1n)).conwayEq(1n);
				expect(ordinalPow(2n, 0n)).conwayEq(1n);
				expect(ordinalPow(2n, 4n)).conwayEq(1n << 4n);
				expect(ordinalPow(3n, 5n)).conwayEq(3n ** 5n);
			});

			it("finite^infinite", () => {
				expect(ordinalPow(1n, unit)).conwayEq(1n);
				expect(ordinalPow(2n, unit)).conwayEq(unit);
				// 2^(w^2)
				// = limit {2^w, 2^(w.2), 2^(w.3), ...}
				// = limit {2^w, (2^w)^2, (2^w)^3, ...}
				// = limit {w, w^2, w^3, ...}
				// = w^w
				expect(ordinalPow(2n, mono1(2n))).conwayEq(mono1(unit));
				// 2^((w^5).6 + 3)
				// = [2^(w.w^4)]^6 . 2^3
				// = [w^(w^4)]^6 . 8
				// = w^[(w^4).6] . 8
				expect(ordinalPow(2n, mono(6n, 5n).add(3n))).conwayEq(
					mono(8n, mono(6n, 4n)),
				);
			});

			it("infinite^infinite", () => {
				expect(ordinalPow(unit, unit.add(1n))).conwayEq(mono1(unit.add(1n)));
			});
		});

		it("0^a = 0, a > 0", () => {
			fc.assert(
				fc.property(arbOrd3.filter(isPositive), (a) => {
					expect(ordinalPow(zero, a)).conwayEq(zero);
				}),
			);
		});

		it("1^a = 1", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => {
					expect(ordinalPow(one, a)).conwayEq(one);
				}),
			);
		});

		it("x^y for finite x, y", () => {
			fc.assert(
				fc.property(arbFiniteBigintOrd, arbFiniteBigintOrd, (a, b) => {
					fc.pre(!(a === 0n && b === 0n));
					expect(a ** b).conwayEq(ordinalPow(a, b));
				}),
			);
		});

		const arbOrd3Pos = arbOrd3.filter(isPositive);

		it("non-zero", () => {
			fc.assert(
				fc.property(arbOrd3Pos, arbOrd3Pos, (x, y) =>
					isPositive(ordinalPow(x, y)),
				),
				{ numRuns: 200 },
			);
		});

		it("finite exponent is repeated multiplication", () => {
			fc.assert(
				fc.property(
					arbOrd3Pos,
					arbFiniteBigintOrd.filter((x) => x < 6n),
					(a, p) => {
						fc.pre(p > 0n);
						let fromMult: Ord0 = one;
						for (let i = 0n; i < p; i += 1n) {
							fromMult = ordinalMult(fromMult, a);
						}
						expect(ordinalPow(a, p)).conwayEq(fromMult);
					},
				),
				{ numRuns: 50 },
			);
		});

		const maxReal = (x: Conway, acc: Real = 0n): Real => {
			let max = acc;
			for (const [p, c] of x) {
				if (p instanceof Conway) {
					max = maxReal(p, max);
				} else if (p > max) {
					max = p;
				}
				if (c > max) {
					max = c;
				}
			}
			return max;
		};

		const arbs: [string, fc.Arbitrary<Ord>][] = [
			["finite", arbFiniteBigint.filter(isPositive).map(ensure)],
			[
				"infinite",
				fc.oneof(
					arbOrd2
						.filter(isAboveReals)
						.filter((x) => realToBigint(maxReal(x)) < 5n),
					arbOrd3Pos
						.filter(isAboveReals)
						.filter((x) => realToBigint(maxReal(x)) < 4n),
				),
			],
		];
		const combs: [
			string,
			fc.Arbitrary<Ord>,
			fc.Arbitrary<Ord>,
			fc.Arbitrary<Ord>,
		][] = [];
		for (const [name1, arb1] of arbs) {
			for (const [name2, arb2] of arbs) {
				for (const [name3, arb3] of arbs) {
					combs.push([`a=${name1}, b=${name2}, c=${name3}`, arb1, arb2, arb3]);
				}
			}
		}

		describe("monomials: (w^x).c", () => {
			it("w^finite", () => {
				fc.assert(
					fc.property(arbFiniteBigintOrd, (x) => {
						expect(ordinalPow(unit, x)).conwayEq(mono1(x));
					}),
				);
			});

			it("w^x", () => {
				fc.assert(
					fc.property(arbOrd3Pos, (x) => {
						expect(ordinalPow(unit, x)).conwayEq(mono1(x));
					}),
				);
			});

			it("((w^x).c)^y = w^(x.y) for limit y", () => {
				fc.assert(
					fc.property(
						arbOrd3Pos,
						arbFiniteBigintOrd.filter(isPositive),
						arbOrd3Pos.filter(isLimit),
						(x, c, y) => {
							expect(ordinalPow(mono(c, x), y)).conwayEq(
								mono1(ordinalMult(x, y)),
							);
						},
					),
				);
			});

			it("((w^x).c)^y = w^(x.y).c for successor y", () => {
				fc.assert(
					fc.property(
						arbOrd3Pos,
						arbFiniteBigintOrd.filter(isPositive),
						arbOrd3Pos.filter(isSucc),
						(x, c, y) => {
							expect(ordinalPow(mono(c, x), y)).conwayEq(
								mono(c, ordinalMult(x, y)),
							);
						},
					),
				);
			});
		});

		describe("combinations", () => {
			const numRuns = 30;
			for (const [name1, arb1, arb2, arb3] of combs) {
				describe(`(${name1})`, () => {
					it("preserves order for same base different exponents: b <= c implies a^b <= a^c", () => {
						fc.assert(
							fc.property(arb1, arb2, arb3, (a, b, c) => {
								if (le(b, c)) {
									return le(ordinalPow(a, b), ordinalPow(a, c));
								}
								return le(ordinalPow(a, c), ordinalPow(a, b));
							}),
							{ numRuns },
						);
					});

					it("law of exponents (addition of exponents): a^b . a^c = a^(b+c)", () => {
						fc.assert(
							fc.property(arb1, arb2, arb3, (a, b, c) => {
								expect(
									ordinalMult(ordinalPow(a, b), ordinalPow(a, c)),
								).conwayEq(ordinalPow(a, ordinalAdd(b, c)));
							}),
							{ numRuns },
						);
					});
				});
			}
		});

		it("law of exponents (multiplication of exponents): (a^b)^c = a^(b.c)", () => {
			fc.assert(
				fc.property(arbOrd3, arbOrd3, arbOrd3, (a, b, c) => {
					expect(ordinalPow(ordinalPow(a, b), c)).conwayEq(
						ordinalPow(a, ordinalMult(b, c)),
					);
				}),
				{ numRuns: 50 },
			);
		});

		it("returns unwrapped if both parameters are unwrapped", () => {
			fc.assert(
				fc.property(
					arbFiniteBigintOrd,
					arbFiniteBigintOrd,
					propUnwrapPreserve(ordinalPow),
				),
			);
		});
	});

	describe("ordinalDivRem", () => {
		const checkDivRem = (n: Ord0, d: Ord0, q: Ord0, r: Ord0) => {
			if (!(isAboveReals(n) && !isAboveReals(d)) && le(d, r)) {
				throw new Error(
					`remainder is too large. n=${n}, q=${q}, d=${d}, r=${r}`,
				);
			}
			const backAdd = ordinalAdd(ordinalMult(d, q), r);
			expect(n).conwayEq(backAdd);
		};

		const propDivRem = (n: Ord0, d: Ord0) => {
			fc.pre(!isZero(d));
			const [q, r] = ordinalDivRem(n, d);
			//console.log(`(${n}) / (${d}) = ${q} rem ${r}`);
			checkDivRem(n, d, q, r);
		};

		it("constant: w.2 / (w + 1)", () => {
			propDivRem(unit.mult(2n), unit.add(1n));
		});

		it("divide by 1", () => {
			fc.assert(
				fc.property(arbOrd3, (a) => {
					const [q, r] = ordinalDivRem(a, one);
					expect(r).conwayEq(zero);
					expect(q).conwayEq(a);
				}),
			);
		});

		it("finites only: n/d = [q, r] -> n = d*q + r and r < d", () => {
			fc.assert(
				fc.property(
					arbFiniteBigintOrd,
					arbFiniteBigintOrd.filter(isPositive),
					(n, d) => {
						const [q, r] = ordinalDivRem(n, d);
						expect(lt(r, d)).toBe(true);
						expect(n).conwayEq(ordinalAdd(ordinalMult(d, q), r));
					},
				),
			);
		});

		it("multiple of w", () => {
			fc.assert(
				fc.property(
					arbFiniteBigintOrd,
					arbFiniteBigintOrd.filter(isPositive),
					(n: Ord0, d: Ord0) => {
						const [q1, r1] = ordinalDivRem(n, d);
						const [q2, r2] = ordinalDivRem(unit.mult(n), unit.mult(d));
						expect(q1).conwayEq(q2);
						expect(unit.mult(r1)).conwayEq(r2);
					},
				),
			);
		});

		describe("divide by itself", () => {
			it("finite", () => {
				fc.property(
					arbOrd3.filter((x) => !x.isAboveReals),
					(a) => {
						const [q, r] = ordinalDivRem(a, a);
						expect(r).conwayEq(zero);
						expect(q).conwayEq(one);
					},
				);
			});

			it("monomial", () => {
				fc.property(arbOrd3.filter(isMono), (a) => {
					const [q, r] = ordinalDivRem(a, a);
					expect(r).conwayEq(zero);
					expect(q).conwayEq(one);
				});
			});

			it("general", () => {
				fc.property(arbOrd3.filter(isPositive), (a) => {
					const [q, r] = ordinalDivRem(a, a);
					expect(r).conwayEq(zero);
					expect(q).conwayEq(one);
				});
			});
		});

		it("(w^k + 1) / w^k", () => {
			fc.assert(
				fc.property(arbFiniteBigintOrd.filter(isPositive), (k) =>
					propDivRem(mono1(k).add(1n), mono1(k)),
				),
			);
		});

		it("divide finite by finite", () => {
			fc.assert(
				fc.property(
					arbFiniteBigintOrd,
					arbFiniteBigintOrd.filter(isPositive),
					(n, d) => {
						fc.pre(!isZero(d) && le(d, n));
						const [q, r] = ordinalDivRem(n, d);
						const q0 = n / d;
						const r0 = n - q0 * d;
						expect(q0).conwayEq(q);
						expect(r0).conwayEq(r);
					},
				),
			);
		});

		it("divide infinite by finite", () => {
			fc.assert(fc.property(arbOrd3, arbFiniteBigintOrd, propDivRem));
		});

		describe("divide and add back: n/d = q rem r --> n = d*q + r", () => {
			it("monomial by monomial", () => {
				fc.assert(
					fc.property(
						arbOrd3.filter(isMono),
						arbOrd3.filter(isMono),
						propDivRem,
					),
				);
			});

			it("infinite by monomial", () => {
				fc.assert(fc.property(arbOrd3, arbOrd3.filter(isMono), propDivRem));
			});

			it("general", () => {
				fc.assert(fc.property(arbOrd3, arbOrd3, propDivRem));
			});
		});

		it("returns unwrapped if both parameters are unwrapped", () => {
			fc.assert(
				fc.property(arbFiniteBigintOrd, arbFiniteBigintOrd, (a, b) => {
					fc.pre(!isZero(b));
					const [p, q] = ordinalDivRem(a, b);
					return typeof p === "bigint" && typeof q === "bigint";
				}),
			);
		});
	});

	describe("isOrdinal", () => {
		it("zero, one, unit are ordinals", () => {
			expect(zero.isOrdinal).toBe(true);
			expect(one.isOrdinal).toBe(true);
			expect(unit.isOrdinal).toBe(true);
		});

		it("non-negative integers (number) are ordinals", () => {
			fc.assert(
				fc.property(fc.integer(), (i) => conwayEnsure(i).isOrdinal === i >= 0),
			);
		});

		it("non-negative bigints are ordinals", () => {
			fc.assert(
				fc.property(fc.bigInt(), (i) => conwayEnsure(i).isOrdinal === i >= 0),
			);
		});
	});

	describe("canon", () => {
		describe("constants", () => {
			expect(canon(mono1(3n), 7n)).conwayEq(mono(7n, 2n));
			expect(canon(mono(7n, unit.add(2n)), 5)).conwayEq(
				mono(6n, unit.add(2n)).add(mono(5n, unit.add(1n))),
			);
		});

		const arbLim3 = arbOrd3.filter(isLimit);
		const arbN = fc.bigInt({ min: 1n });
		it("sequence is lower than input", () => {
			fc.assert(fc.property(arbLim3, arbN, (x, n) => lt(canon(x, n), x)));
		});

		it("sequence is increasing", () => {
			fc.assert(
				fc.property(arbLim3, arbN, (x, n) => lt(canon(x, n), canon(x, n + 1n))),
			);
		});

		it("sequence does not reduce number of terms", () => {
			fc.assert(
				fc.property(
					arbLim3,
					arbN,
					(x, n) => ensure(canon(x, n)).length >= x.length,
				),
			);
		});

		it("sequence has same finite difference for w^(p + 1)", () => {
			fc.assert(
				fc.property(
					arbOrd3.map((x) => mono1(x.add(1n))),
					arbN,
					arbN,
					(x, n, m) => {
						expect(ordinalRightSub(canon(x, n), canon(x, n + 1n))).conwayEq(
							ordinalRightSub(canon(x, m), canon(x, m + 1n)),
						);
					},
				),
			);
		});

		it("sequence preserves prefix terms for non-monomials", () => {
			fc.assert(
				fc.property(
					arbLim3.filter((x) => x.length > 1),
					arbN,
					(x, n) => {
						// @ts-ignore readonly casting
						const noTail = create([...x].slice(0, x.length - 1));
						// @ts-ignore readonly casting
						const noTail1 = create([...canon(x, n)].slice(0, x.length - 1));
						expect(noTail1).conwayEq(noTail);
					},
				),
			);
		});

		describe("monomials", () => {
			it("canon(w^(x + 1), n) = w^x n", () => {
				fc.assert(
					fc.property(arbOrd3, arbN, (x, n) => {
						expect(canon(mono1(x.add(1n)), n)).conwayEq(mono1(x).mult(n));
					}),
				);
			});

			it("canon(w^xLim, n) = w^canon(xLim, n)", () => {
				fc.assert(
					fc.property(arbLim3, arbN, (x, n) => {
						expect(canon(mono1(x), n)).conwayEq(mono1(canon(x, n)));
					}),
				);
			});

			it("canon(w^(x + 1) (k + 1), n) = w^(x + 1) k + w^x n", () => {
				fc.assert(
					fc.property(arbOrd3, arbFiniteBigintOrd, arbN, (x, k, n) => {
						expect(canon(mono(k + 1n, x.add(1n)), n)).conwayEq(
							mono(k, x.add(1n)).ordinalAdd(mono(n, x)),
						);
					}),
				);
			});

			it("canon(w^xLim (k + 1), n) = w^xLim k + w^canon(xLim, n)", () => {
				fc.assert(
					fc.property(arbLim3, arbFiniteBigintOrd, arbN, (x, k, n) => {
						expect(canon(mono(k + 1n, x), n)).conwayEq(
							mono(k, x).add(mono1(canon(x, n))),
						);
					}),
				);
			});
		});
	});

	describe("subtypes: isZero/isSucc/isLimit", () => {
		it("isZero is mutually exclusive with isSucc/isLimit", () => {
			fc.assert(
				fc.property(arbOrd3, (n) => isZero(n) === !(isSucc(n) || isLimit(n))),
			);
		});

		it("isSucc is mutually exclusive with isZero/isLimit", () => {
			fc.assert(
				fc.property(arbOrd3, (n) => isSucc(n) === !(isZero(n) || isLimit(n))),
			);
		});

		it("isLimit is mutually exclusive with isZero/isLimit", () => {
			fc.assert(
				fc.property(arbOrd3, (n) => isLimit(n) === !(isZero(n) || isSucc(n))),
			);
		});

		it("has zero real part if and only if is not succ", () => {
			fc.assert(fc.property(arbOrd3, (n) => isZero(n.realPart) === !isSucc(n)));
		});
	});

	describe("succ/pred", () => {
		it("isSucc(succ(n))", () => {
			fc.assert(fc.property(arbOrd3, (n) => isSucc(succ(n))));
		});

		it("isOrdinal(succ(n))", () => {
			fc.assert(fc.property(arbOrd3, (n) => isOrdinal(succ(n))));
		});

		it("succ(n) = n + 1", () => {
			fc.assert(
				fc.property(arbOrd3, (n) => {
					fc.pre(isSucc(n));
					expect(n.ordinalAdd(1n)).conwayEq(succ(n));
				}),
			);
		});

		it("isSucc(n) --> n = succ(pred(n))", () => {
			fc.assert(
				fc.property(arbOrd3, (n) => {
					fc.pre(isSucc(n));
					expect(n).conwayEq(succ(pred(n)));
				}),
			);
		});

		it("isSucc(n) --> isOrdinal(pred(n))", () => {
			fc.assert(
				fc.property(arbOrd3, (n) => {
					fc.pre(isSucc(n));
					return isOrdinal(pred(n));
				}),
			);
		});

		it("succ: preserves unwrapped", () => {
			fc.assert(
				fc.property(arbFiniteBigintOrd, (n) => {
					return typeof succ(n) === "bigint";
				}),
			);
		});

		it("pred: preserves unwrapped", () => {
			fc.assert(
				fc.property(arbFiniteBigintOrd, (n) => {
					fc.pre(n > 0n);
					return typeof pred(n) === "bigint";
				}),
			);
		});
	});

	describe("noSucc", () => {
		it("noSucc(x) is zero for finite x", () => {
			fc.assert(fc.property(arbFiniteBigintOrd, (x) => isZero(noSucc(x))));
		});

		it("noSucc(x) is limit for non-zero x", () => {
			fc.assert(
				fc.property(arbOrd3.filter(isAboveReals), (x) => isLimit(noSucc(x))),
			);
		});
	});
});

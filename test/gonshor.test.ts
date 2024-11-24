import fc from "fast-check";
import "./expect.test";
import type { Conway0, Ord, Ord0 } from "../conway";
import { ensure, isReal, mono, mono1, unit } from "../op";
import {
	arbConway1,
	arbConway2,
	arbConway3,
	arbConway4,
	arbDyadic,
	arbOrd3,
} from "./generators";
import {
	signExpansion,
	signExpansionMono1,
	signExpansionOmit,
	signExpansionReal,
} from "../signExpansion/gonshor";
import { normalizedSignExpansionLength } from "../signExpansion/normalize";
import { commonPrefix } from "../signExpansion/normalize";
import { normalizeSignExpansionSeq } from "../signExpansion/normalize";
import { SignExpansionSeq } from "../signExpansion/types";
import type { SignExpansionElement } from "../signExpansion/types";
import { compare, eq, gt, isPositive, isZero, le, lt } from "../op/comparison";
import { ordinalAdd } from "../op/ordinal";
import { add, neg } from "../op/arith";

fc.configureGlobal({ numRuns: 200 });

const assertSignExpansion = (x: Conway0, parts: [boolean, Ord0][]) => {
	const l = [...signExpansion(x)];
	const se = l.filter((x) => !isZero(x.length));
	try {
		expect(se).toMatchObject(
			parts.map(([sign, length]) => ({
				sign,
				length: expect.conwayEq(length),
			})),
		);
		if (se.length > 0) {
			expect(se[se.length - 1].finalValue).conwayEq(x);
		}
	} catch (e) {
		console.error("FAIL assertSignExpansion: ", x, l);
		throw e;
	}
};

const assertSignExpansionOmit = (
	x: Conway0,
	omit: Conway0[],
	parts: [boolean, Conway0, Conway0][],
	_mono1 = false,
) => {
	const l = [...(_mono1 ? signExpansionMono1 : signExpansionOmit)(x, omit)];
	try {
		expect(l.filter((x) => !isZero(x.length))).toMatchObject(
			parts.map(([sign, initValue, finalValue]) => ({
				sign,
				initValue: expect.conwayEq(initValue),
				finalValue: expect.conwayEq(finalValue),
			})),
		);
	} catch (e) {
		console.error("assertSignExpansionOmit", x, "|", omit.map(String), l);
		throw e;
	}
};

const assertSignExpansionMono1Omit = (
	x: Conway0,
	omit: Conway0[],
	parts: [boolean, Conway0, Conway0][],
) => assertSignExpansionOmit(x, omit, parts, true);

const arbSE = arbConway4(arbDyadic(4)).map((x) => [...signExpansion(x)]);

const genReturnValue = <S, T>(g: Generator<S, T>) => {
	while (true) {
		const res = g.next();
		if (res.done) {
			return res.value;
		}
	}
	throw new Error("unreachable");
};

const checkPropFinalValueInitValue = (se: SignExpansionElement<Conway0>[]) => {
	const elems: unknown[] = [];
	for (let i = 0; i < se.length; i++) {
		elems.push({
			initValue: expect.conwayEq(
				i === 0 ? se[i].initValue : se[i - 1].finalValue,
			),
			finalValue: expect.conwayEq(se[i].finalValue),
		});
	}
	expect(se).toMatchObject(elems);
};

const checkPropSignExpansionNegation = <T extends Conway0 = Conway0>(
	x: T,
	signExpansion: (value: T) => Generator<SignExpansionElement<T>>,
) => {
	const se = [...signExpansion(x)];
	const seNeg = [...signExpansion(neg(x) as T)];
	try {
		expect(
			seNeg.map(({ length, sign, initValue, finalValue }) => ({
				length,
				sign,
				initValue,
				finalValue,
			})),
		).toMatchObject(
			se.map(({ length, sign, initValue, finalValue }) => ({
				initValue: expect.conwayEq(neg(initValue)),
				finalValue: expect.conwayEq(neg(finalValue)),
				length: expect.conwayEq(length),
				sign: !sign,
			})),
		);
	} catch (e) {
		console.error("--- checkPropSignExpansionNegation failed", x);
		console.error(x, se);
		console.error(neg(x), seNeg);
		throw e;
	}
};

const testPropSignExpansion = <T extends Conway0 = Conway0>(
	gen: fc.Arbitrary<T>,
	signExpansion: (value: T) => Generator<SignExpansionElement<T>>,
) => {
	it("first initValue is zero", () => {
		fc.assert(
			fc.property(gen, (x) => {
				fc.pre(!isZero(x));
				const it = signExpansion(x);
				const { done, value } = it.next();
				if (done) {
					return false;
				}
				return isZero(value.initValue);
			}),
		);
	});

	it("all lengths are non-zero", () => {
		fc.assert(
			fc.property(gen, (x) => {
				const l = [...signExpansion(x)];
				if (!l.every(({ length }) => !isZero(length))) {
					console.error(x, l);
					return false;
				}
				return true;
			}),
		);
	});

	it("last finalValue is the value itself", () => {
		fc.assert(
			fc.property(gen, (x) => {
				fc.pre(!isZero(x));
				const entries = [...signExpansion(x)];
				fc.pre(entries.length > 0);
				return eq(entries[entries.length - 1].finalValue, x);
			}),
		);
	});

	it("finalValue is the next initValue", () => {
		fc.assert(
			fc.property(gen, (x) => {
				fc.pre(!isZero(x));
				const entries = [...signExpansion(x)];
				fc.pre(entries.length >= 2);
				checkPropFinalValueInitValue(entries);
				return true;
			}),
		);
	});

	describe("seq", () => {
		it("first value of seq is initValue", () => {
			fc.assert(
				fc.property(gen, (x) => {
					fc.pre(!isZero(x));
					for (const e of signExpansion(x)) {
						if (isZero(e.length)) {
							continue;
						}
						expect(e.initValue).conwayEq(e.seq.head[0]);
					}
					return true;
				}),
			);
		});

		it("for infinite seqs, is increasing or descreasing depending on the sign", () => {
			fc.assert(
				fc.property(gen, (x) => {
					fc.pre(!isZero(x));
					for (const e of signExpansion(x)) {
						if (isReal(e.length) || isZero(e.length)) {
							continue;
						}

						if (e.sign) {
							expect(gt(e.seq.head[1], e.seq.head[0])).toBe(true);
						} else {
							expect(lt(e.seq.head[1], e.seq.head[0])).toBe(true);
						}
					}
					return true;
				}),
			);
		});

		it("for infinite seqs, never overtake the next initValue", () => {
			fc.assert(
				fc.property(gen, (x) => {
					fc.pre(!isZero(x));
					const entries = [...signExpansion(x)];
					for (let i = 0; i < entries.length - 1; i++) {
						const e = entries[i];
						const e1 = entries[i + 1];
						if (isReal(e.length) || isZero(e.length)) {
							continue;
						}

						if (e.sign) {
							expect(lt(e.seq.head[0], e1.initValue)).toBe(true);
						} else {
							expect(gt(e.seq.head[0], e1.initValue)).toBe(true);
						}
					}
					return true;
				}),
			);
		});
	});

	it("is non-empty for non-zero values", () => {
		fc.assert(
			fc.property(gen, (x) => {
				const it = signExpansion(x);
				const { done } = it.next();
				return isZero(x) ? done : !done;
			}),
		);
	});

	it("negation symmetry", () => {
		fc.assert(
			fc.property(gen, (x) =>
				checkPropSignExpansionNegation<T>(x, signExpansion),
			),
		);
	});
};

const testPropSignExpansionOmit = <T extends Conway0 = Conway0>(
	gen: fc.Arbitrary<[T, T[]]>,
) => {
	it("first initValue is zero if all positive prevValues", () => {
		fc.assert(
			fc.property(gen, ([x, ys]) => {
				fc.pre(!ys || ys.every(isPositive));
				const xs = [...signExpansionOmit(x, ys)];
				fc.pre(xs.length > 0);
				return isZero(xs[0].initValue);
			}),
		);
	});

	it("last finalValue is the first argument", () => {
		fc.assert(
			fc.property(gen, ([x, ys]) => {
				const xs = [...signExpansionOmit(x, ys)];
				fc.pre(xs.length > 0);
				expect(x).conwayEq(xs[xs.length - 1].finalValue);
				return true;
			}),
		);
	});

	it("finalValue is the next initValue", () => {
		fc.assert(
			fc.property(gen, ([x, ys]) => {
				const se = [...signExpansionOmit(x, ys)];
				fc.pre(se.length > 1);
				checkPropFinalValueInitValue(se);
				return true;
			}),
		);
	});

	it("all initValue and finalValue are less than all prevValues", () => {
		fc.assert(
			fc.property(gen, ([x, ys]) => {
				const se = [...signExpansionOmit(x, ys)];
				fc.pre(se.length > 0);
				const check = (x: Conway0) => ys.every((y) => lt(x, y));
				const res = se.every(({ initValue, finalValue }, idx) => {
					if (idx === 0) {
						return check(finalValue);
					}
					return check(initValue) && check(finalValue);
				});
				if (!res) {
					console.error("FAIL all initValue/finalValue", x, ys.map(String), se);
				}
				return res;
			}),
		);
	});
};

describe("signExpansionOmit", () => {
	const arbSignExpansionOmitArgs = <T extends Conway0>(
		arb: fc.Arbitrary<T>,
	) => {
		const prevs = fc
			.array(arb, { minLength: 1, maxLength: 5 })
			.map((x) => x.toSorted(compare));
		return fc.tuple(arb, prevs).filter(([x, ys]) => ys.every((y) => lt(x, y)));
	};
	//              0   1   0.5   0.75
	// SE(0.75) =     +   -     +
	//              0   1   0.5   0.75
	// SE(0.5)  =     +   -
	// SE(0.5 | 0.75) = +
	//              0  [1]  0.5
	//                +  [-]
	//              0   0.5
	//                +
	// SE(0.25 | 0.75) =
	//              0  [1]  0.5  0.25
	//                +  [-]    -
	//              0   0.5   0.75
	//                +     -
	// SE(0.625 | 0.75) =
	//              0  [1]  0.5 [0.75] 0.625
	//                +  [-]   +      -
	//              0   0.5   0.75   0.625
	//                +     +      -
	// SE(-+-+) =
	//              0   -1   -0.5   -0.75  -0.625
	//                -    +      -      +
	// SE(-+-++) =
	//              0   -1   -0.5   -0.75   -0.625   -0.5625
	//                -    +      -       +        +
	// SE(-+-+ | -+-++) =
	//              0   -1  [-0.5]  -0.75   [-0.625]
	//               [-]   +     [-]      +
	//              0   -1   -0.75
	//                +    +
	// L(-+-++) = 0, -+, -+-+, -+-++
	// SE(+---+) =
	//              0  0.5  0.25  0.125   0.0625 0.09375
	//                +   -      -      -       +
	// SE(+--- | +---+) = +
	//              0 [0.5  0.25  0.125   0.0625 0.09375]   0.078125
	//                +  [-      -      -]
	//              0   0.078125
	//                +
	// SE(+---- | +---+) = +-
	//              0 [0.5  0.25  0.125   0.0625 0.03125]
	//                +  [-      -      -]      -
	//              0   0.0625   0.03125
	//                +        -
	//
	describe("reals", () => {
		const arb = arbSignExpansionOmitArgs(arbDyadic(8));
		describe("examples", () => {
			it("avoid larger partial values", () => {
				assertSignExpansionOmit(0.5, [0.75], [[true, 0n, 0.5]]);
				assertSignExpansionOmit(
					0.25,
					[0.75],
					[
						[true, 0n, 0.5],
						[false, 0.5, 0.25],
					],
				);
				assertSignExpansionOmit(
					0.625,
					[0.75],
					[
						[true, 0n, 0.5],
						[true, 0.5, 0.625],
					],
				);
			});

			it("-5|{-4.5} = [+]", () => {
				// -5        = [-----]
				// -4.5      = [-----+]
				// -5 | -4.5 = []
				assertSignExpansionOmit(-5, [-4.5], []);
			});

			it("-4|{-4, -3} = []", () => {
				// -4 = [----]
				// -5 = [-----]
				assertSignExpansionOmit(-4, [-4, -3], []);
			});

			it("-5|{-4, -3} = [-]", () => {
				// -4 = [----]
				// -5 = [-----]
				assertSignExpansionOmit(-5, [-4, -3], [[false, -4, -5]]);
			});

			it("-4.5|{-4, -3} = [+]", () => {
				// -4 = [----]
				// -4.5 = [-----+]
				// -4.5 | -4 = [-+]
				assertSignExpansionOmit(
					-4.5,
					[-4, -3],
					[
						[false, -4, -5],
						[true, -5, -4.5],
					],
				);
			});

			it("a0=[-+-++] a1=[-+-+], a2=[-+-], a3=[-]: a1|a0 = [++], a2|{a0,a1} = [+], a3|{a0,a1,a2} = []", () => {
				// [-+-++]
				const a0 = -0.5625;
				assertSignExpansionOmit(
					a0,
					[],
					[
						[false, 0, -1n],
						[true, -1n, -0.5],
						[false, -0.5, -0.75],
						[true, -0.75, -0.625],
						[true, -0.625, -0.5625],
					],
				);

				// [-+-+]
				const a1 = -0.625;
				// signExpansion([-+-+]|[-+-++]) = ++
				assertSignExpansionOmit(
					a1,
					[a0],
					[
						// [-+] = [-0.5]
						// [-]+[-] = -0.75
						[true, -1, -0.75],
						// [-]+[-]+ = -0.625
						[true, -0.75, -0.625],
					],
				);
				// [-+-]
				const a2 = -0.75;
				assertSignExpansionOmit(
					a2,
					[a0, a1],
					[
						// [-+] = [-0.5]
						// [-]+[-] = -0.75
						[true, -1, -0.75],
					],
				);
				assertSignExpansionOmit(
					-1,
					[a0, a1, a2],
					[
						// [-] = -1
					],
				);
			});

			// [Gonshor] p.84
			it("a0=[+-++], a1=[+-+-], a1|a0 = [++-]", () => {
				// [+-++]
				const a0 = 0.875;
				// [+-+-]
				const a1 = 0.625;
				assertSignExpansionOmit(
					a1,
					[a0],
					[
						[true, 0, 0.5],
						[true, 0.5, 0.75],
						[false, 0.75, 0.625],
					],
				);
			});

			// [Gonshor] p.84
			it("a0=[+++], a1=[+++-], a1|a0 = [+++-]", () => {
				// [+++]
				const a0 = 3;
				// [+++-]
				const a1 = 2.5;
				assertSignExpansionOmit(
					a1,
					[a0],
					[
						[true, 0, 1],
						[true, 1, 2],
						[true, 2, 2.5],
					],
				);
			});

			it("a0 = [+-], a1 = [+---], a1|a0 = [+--]", () => {
				assertSignExpansionOmit(
					0.125,
					[0.5],
					[
						[true, 0, 0.25],
						[false, 0.25, 0.125],
					],
				);
			});
		});

		testPropSignExpansionOmit(arb);
	});

	describe("ordinals", () => {
		testPropSignExpansionOmit(arbSignExpansionOmitArgs(arbOrd3));
	});

	describe("No1", () => {
		testPropSignExpansionOmit(
			arbSignExpansionOmitArgs(arbConway1(arbDyadic())),
		);
	});

	describe("No2", () => {
		testPropSignExpansionOmit(
			arbSignExpansionOmitArgs(arbConway2(arbDyadic())),
		);
	});

	describe("No3", () => {
		testPropSignExpansionOmit(
			arbSignExpansionOmitArgs(arbConway3(arbDyadic())),
		);
	});

	describe.skip("No4", () => {
		testPropSignExpansionOmit(
			arbSignExpansionOmitArgs(arbConway4(arbDyadic())),
		);
	});
});

describe("signExpansion", () => {
	describe("reals", () => {
		it("integers", () => {
			assertSignExpansion(0n, []);
			assertSignExpansion(1n, [[true, 1n]]);
			assertSignExpansion(2n, [
				[true, 1n],
				[true, 1n],
			]);
			assertSignExpansion(5n, [
				[true, 1n],
				[true, 1n],
				[true, 1n],
				[true, 1n],
				[true, 1n],
			]);
			assertSignExpansion(-1n, [[false, 1n]]);
			assertSignExpansion(-2n, [
				[false, 1n],
				[false, 1n],
			]);
			assertSignExpansion(-5n, [
				[false, 1n],
				[false, 1n],
				[false, 1n],
				[false, 1n],
				[false, 1n],
			]);
		});

		it("dyadics (+^m -^n and -^m +^n)", () => {
			assertSignExpansion(0.5, [
				[true, 1n],
				[false, 1n],
			]);
			assertSignExpansion(0.25, [
				[true, 1n],
				[false, 1n],
				[false, 1n],
			]);
			assertSignExpansion(0.125, [
				[true, 1n],
				[false, 1n],
				[false, 1n],
				[false, 1n],
			]);
			assertSignExpansion(-0.5, [
				[false, 1n],
				[true, 1n],
			]);
			assertSignExpansion(-0.25, [
				[false, 1n],
				[true, 1n],
				[true, 1n],
			]);
			assertSignExpansion(-0.125, [
				[false, 1n],
				[true, 1n],
				[true, 1n],
				[true, 1n],
			]);
		});

		it("dyadics", () => {
			assertSignExpansion(0.75, [
				[true, 1n],
				[false, 1n],
				[true, 1n],
			]);
			assertSignExpansion(0.25 + 0.125, [
				[true, 1n],
				[false, 1n],
				[false, 1n],
				[true, 1n],
			]);
			assertSignExpansion(0.5625, [
				[true, 1n],
				[false, 1n],
				[true, 1n],
				[false, 1n],
				[false, 1n],
			]);

			assertSignExpansion(-0.5625, [
				[false, 1n],
				[true, 1n],
				[false, 1n],
				[true, 1n],
				[true, 1n],
			]);
		});

		describe("sign expansion props", () => {
			testPropSignExpansion(arbDyadic(8), signExpansionReal);
		});
	});

	describe("w^p - examples", () => {
		it("finite ordinals", () => {
			assertSignExpansion(mono1(0n), [[true, 1n]]);
			assertSignExpansion(mono1(1n), [
				[true, 1n],
				[true, unit],
			]);
			assertSignExpansion(mono1(2n), [
				[true, 1n],
				[true, unit],
				[true, mono1(2n)],
			]);
			assertSignExpansion(mono1(4n), [
				[true, 1n],
				[true, unit],
				[true, mono1(2n)],
				[true, mono1(3n)],
				[true, mono1(4n)],
			]);
		});

		it("infinite ordinals", () => {
			assertSignExpansion(unit.add(2n), [
				[true, 1n],
				[true, unit],
				[true, 1n],
				[true, 1n],
			]);

			assertSignExpansion(mono1(mono1(4n)), [
				[true, 1n],
				[true, unit],
				[true, mono1(unit)],
				[true, mono1(mono1(2n))],
				[true, mono1(mono1(3n))],
				[true, mono1(mono1(4n))],
			]);
			const o = mono(2n, mono(3n, 5n).add(mono(4n, 2n))).add(5);
			assertSignExpansion(o, [
				[true, 1n],
				[true, unit],
				[true, mono1(unit)],
				[true, mono1(mono1(2n))],
				[true, mono1(mono1(3n))],
				[true, mono1(mono1(4n))],
				[true, mono1(mono1(5n))],
				[true, mono1(mono(2n, 5n))],
				[true, mono1(mono(3n, 5n))],
				[true, mono1(mono(3n, 5n).add(1n))],
				[true, mono1(mono(3n, 5n).add(unit))],
				[true, mono1(mono(3n, 5n).add(mono1(2n)))],
				[true, mono1(mono(3n, 5n).add(mono(2n, 2n)))],
				[true, mono1(mono(3n, 5n).add(mono(3n, 2n)))],
				[true, mono1(mono(3n, 5n).add(mono(4n, 2n)))],
				[true, mono1(mono(3n, 5n).add(mono(4n, 2n)))],
				[true, 1n],
				[true, 1n],
				[true, 1n],
				[true, 1n],
				[true, 1n],
			]);
		});

		it("dyadics", () => {
			// [Gonshor p.81] Theorem 5.11
			const a0 = -0.5625;
			assertSignExpansion(mono1(a0), [
				[true, 1n],
				[false, unit],
				[true, unit],
				[false, mono1(2n)],
				[true, mono1(2n)],
				[true, mono1(3n)],
			]);
		});

		describe("sign expansion props", () => {
			testPropSignExpansion(arbConway3(arbDyadic(8)).map(mono1), signExpansion);
		});
	});

	describe("plusValue - examples", () => {
		it("real plus/minus w^-1", () => {
			assertSignExpansion(-1n, [[false, 1n]]);
			assertSignExpansion(mono1(-1n), [
				[true, 1n],
				[false, unit],
			]);
			assertSignExpansion(add(0.5, mono1(-1n)), [
				[true, 1n],
				[false, 1n],
				[true, 1n],
				[false, unit],
			]);

			assertSignExpansion(add(0.25, mono1(-1n)), [
				[true, 1n],
				[false, 1n],
				[false, 1n],
				[true, 1n],
				[false, unit],
			]);
		});
	});

	describe("No1", () => {
		testPropSignExpansion(arbConway1(arbDyadic(8)), signExpansion);
	});

	describe("No2", () => {
		testPropSignExpansion(arbConway2(arbDyadic(8)), signExpansion);
	});

	describe("No3", () => {
		testPropSignExpansion(arbConway3(arbDyadic(8)), signExpansion);
	});

	describe.skip("No4", () => {
		testPropSignExpansion(arbConway4(arbDyadic(8)), signExpansion);
	});

	describe("Ord3", () => {
		testPropSignExpansion(arbOrd3, signExpansion);

		it("total length = ordinal value", () => {
			fc.assert(
				fc.property(arbOrd3, (x) => {
					const se = [...signExpansion(x)];
					let sum = 0n as Ord0;
					for (const { length } of se) {
						sum = ordinalAdd(sum, length);
					}
					try {
						expect(sum).conwayEq(x);
					} catch (e) {
						console.error("x =", x, "sum =", sum, se);
						throw e;
					}
				}),
			);
		});
	});
});

describe("signExpansionMono1", () => {
	it("signExpansion(w^-1)", () => {
		assertSignExpansionMono1Omit(
			-1n,
			[],
			[
				[true, 0n, 1n],
				[false, 1n, mono1(-1n)],
			],
		);
	});

	it("signExpansion(w^-1 | w^-0.5) = +", () => {
		expect([...signExpansionOmit(-1n, [-0.5])]).toMatchObject([
			{ sign: false, length: expect.conwayEq(0n) },
		]);
		expect([...signExpansionMono1(-1n, [-0.5])]).toMatchObject([
			{ sign: true, length: expect.conwayEq(1n) },
		]);
		//           0   1      w^-1      w^-0.5
		// w^-0.5 =    +    -^w      +^w
		//           0   1      w^-1
		// w^-1   =    +    -^w
		// w^-1 | w^-0.5 = +
		//           0          w^-1
		// w^-1   =    +
		// -1 | -0.5 = [-] | [-+] = []
	});

	it("signExpansion(w^-2)", () => {
		assertSignExpansionMono1Omit(
			-2n,
			[],
			[
				[true, 0n, 1n],
				[false, 1n, mono1(-1n)],
				[false, mono1(-1n), mono1(-2n)],
			],
		);
	});

	it("signExpansion(w^2)", () => {
		assertSignExpansionMono1Omit(
			2n,
			[],
			[
				[true, 0n, 1n],
				[true, 1n, unit],
				[true, unit, mono1(2n)],
			],
		);
	});

	it("signExpansion(w^2 | w^2.5)", () => {
		expect([...signExpansionOmit(2n, [2.5])]).toMatchObject([
			{ sign: true, length: 1n, initValue: 0n, finalValue: 1n },
			{ sign: true, length: 1n, initValue: 1n, finalValue: 2n },
		]);

		assertSignExpansionMono1Omit(
			2n,
			[2.5],
			[
				[true, 0n, 1n],
				[true, 1n, unit],
				[true, unit, mono1(2n)],
			],
		);
	});

	it("signExpansion(-1 | 0) = [-]", () => {
		expect([...signExpansionOmit(-1n, [0n])]).toMatchObject([
			{
				sign: false,
				length: 1n,
				initValue: 0n,
				finalValue: -1n,
			},
		]);
	});
});

describe("normalizeSignExpansionSeq", () => {
	it("does not increase array length", () => {
		fc.assert(
			fc.property(
				arbSE,
				(se) => se.length >= [...normalizeSignExpansionSeq(se)].length,
			),
		);
	});

	it("no consecutive same signs", () => {
		fc.assert(
			fc.property(arbSE, (se) => {
				const nse = [...normalizeSignExpansionSeq(se)];
				for (let i = 0; i + 1 < nse.length; i++) {
					if (nse[i].sign === nse[i + 1].sign) {
						return false;
					}
				}
				return true;
			}),
		);
	});

	it("max of last element = total length", () => {
		fc.assert(
			fc.property(arbSE, (se) => {
				const nse = [...normalizeSignExpansionSeq(se)];
				if (se.length === 0) {
					return nse.length === 0;
				}
				if (nse.length === 0) {
					return true;
				}
				const n = se.reduce(
					(s, { length }) => ordinalAdd(s, length),
					0n as Ord0,
				);
				return eq(n, nse[nse.length - 1].max);
			}),
		);
	});

	it("for each element, length is non-zero", () => {
		fc.assert(
			fc.property(arbSE, (se) =>
				[...normalizeSignExpansionSeq(se)].every((x) => !isZero(x.length)),
			),
		);
	});

	it("for each element, max = min + length", () => {
		fc.assert(
			fc.property(arbSE, (se) =>
				[...normalizeSignExpansionSeq(se)].every((x) =>
					eq(ordinalAdd(x.min, x.length), x.max),
				),
			),
		);
	});

	it("for each element, min < max", () => {
		fc.assert(
			fc.property(arbSE, (se) =>
				[...normalizeSignExpansionSeq(se)].every((x) => lt(x.min, x.max)),
			),
		);
	});

	it("same length through SignExpansionSeq", () => {
		fc.assert(
			fc.property(arbSE, (se) => {
				const seq1 = new SignExpansionSeq(se);
				const seq2 = new SignExpansionSeq(normalizeSignExpansionSeq(se));
				return eq(seq1.length, seq2.length);
			}),
		);
	});

	it("same indexing through SignExpansionSeq", () => {
		fc.assert(
			fc.property(arbSE, arbOrd3, (se, idx) => {
				const seq1 = new SignExpansionSeq(se);
				const seq2 = new SignExpansionSeq(normalizeSignExpansionSeq(se));
				fc.pre(lt(idx, seq1.length));
				fc.pre(lt(idx, seq2.length));
				return seq1.index(idx) === seq2.index(idx);
			}),
		);
	});

	describe("return value", () => {
		it("nPlus = number of pluses", () => {
			fc.assert(
				fc.property(arbSE, (se) => {
					const { nPlus } = genReturnValue(normalizeSignExpansionSeq(se));
					const added = se.reduce(
						(s, { sign, length }) => (sign ? ordinalAdd(s, length) : s),
						0n as Ord0,
					);
					return eq(nPlus, added);
				}),
			);
		});

		it("nMinus = number of minuses", () => {
			fc.assert(
				fc.property(arbSE, (se) => {
					const { nMinus } = genReturnValue(normalizeSignExpansionSeq(se));
					const added = se.reduce(
						(s, { sign, length }) => (!sign ? ordinalAdd(s, length) : s),
						0n as Ord0,
					);
					return eq(nMinus, added);
				}),
			);
		});
	});

	describe("captured", () => {
		it("non-empty", () => {
			fc.assert(
				fc.property(arbSE, (se) => {
					for (const { captured } of normalizeSignExpansionSeq(se)) {
						expect(captured).not.toHaveLength(0);
					}
					return true;
				}),
			);
		});

		it("entries combine into original list", () => {
			fc.assert(
				fc.property(arbSE, (se) => {
					const combined = [...normalizeSignExpansionSeq(se)].flatMap(
						(e) => e.captured,
					);
					expect(combined).toStrictEqual(se);
					return true;
				}),
			);
		});

		it("first initValue of captured = initValue of entry", () => {
			fc.assert(
				fc.property(arbSE, (se) => {
					for (const { initValue, captured } of normalizeSignExpansionSeq(se)) {
						expect(captured).not.toHaveLength(0);
						expect(captured[0].initValue).conwayEq(initValue);
					}
					return true;
				}),
			);
		});

		it("last finalValue of captured = finalValue of entry", () => {
			fc.assert(
				fc.property(arbSE, (se) => {
					for (const { finalValue, captured } of normalizeSignExpansionSeq(
						se,
					)) {
						expect(captured).not.toHaveLength(0);
						expect(captured[captured.length - 1].finalValue).conwayEq(
							finalValue,
						);
					}
					return true;
				}),
			);
		});

		it("last seq of captured = seq of entry", () => {
			fc.assert(
				fc.property(arbSE, (se) => {
					for (const { seq, captured } of normalizeSignExpansionSeq(se)) {
						expect(captured).not.toHaveLength(0);
						expect(captured[captured.length - 1].seq).toBe(seq);
					}
					return true;
				}),
			);
		});
	});
});

describe("commonPrefix, let n = length of commonPrefix(a, b)", () => {
	const len = normalizedSignExpansionLength;
	it("n < length of a and n < length of b", () => {
		fc.assert(
			fc.property(arbSE, arbSE, (a, b) => {
				const sa = [...normalizeSignExpansionSeq(a)];
				const sb = [...normalizeSignExpansionSeq(b)];
				const sc = [...commonPrefix(sa, sb)];
				const lc = len(sc);
				return le(lc, len(sa)) && le(lc, len(sb));
			}),
		);
	});

	it("divergence: a[n] != b[n] if defined", () => {
		fc.assert(
			fc.property(arbSE, arbSE, (a, b) => {
				const sa = [...normalizeSignExpansionSeq(a)];
				const sb = [...normalizeSignExpansionSeq(b)];
				const sc = [...commonPrefix(sa, sb)];
				const lc = ensure(len(sc)) as Ord;
				const seqA = new SignExpansionSeq(sa);
				const seqB = new SignExpansionSeq(sb);
				fc.pre(lt(lc, seqA.length) && lt(lc, seqB.length));
				return seqA.index(lc) !== seqB.index(lc);
			}),
		);
	});

	it("truncation: for all i < n, a[i] = b[i]", () => {
		fc.assert(
			fc.property(arbSE, arbSE, arbOrd3, (a, b, i) => {
				const sa = [...normalizeSignExpansionSeq(a)];
				const sb = [...normalizeSignExpansionSeq(b)];
				const sc = [...commonPrefix(sa, sb)];
				const lc = ensure(len(sc)) as Ord;
				fc.pre(lt(i, lc.length));
				const seqA = new SignExpansionSeq(sa);
				const seqB = new SignExpansionSeq(sb);
				fc.pre(lt(i, seqA.length) && lt(i, seqB.length));
				return seqA.index(i) === seqB.index(i);
			}),
			{ numRuns: 50 },
		);
	});
});

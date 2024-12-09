import "../test/expect.test";
import fc from "fast-check";
import {
	arbDyadic,
	arbFiniteBigintOrd,
	arbOrd3,
} from "./generators";
import {
	groupBySign,
	IterReader,
	type Entry,
} from "../signExpansion/reader/types";
import type { Ord0 } from "../conway";
import { gt, isZero } from "../op/comparison";
import {
	genMono,
	genMono1,
	readMono,
	readMono1,
} from "../signExpansion/reader/mono";
import { ordinalRightSub } from "../op/ordinal";
import { mono } from "../op";
import { genReal, readReal } from "../signExpansion/reader/real";
import { realAdd, realNeg, type Real } from "../real";
import { Dyadic } from "../dyadic";

fc.configureGlobal({ numRuns: 1000 });

const arbEntry = (
	arbLength = arbOrd3 as fc.Arbitrary<Ord0>,
): fc.Arbitrary<Entry> =>
	fc.record<Entry>({
		sign: fc.boolean(),
		length: arbLength,
	});

describe("groupBySign", () => {
	it("empty -> empty", () => {
		expect([...groupBySign([])]).toStrictEqual([]);
	});

	const arbNonZeroEntries = fc.array(
		arbEntry(arbOrd3.filter((x) => !isZero(x))),
	);
	const arbZeroEntries = fc.array(arbEntry(fc.constant<Ord0>(0n)));

	it("zeros -> empty", () => {
		fc.assert(
			fc.property(arbZeroEntries, (xs) => {
				expect([...groupBySign(groupBySign(xs))]).toStrictEqual([]);
			}),
		);
	});

	it("does not increase length", () => {
		fc.assert(
			fc.property(arbNonZeroEntries, (xs) => {
				expect([...groupBySign(xs)].length).toBeLessThanOrEqual(xs.length);
			}),
		);
	});

	it("idempotent (non-zero entries)", () => {
		fc.assert(
			fc.property(arbNonZeroEntries, (xs) => {
				expect([...groupBySign(groupBySign(xs))]).toStrictEqual([
					...groupBySign(xs),
				]);
			}),
		);
	});

	it("idempotent (zero or non-zero entries)", () => {
		fc.assert(
			fc.property(fc.array(arbEntry()), (xs) => {
				expect([...groupBySign(groupBySign(xs))]).toStrictEqual([
					...groupBySign(xs),
				]);
			}),
		);
	});
});

const flipSign = ({ sign, length }: Entry) => ({
	sign: !sign,
	length,
});

const lengthToString = ({ sign, length }: Entry) => ({
	sign,
	length: `${length}`,
});

const arbGroupedSigns = fc
	.array(arbEntry(), { minLength: 1 })
	.map((x) => [...groupBySign(x)]);

describe("IterReader", () => {
	it("lookahead/consume example", () => {
		const reader = new IterReader<Ord0>([
			{ sign: false, length: 1n },
			{ sign: true, length: mono(3n, 2n).ordinalAdd(5n) },
		]);

		const res1 = reader.lookahead();
		expect(res1).not.toBeNull();
		expect(res1?.sign).toBe(false);
		expect(res1?.length).conwayEq(1n);
		reader.consume(1n);

		const res2 = reader.lookahead();
		expect(res2).not.toBeNull();
		expect(res2?.sign).toBe(true);
		expect(res2?.length).conwayEq(mono(3n, 2n).ordinalAdd(5n));
		reader.consume(mono(3n, 2n));

		const res3 = reader.lookahead();
		expect(res3).not.toBeNull();
		expect(res3?.sign).toBe(true);
		expect(res3?.length).conwayEq(5n);
		reader.consume(5n);
		expect(reader.lookahead()).toBeNull();
	});

	it("consuming 1 if allowed", () => {
		fc.assert(
			fc.property(fc.array(arbEntry()), (xs) => {
				const reader = new IterReader(xs);
				const result1 = reader.lookahead();
				fc.pre(result1 !== null && gt(result1.length, 1n));
				reader.consume(1n);
				const result2 = reader.lookahead();
				expect(result2?.length).conwayEq(ordinalRightSub(1n, result1.length));
			}),
		);
	});

	it("consecutive calls of lookahead preserves state", () => {
		fc.assert(
			fc.property(fc.array(arbEntry()), (xs) => {
				const reader = new IterReader(xs);
				while (true) {
					const result1 = reader.lookahead();
					const result2 = reader.lookahead();
					expect(result1 !== null).toBe(result2 !== null);
					if (result1 !== null && result2 !== null) {
						expect(result1.sign).toBe(result2.sign);
						expect(result1.length).conwayEq(result2.length);
						reader.consume(result1.length);
					}
					break;
				}
			}),
		);
	});

	it("alternating signs when consuming entire lookahead", () => {
		fc.assert(
			fc.property(fc.array(arbEntry()), (xs) => {
				const reader = new IterReader(xs);
				let lastSign = null as boolean | null;
				while (true) {
					const result = reader.lookahead();
					if (!result) {
						break;
					}

					expect(result.sign).not.toBe(lastSign);
					lastSign = result.sign;
					reader.consume(result.length);
				}
			}),
		);
	});
});

describe("genMono1/readMono1", () => {
	it("readMono1 on genMono1 result recovers input", () => {
		fc.assert(
			fc.property(arbGroupedSigns, (xs) => {
				const sign = true;
				const r1 = new IterReader(xs);
				const m1 = [...genMono1(r1, sign)];
				expect(r1.isDone).toBe(true);
				const r2 = new IterReader(m1);
				const xs1 = [...readMono1(r2, sign)];
				expect(r2.isDone).toBe(true);

				try {
					expect(xs.map(lengthToString)).toEqual(xs1.map(lengthToString));
				} catch (e) {
					console.log("-----");
					console.log("xs", xs);
					console.log("m1", m1);
					console.log("xs1", xs1);
					console.log("-----");
					throw e;
				}
			}),
		);
	});

	it("readMono1 negation symmetry", () => {
		fc.assert(
			fc.property(arbGroupedSigns, (xs) => {
				const m1p = [...genMono1(new IterReader(xs))];
				const m1n = [...genMono1(new IterReader(xs))].map(flipSign);
				expect(
					[...readMono1(new IterReader(m1p), true)].map(lengthToString),
				).toStrictEqual(
					[...readMono1(new IterReader(m1n), false)].map(lengthToString),
				);
			}),
		);
	});
});

describe("genReal", () => {
	it("integers", () => {
		fc.assert(
			fc.property(fc.bigInt(), (n) => {
				expect([...genReal(n)]).toStrictEqual(
					n === 0n
						? []
						: [
								{
									sign: n > 0n,
									length: n < 0n ? -n : n,
								},
							],
				);
			}),
		);
	});

	it("integers + half", () => {
		const pm = [
			{ sign: true, length: 1n },
			{ sign: false, length: 1n },
		];
		fc.assert(
			fc.property(fc.bigInt(), (n) => {
				const res = [...genReal(realAdd(n, Dyadic.HALF))];
				if (n === 0n) {
					expect(res).toStrictEqual(pm);
					return;
				}

				expect(res).toStrictEqual([
					{
						sign: n > 0n,
						length: n < 0n ? -n : n + 1n,
					},
					{
						sign: n < 0n,
						length: 1n,
					},
				]);
			}),
		);
	});

	it("negation symmetry", () => {
		fc.assert(
			fc.property(arbDyadic(), (x) => {
				const sx = [...genReal(x)];
				const snx = [...genReal(realNeg(x))];
				expect(snx.map(lengthToString)).toStrictEqual(
					sx.map(flipSign).map(lengthToString),
				);
			}),
		);
	});
});

describe("genReal", () => {
	it("returns original real after readReal, no omit initial", () => {
		fc.assert(
			fc.property(arbDyadic(), (x) => {
				const sx = [...genReal(x)];
				const rx = readReal(new IterReader(sx));
				expect(rx).conwayEq(x);
			}),
		);
	});
});

describe("genMono/readMono", () => {
	it("returns original real given zero exponent and real", () => {
		fc.assert(
			fc.property(
				arbDyadic(),
				(r) => {
					const se = [...genMono({ mono1: new IterReader([]), real: r })];
					const res = readMono(new IterReader(se));
					if (res === null) {
						expect(r).conwayEq(0n);
						return;
					}

					const { mono1: m1p1, real: r1 } = res;
					expect({
						real: r,
						exponent: [...groupBySign(m1p1)].map(lengthToString),
					}).toStrictEqual({
						real: expect.conwayEq(r1),
						exponent: [],
					});
				},
			),
		);
	});

	it("negation symmetry over real", () => {
		fc.assert(
			fc.property(arbGroupedSigns, arbDyadic(), (xs, real) => {
				const se1 = [...genMono({ mono1: new IterReader(xs), real })];
				const se2 = [
					...genMono({ mono1: new IterReader(xs), real: realNeg(real) }),
				];
				expect(se1.map(lengthToString)).toStrictEqual(
					se2.map(flipSign).map(lengthToString),
				);
			}),
		);
	});

	it("parses zero real", () => {
		fc.assert(
			fc.property(arbGroupedSigns, (xs) => {
				const se = [...genMono({ mono1: new IterReader(xs), real: 0n })];
				expect(se).toStrictEqual([]);
			}),
		);
	});

	it("parses zero exponent", () => {
		fc.assert(
			fc.property(arbDyadic(), (real) => {
				const se = [
					...groupBySign(genMono({ mono1: new IterReader([]), real })),
				];
				expect(se.map(lengthToString)).toStrictEqual(
					[...genReal(real)].map(lengthToString),
				);
			}),
		);
	});

	it("parses ordinal monomials (exponent + real)", () => {
		fc.assert(
			fc.property(arbOrd3, arbFiniteBigintOrd, (ord, real) => {
				const se = [
					...groupBySign(
						genMono({
							mono1: new IterReader([
								{
									sign: true,
									length: ord,
								},
							]),
							real,
						}),
					),
				];
				expect([...groupBySign(se)].map(lengthToString)).toStrictEqual(
					real === 0n
						? []
						: [
								{
									sign: true,
									length: `${mono(real, ord)}`,
								},
							],
				);
			}),
		);
	});

	const checkReturnOriginalExponent = ({ mono1, real }: { mono1: Entry[], real: Real }) => {
		const se = [...genMono({ mono1: new IterReader(mono1), real })];
		const res = readMono(new IterReader(se));
		if (res === null) {
			expect(real).conwayEq(0n);
			return;
		}

		const { mono1: m1p1, real: r1 } = res;
		expect({
			real: r1,
			exponent: [...groupBySign(m1p1)].map(lengthToString),
		}).toStrictEqual({
			real: r1,
			exponent: [...groupBySign(mono1)].map(lengthToString),
		});
	};

	it("returns original exponent and real given w^ordinal * real", () => {
		fc.assert(
			fc.property(
				arbDyadic(),
				arbOrd3,
				(real, o) => {
					checkReturnOriginalExponent({ mono1: [{ sign: true, length: o }], real });
				},
			),
		);
	});

	it("returns original exponent and real given w^exponent * real", () => {
		fc.assert(
			fc.property(
				arbDyadic(),
				arbGroupedSigns,
				(real, mono1) => {
					checkReturnOriginalExponent({ mono1, real });
				},
			),
		);
	});
});

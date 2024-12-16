import "../test/expect.test";
import fc from "fast-check";
import { arbDyadic, arbFiniteBigintOrd, arbOrd3 } from "./generators";
import {
	groupBySign,
	IterReader,
	type Entry,
} from "../signExpansion/reader/types";
import type { Ord0 } from "../conway";
import { ge, gt, isZero, le, lt, ne } from "../op/comparison";
import {
	genMono,
	genMono1,
	readMono,
	readMono1,
} from "../signExpansion/reader/mono";
import { ordinalAdd, ordinalRightSub } from "../op/ordinal";
import { mono, unit } from "../op";
import { genReal, readReal } from "../signExpansion/reader/real";
import { realAdd, realNeg, type Real } from "../real";
import { Dyadic } from "../dyadic";
import {
	commonPrefix,
	compareSign,
	compareSignExpansions,
	countSigns,
	findIndexToSign,
	index,
	truncate,
} from "../signExpansion/reader/split";
import {
	reduceMulti,
	reduceSignExpansion,
	unreduceMulti,
	unreduceSignExpansion,
} from "../signExpansion/reader/reduce";
import { propTotalOrder } from "./propsTest.test";

const arbEntry = (
	arbLength = arbOrd3 as fc.Arbitrary<Ord0>,
): fc.Arbitrary<Entry> =>
	fc.record<Entry>({
		sign: fc.boolean(),
		length: arbLength,
	});

const flipSign = ({ sign, length }: Entry) => ({
	sign: !sign,
	length,
});

const lengthToString = ({ sign, length }: Entry) => ({
	sign,
	length: `${length}`,
});

const signExpansionEq = (
	actual: Iterable<Entry>,
	expected: Iterable<Entry>,
) => {
	expect([...actual]).toStrictEqual(
		[...expected].map(({ sign, length }) => ({
			sign,
			length: expect.conwayEq(length),
		})),
	);
};

const groupedEq = (actual: Iterable<Entry>, expected: Iterable<Entry>) => {
	expect([...groupBySign(actual)]).toStrictEqual(
		[...groupBySign(expected)].map(({ sign, length }) => ({
			sign,
			length: expect.conwayEq(length),
		})),
	);
};

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
				signExpansionEq([...groupBySign(groupBySign(xs))], []);
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
				signExpansionEq(
					[...groupBySign(groupBySign(xs))],
					[...groupBySign(xs)],
				);
			}),
		);
	});

	it("idempotent (zero or non-zero entries)", () => {
		fc.assert(
			fc.property(fc.array(arbEntry()), (xs) => {
				signExpansionEq(
					[...groupBySign(groupBySign(xs))],
					[...groupBySign(xs)],
				);
			}),
		);
	});

	it("invariant under the insertion of zero-length entries", () => {
		fc.assert(
			fc.property(
				fc.array(arbEntry()),
				fc.integer({ min: 0 }),
				fc.boolean(),
				(xs, i, sign) => {
					fc.pre(i < xs.length);
					const xs1 = [...xs.slice(0, i), { sign, length: 0n }, ...xs.slice(i)];
					signExpansionEq([...groupBySign(xs1)], [...groupBySign(xs)]);
				},
			),
		);
	});
});

const arbSigns = fc.array(arbEntry(), { minLength: 0 });

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
				signExpansionEq(xs, xs1);
			}),
		);
	});

	it("readMono1 negation symmetry", () => {
		fc.assert(
			fc.property(arbGroupedSigns, (xs) => {
				const m1p = [...genMono1(new IterReader(xs))];
				const m1n = [...genMono1(new IterReader(xs))].map(flipSign);
				signExpansionEq(
					[...readMono1(new IterReader(m1p), true)],
					[...readMono1(new IterReader(m1n), false)],
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
				const snx = [...genReal(realNeg(x)).map(flipSign)];
				signExpansionEq(snx, sx);
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
			fc.property(arbDyadic(), (r) => {
				const se = [...genMono({ mono1: new IterReader([]), real: r })];
				const res = readMono(new IterReader(se));
				if (res === null) {
					expect(r).conwayEq(0n);
					return;
				}

				const { mono1: m1p1, real: r1 } = res;
				expect(r).conwayEq(r1);
				signExpansionEq([...groupBySign(m1p1)], []);
			}),
		);
	});

	it("negation symmetry over real", () => {
		fc.assert(
			fc.property(arbGroupedSigns, arbDyadic(), (xs, real) => {
				const se1 = [...genMono({ mono1: new IterReader(xs), real })];
				const se2 = [
					...genMono({ mono1: new IterReader(xs), real: realNeg(real) }),
				];
				signExpansionEq(se1, se2.map(flipSign));
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
				signExpansionEq(se, [...genReal(real)]);
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

	const checkReturnOriginalExponent = ({
		mono1,
		real,
	}: { mono1: Entry[]; real: Real }) => {
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
			fc.property(arbDyadic(), arbOrd3, (real, o) => {
				checkReturnOriginalExponent({
					mono1: [{ sign: true, length: o }],
					real,
				});
			}),
		);
	});

	it("returns original exponent and real given w^exponent * real", () => {
		fc.assert(
			fc.property(arbDyadic(), arbGroupedSigns, (real, mono1) => {
				checkReturnOriginalExponent({ mono1, real });
			}),
		);
	});
});

describe("countSigns", () => {
	it("zero for empty signs", () => {
		expect(countSigns(new IterReader([]), null)).conwayEq(0n);
		expect(countSigns(new IterReader([]), true)).conwayEq(0n);
		expect(countSigns(new IterReader([]), false)).conwayEq(0n);
	});

	const arbSignOrNull = fc.oneof(fc.boolean(), fc.constant(null));
	it("append property: countSigns(xs ++ ys, s) = countSigns(xs, s) + countSigns(ys, s)", () => {
		fc.assert(
			fc.property(arbSigns, arbSigns, arbSignOrNull, (xs, ys, s) => {
				const c1 = countSigns(new IterReader([...xs, ...ys]), s);
				const c2 = ordinalAdd(
					countSigns(new IterReader(xs), s),
					countSigns(new IterReader(ys), s),
				);
				expect(c1).conwayEq(c2);
			}),
		);
	});

	it("left addition property: countSigns([{ sign, length }] ++ xs, sign) = length + countSigns(xs, sign)", () => {
		fc.assert(
			fc.property(arbSigns, fc.boolean(), arbOrd3, (xs, sign, length) => {
				const c1 = countSigns(new IterReader(xs), sign);
				const actual = countSigns(
					new IterReader([{ sign, length }, ...xs]),
					sign,
				);
				expect(actual).conwayEq(ordinalAdd(length, c1));
			}),
		);
	});

	it("right addition property: countSigns(xs ++ [{ sign, length }], sign) = countSigns(xs, sign) + length", () => {
		fc.assert(
			fc.property(arbSigns, fc.boolean(), arbOrd3, (xs, sign, length) => {
				const c1 = countSigns(new IterReader(xs), sign);
				const actual = countSigns(
					new IterReader([...xs, { sign, length }]),
					sign,
				);
				expect(actual).conwayEq(ordinalAdd(c1, length));
			}),
		);
	});

	it("negation symmetry: countSigns(xs, s) = countSigns(!xs, !s)", () => {
		fc.assert(
			fc.property(arbSigns, fc.boolean(), (xs, sign) => {
				const c1 = countSigns(new IterReader(xs), sign);
				const c2 = countSigns(new IterReader(xs.map(flipSign)), !sign);
				expect(c2).conwayEq(c1);
			}),
		);
	});
});

describe("index", () => {
	it("returns null for empty sequences", () => {
		expect(index(new IterReader([]), 0n)).toBeNull();
		expect(index(new IterReader([]), 1n)).toBeNull();
		expect(index(new IterReader([]), unit)).toBeNull();
	});

	it("returns the sign of the first entry for zero index", () => {
		fc.assert(
			fc.property(
				arbSigns.filter((xs) => xs.length > 0 && !isZero(xs[0].length)),
				(xs) => {
					return xs[0].sign === index(new IterReader(xs), 0n);
				},
			),
		);
	});

	it("singleton: index([{ sign, length }], k) = sign for 0 <= k < length", () => {
		fc.assert(
			fc.property(fc.boolean(), arbOrd3, arbOrd3, (sign, length, i) => {
				fc.pre(lt(i, length));
				return index(new IterReader([{ sign, length }]), i) === sign;
			}),
		);
	});

	it("singleton, exclusive boundary: index([{ sign, length }], length) = null", () => {
		fc.assert(
			fc.property(
				fc.boolean(),
				arbOrd3,
				(sign, length) =>
					index(new IterReader([{ sign, length }]), length) === null,
			),
		);
	});

	it("exclusive boundary: index([{ sign, length },{ sign: !sign, ... }], length) = !sign", () => {
		fc.assert(
			fc.property(
				fc.boolean(),
				arbOrd3,
				arbOrd3.filter((x) => !isZero(x)),
				(sign, length, len1) =>
					index(
						new IterReader([
							{ sign, length },
							{ sign: !sign, length: len1 },
						]),
						length,
					) === !sign,
			),
		);
	});

	it("left offset property: index(xs, i) = index([{ sign, k }] ++ xs, k + i)", () => {
		fc.assert(
			fc.property(
				arbSigns,
				arbOrd3,
				fc.boolean(),
				arbOrd3,
				(xs, i, sign, length) => {
					fc.pre(index(new IterReader(xs), i) !== null);
					return (
						index(new IterReader(xs), i) ===
						index(
							new IterReader([{ length, sign }, ...xs]),
							ordinalAdd(length, i),
						)
					);
				},
			),
		);
	});

	it("right concat property: index(xs, i) = index(xs ++ ys, i)", () => {
		fc.assert(
			fc.property(arbSigns, arbSigns, arbOrd3, (xs, ys, i) => {
				fc.pre(index(new IterReader(xs), i) !== null);
				return (
					index(new IterReader(xs), i) ===
					index(new IterReader([...xs, ...ys]), i)
				);
			}),
		);
	});
});

describe("truncate", () => {
	it("length of truncated: |truncate(S, n)| = min(|S|, n)", () => {
		fc.assert(
			fc.property(arbSigns, arbOrd3, (xs, n) => {
				const truncated = [...truncate(new IterReader(xs), n)];
				const len = countSigns(new IterReader(truncated));
				expect(len).conwayEq(lt(n, len) ? n : len);
			}),
		);
	});

	it("excessive length: truncate(S, n) = S if n = |S|", () => {
		fc.assert(
			fc.property(arbSigns, (xs) => {
				const len = countSigns(new IterReader(xs));
				groupedEq([...truncate(new IterReader(xs), len)], xs);
			}),
		);
	});

	it("excessive length: truncate(S, n) = S if n >= |S|", () => {
		fc.assert(
			fc.property(arbSigns, arbOrd3, (xs, n) => {
				const len = countSigns(new IterReader(xs));
				fc.pre(ge(n, len));
				groupedEq([...truncate(new IterReader(xs), n)], xs);
			}),
		);
	});

	it("indexing: index(truncate(S, n), i) = index(S, i) if i < n", () => {
		fc.assert(
			fc.property(arbSigns, arbOrd3, arbOrd3, (xs, i, n) => {
				fc.pre(lt(i, n));
				expect(index(new IterReader(truncate(new IterReader(xs), n)), i)).toBe(
					index(new IterReader(xs), i),
				);
			}),
		);
	});

	it("indexing: index(truncate(S, n), i) = null if i >= n", () => {
		fc.assert(
			fc.property(arbSigns, arbOrd3, arbOrd3, (xs, i, n) => {
				fc.pre(ge(i, n));
				expect(
					index(new IterReader(truncate(new IterReader(xs), n)), i),
				).toBeNull();
			}),
		);
	});
});

describe("findIndexToSign", () => {
	it("findIndexToSign([{ sign, length }], i, !sign) = null", () => {
		fc.assert(
			fc.property(arbOrd3, arbOrd3, fc.boolean(), (length, i, sign) => {
				fc.pre(lt(i, length));
				const idx = findIndexToSign(
					new IterReader([{ sign, length }]),
					i,
					!sign,
				);
				expect(idx).toBeNull();
			}),
		);
	});

	it("findIndexToSign([{ sign, length }], i, sign) = i for i < length", () => {
		fc.assert(
			fc.property(arbOrd3, arbOrd3, fc.boolean(), (length, i, sign) => {
				fc.pre(lt(i, length));
				const idx = findIndexToSign(
					new IterReader([{ sign, length }]),
					i,
					sign,
				);
				expect(idx).conwayEq(i);
			}),
		);
	});

	it("findIndexToSign([{ sign: !sign, length: len1 }, { sign, length: len2 }], i, sign) = len1 + i for i < len2", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				arbOrd3,
				arbOrd3,
				fc.boolean(),
				(len1, len2, i, sign) => {
					fc.pre(lt(i, len2));
					const idx = findIndexToSign(
						new IterReader([
							{ sign: !sign, length: len1 },
							{ sign, length: len2 },
						]),
						i,
						sign,
					);
					expect(idx).conwayEq(ordinalAdd(len1, i));
				},
			),
		);
	});

	it("index(S, findIndexToSign(S, i, sign)) = sign if defined", () => {
		fc.assert(
			fc.property(arbSigns, arbOrd3, fc.boolean(), (xs, i, sign) => {
				const idx = findIndexToSign(new IterReader(xs), i, sign);
				const length = countSigns(new IterReader(xs));
				fc.pre(idx !== null && ne(length, idx));
				expect(index(new IterReader(xs), idx)).toBe(sign);
			}),
		);
	});

	it("countSigns(truncate(S, findIndexToSign(S, i, sign)), sign) = i", () => {
		fc.assert(
			fc.property(arbSigns, arbOrd3, fc.boolean(), (xs, i, sign) => {
				const length = countSigns(new IterReader(xs));
				fc.pre(lt(i, length));
				const idx = findIndexToSign(new IterReader(xs), i, sign);
				fc.pre(idx !== null);
				const trunc = [...truncate(new IterReader(xs), idx)];
				expect(countSigns(new IterReader(trunc), sign)).conwayEq(i);
			}),
		);
	});
});

describe("commonPrefix", () => {
	it("with self: commonPrefix(S, S) = S", () => {
		fc.assert(
			fc.property(arbSigns, (xs) => {
				groupedEq(commonPrefix(new IterReader(xs), new IterReader(xs)), xs);
			}),
		);
	});

	it("zero: commonPrefix(S, empty) = commonPrefix(empty, S) = empty", () => {
		fc.assert(
			fc.property(arbSigns, (xs) => {
				groupedEq(commonPrefix(new IterReader(xs), new IterReader([])), []);
				groupedEq(commonPrefix(new IterReader([]), new IterReader(xs)), []);
			}),
		);
	});

	it("commutative: commonPrefix(S, T) = commonPrefix(T, S)", () => {
		fc.assert(
			fc.property(arbSigns, arbSigns, (xs, ys) => {
				groupedEq(
					commonPrefix(new IterReader(xs), new IterReader(ys)),
					commonPrefix(new IterReader(ys), new IterReader(xs)),
				);
			}),
		);
	});

	it("associative: commonPrefix(commonPrefix(S, T), U) = commonPrefix(S, commonPrefix(T, U))", () => {
		fc.assert(
			fc.property(arbSigns, arbSigns, arbSigns, (xs, ys, zs) => {
				groupedEq(
					commonPrefix(
						new IterReader(
							commonPrefix(new IterReader(xs), new IterReader(ys)),
						),
						new IterReader(zs),
					),
					commonPrefix(
						new IterReader(xs),
						new IterReader(
							commonPrefix(new IterReader(ys), new IterReader(zs)),
						),
					),
				);
			}),
		);
	});

	it("does not increase length", () => {
		fc.assert(
			fc.property(arbSigns, arbSigns, (xs, ys) => {
				const lenX = countSigns(new IterReader(xs));
				const lenY = countSigns(new IterReader(xs));
				const lenZ = countSigns(
					new IterReader([
						...commonPrefix(new IterReader(xs), new IterReader(ys)),
					]),
				);
				return le(lenZ, lenX) && le(lenZ, lenY);
			}),
		);
	});

	it("agreement: index(S, i) = index(T, i) = index(commonPrefix(S, T), i) for i < |commonPrefix(S, T)|", () => {
		fc.assert(
			fc.property(arbSigns, arbSigns, arbOrd3, (xs, ys, i) => {
				const cp = [...commonPrefix(new IterReader(xs), new IterReader(ys))];
				const len = countSigns(new IterReader(cp));
				fc.pre(lt(i, len));
				return (
					index(new IterReader(xs), i) === index(new IterReader(ys), i) &&
					index(new IterReader(xs), i) === index(new IterReader(cp), i)
				);
			}),
		);
	});

	it("divergence: index(S, |commonPrefix(S, T)|) != index(T, |commonPrefix(S, T)|) ", () => {
		fc.assert(
			fc.property(arbSigns, arbSigns, (xs, ys) => {
				const cp = [...commonPrefix(new IterReader(xs), new IterReader(ys))];
				const i = countSigns(new IterReader(cp));
				const lenX = countSigns(new IterReader(xs));
				const lenY = countSigns(new IterReader(ys));
				fc.pre(lt(i, lenX) && lt(i, lenY));
				return index(new IterReader(xs), i) !== index(new IterReader(ys), i);
			}),
		);
	});
});

describe("compareSign", () => {
	it("increasing -> 1", () => {
		expect(compareSign(null, true)).toBe(1);
		expect(compareSign(false, true)).toBe(1);
		expect(compareSign(false, null)).toBe(1);
	});

	it("decreasing -> -1", () => {
		expect(compareSign(true, null)).toBe(-1);
		expect(compareSign(true, false)).toBe(-1);
		expect(compareSign(null, false)).toBe(-1);
	});

	it("same -> 0", () => {
		expect(compareSign(true, true)).toBe(0);
		expect(compareSign(false, false)).toBe(0);
		expect(compareSign(null, null)).toBe(0);
	});

	it("reversal negation", () => {
		expect(compareSign(true, false)).toBe(-compareSign(false, true));
		expect(compareSign(true, null)).toBe(-compareSign(null, true));
		expect(compareSign(null, false)).toBe(-compareSign(false, null));
	});
});

describe("compareSignExpansions", () => {
	propTotalOrder(
		it,
		arbSigns,
		(a, b) => compareSignExpansions(new IterReader(a), new IterReader(b)),
		(a, b) => compareSignExpansions(new IterReader(a), new IterReader(b)) === 0,
	);
});

describe("reduceSignExpansion/unreduceSignExpansion", () => {
	it("empty parent: reduceSignExpansion(x, []) = x", () => {
		fc.assert(
			fc.property(arbSigns, (x) => {
				const xo = [
					...reduceSignExpansion(new IterReader(x), new IterReader([])),
				];
				groupedEq(x, xo);
			}),
		);
	});

	it("empty parent: unreduceSignExpansion(x, []) = x", () => {
		fc.assert(
			fc.property(arbSigns, (x) => {
				const xo = [
					...unreduceSignExpansion(new IterReader(x), new IterReader([])),
				];
				groupedEq(x, xo);
			}),
		);
	});

	const arbPair = fc.tuple(arbSigns, arbSigns);

	it("unreduce does not decrease length", () => {
		fc.assert(
			fc.property(arbPair, ([xo, p]) => {
				const x = [
					...unreduceSignExpansion(new IterReader(xo), new IterReader(p)),
				];
				expect(
					ge(countSigns(new IterReader(x)), countSigns(new IterReader(xo))),
				).toBe(true);
			}),
		);
	});

	it("invertible: xo = reduceSignExpansion(unreduceSignExpansion(xo), p)", () => {
		fc.assert(
			fc.property(arbPair, ([xo, p]) => {
				const x = [
					...unreduceSignExpansion(new IterReader(xo), new IterReader(p)),
				];
				const xo1 = [
					...reduceSignExpansion(new IterReader(x), new IterReader(p)),
				];
				groupedEq(xo1, xo);
			}),
		);
	});

	it("invertible: x = unreduceSignExpansion(reduceSignExpansion(x), p) for x < p", () => {
		const arbPair = fc
			.tuple(arbSigns, arbSigns)
			.filter(
				([xs, ys]) =>
					compareSignExpansions(new IterReader(xs), new IterReader(ys)) === 1,
			);
		fc.assert(
			fc.property(arbPair, ([x, p]) => {
				const reduced = [
					...reduceSignExpansion(new IterReader(x), new IterReader(p)),
				];
				const x1 = [
					...unreduceSignExpansion(new IterReader(reduced), new IterReader(p)),
				];
				groupedEq(x1, x);
			}),
		);
	});
});

describe("reduceMulti/unreduceMulti", () => {
	const arbDecreasing = fc
		.array(arbSigns)
		.filter((xs) => {
			const n = xs.length;
			if (n < 2) {
				return true;
			}

			for (let i = 0; i < n; i++) {
				for (let j = 0; j < i; j++) {
					if (
						compareSignExpansions(
							new IterReader(xs[i]),
							new IterReader(xs[j]),
						) !== -1
					) {
						return false;
					}
				}
			}
			return true;
		})
		.map((xs) =>
			[...xs].sort((a, b) =>
				compareSignExpansions(new IterReader(a), new IterReader(b)),
			),
		);

	const arbUnreduceInput = arbDecreasing.map(reduceMulti);

	it("unreduceMulti: same as unreduceSignExpansion for 2 elements", () => {
		fc.assert(
			fc.property(
				arbUnreduceInput
					.filter((xs) => xs.length >= 2)
					.map((xs) => [xs[0], xs[1]]),
				([p, xo]) => {
					const xs = unreduceMulti([p, xo]);
					const x1 = unreduceSignExpansion(
						new IterReader(xo),
						new IterReader(p),
					);
					expect(xs).toHaveLength(2);
					groupedEq(xs[0], p);
					groupedEq(xs[1], x1);
				},
			),
		);
	});

	it("reduceMulti: same as reduceSignExpansion for 2 elements", () => {
		fc.assert(
			fc.property(
				arbDecreasing
					.filter((xs) => xs.length >= 2)
					.map((xs) => [xs[0], xs[1]]),
				([p, x]) => {
					const xs = reduceMulti([p, x]);
					const xo = reduceSignExpansion(new IterReader(x), new IterReader(p));
					expect(xs).toHaveLength(2);
					groupedEq(xs[0], p);
					groupedEq(xs[1], xo);
				},
			),
		);
	});

	it("the return value of unreduceMulti is decreasing", () => {
		fc.assert(
			fc.property(arbUnreduceInput, (xs) => {
				const x1 = unreduceMulti(xs);
				for (let i = 0; i < x1.length - 1; i++) {
					expect(
						compareSignExpansions(
							new IterReader(x1[i]),
							new IterReader(x1[i + 1]),
						),
					).toBe(-1);
				}
			}),
		);
	});

	it("invertible: xos = reduceMulti(unreduceMulti(xos))", () => {
		fc.assert(
			fc.property(arbUnreduceInput, (xos) => {
				const xs = unreduceMulti(xos);
				expect(xs).toHaveLength(xos.length);
				const xos1 = reduceMulti(xs);
				expect(xos1).toHaveLength(xos.length);
				for (let i = 0; i < xos.length; i++) {
					groupedEq(xos[i], xos1[i]);
				}
			}),
		);
	});

	it("invertible: xs = unreduceMulti(reduceMulti(xs))", () => {
		fc.assert(
			fc.property(arbDecreasing, (xs) => {
				const xos = reduceMulti(xs);
				expect(xos).toHaveLength(xs.length);
				const x1 = unreduceMulti(xos);
				expect(x1).toHaveLength(xs.length);
				for (let i = 0; i < xs.length; i++) {
					groupedEq(xs[i], x1[i]);
				}
			}),
		);
	});

	it("invertible: reduceMulti plus one", () => {
		fc.assert(
			fc.property(
				arbOrd3.map((p) => {
					return [
						[
							{ sign: false, length: p },
							{ sign: true, length: 1n as Ord0 },
						],
						[{ sign: false, length: p }],
					];
				}),
				(xs) => {
					const xos = reduceMulti(xs);
					expect(xos).toHaveLength(xs.length);
					const x1 = unreduceMulti(xos);
					expect(x1).toHaveLength(xs.length);
					for (let i = 0; i < xs.length; i++) {
						groupedEq(xs[i], x1[i]);
					}
				},
			),
		);
	});

	it("invertible: unreduceMulti plus one", () => {
		fc.assert(
			fc.property(
				arbOrd3.map((p) => {
					return [
						[
							{ sign: false, length: p },
							{ sign: true, length: 1n as Ord0 },
						],
						[{ sign: false, length: p }],
					];
				}),
				(xos) => {
					const xs = unreduceMulti(xos);
					expect(xs).toHaveLength(xos.length);
					const xos1 = reduceMulti(xs);
					expect(xos1).toHaveLength(xos.length);
					for (let i = 0; i < xos.length; i++) {
						groupedEq(xos[i], xos1[i]);
					}
				},
			),
		);
	});
});

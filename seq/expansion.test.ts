import fc from "fast-check";
import { isPositive, isZero, lt } from "../op/comparison";
import type { Seq } from "./types";
import { assertEq } from "../test/propsTest";
import { SeqExpansion, type ExpansionEntryConstructor } from "./expansion";
import { ensure, one, zero } from "../op";
import { concat, cycleArray, empty, fromArray } from ".";
import { arbFiniteBigintOrd, arbOrd2, arbOrd3 } from "../test/generators";
import { ordinalMult } from "../op/ordinal";
import type { Ord } from "../conway";

type Value = number;
const arbValue: fc.Arbitrary<Value> = fc.integer({ min: 0, max: 1000 });
const arbArray = fc.array(arbValue, { minLength: 0, maxLength: 100 });

// [[[value], reps]]
const arbSERepSingleton = fc.tuple(arbValue, arbOrd3).map(([value, reps]) => ({
	value,
	reps,
	seq: new SeqExpansion<Value>([[[value], reps]]),
}));

// [[arr, one]]
const arbSESingleArray = arbArray.map((array) => ({
	array,
	seq: new SeqExpansion<Value>([[array, one]]),
}));

// [[a0, one], [a1, one], ...]
const arbSEMultiSingleArray = fc
	.array(arbArray, { minLength: 0, maxLength: 10 })
	.map((arrays) => ({
		arrays,
		seq: new SeqExpansion<Value>(
			arrays.map((a) => [a, one] as ExpansionEntryConstructor<Value>),
		),
	}));

// [[a0, one], [a1, one], ...]
const arbSERepMultiArray = fc
	.array(fc.tuple(arbArray, arbOrd2), { minLength: 0, maxLength: 10 })
	.map((arrays) => ({
		arrays,
		seq: new SeqExpansion<Value>(
			arrays.map(([a, r]) => [a, r] as ExpansionEntryConstructor<Value>),
		),
	}));

const arbSE0 = fc
	.oneof(
		arbSERepSingleton,
		arbSESingleArray,
		arbSEMultiSingleArray,
		arbSERepMultiArray,
	)
	.map((x) => x.seq);
const arbSE = (arb: fc.Arbitrary<SeqExpansion<Value>>) => fc.oneof(arb, arbSE0);
const arbSE1 = arbSE(arbSE0);
const arbSE2 = arbSE(arbSE1);
const arbSE3 = arbSE(arbSE2);

const ensureSeqEquiv = <T>(s1: Seq<T>, s2: Seq<T>, i: Ord) => {
	assertEq(s1.length, s2.length);
	fc.pre(lt(i, s1.length));
	expect(s1.index(i)).toBe(s2.index(i));
	return true;
};

describe("rep of a single element", () => {
	it("length equals reps", () => {
		fc.assert(
			fc.property(arbSERepSingleton, ({ reps, seq }) => {
				return assertEq(reps, seq.length);
			}),
		);
	});

	it("is constant", () => {
		fc.assert(
			fc.property(arbSERepSingleton, ({ seq }) => {
				return seq.isConstant;
			}),
		);
	});

	it("first value (non-empty only)", () => {
		fc.assert(
			fc.property(
				arbSERepSingleton.filter(({ reps }) => !isZero(reps)),
				({ value, seq }) => {
					expect(seq.index(zero)).toBe(value);
				},
			),
		);
	});
});

describe("rep single array", () => {
	it("length equals array length", () => {
		fc.assert(
			fc.property(arbSESingleArray, ({ array, seq }) => {
				assertEq(ensure(array.length), seq.length);
			}),
		);
	});

	it("all index below array length equal to array value", () => {
		fc.assert(
			fc.property(arbSESingleArray, ({ array, seq }) => {
				expect(array.map((_, i) => seq.index(ensure(i)))).toEqual(array);
			}),
		);
	});

	it("equivalent to seq from array", () => {
		fc.assert(
			fc.property(
				arbSESingleArray,
				arbFiniteBigintOrd.map(ensure),
				({ array, seq }, i) => {
					ensureSeqEquiv(fromArray(array), seq, i);
				},
			),
		);
	});
});

describe("rep of multi single arrays", () => {
	it("length equals sum of lengths", () => {
		fc.assert(
			fc.property(arbSEMultiSingleArray, ({ arrays, seq }) => {
				assertEq(
					ensure(arrays.reduce((s, { length }) => s + length, 0)),
					seq.length,
				);
			}),
		);
	});

	it("equivalent of concat of arrays", () => {
		fc.assert(
			fc.property(
				arbSEMultiSingleArray,
				arbFiniteBigintOrd.map(ensure),
				({ arrays, seq }, i) => {
					ensureSeqEquiv(
						arrays.reduce(
							(s, a) => concat(s, fromArray(a)),
							empty as Seq<Value>,
						),
						seq,
						i,
					);
				},
			),
		);
	});
});

describe("rep of multi arrays", () => {
	it("length equals sum of lengths", () => {
		fc.assert(
			fc.property(arbSERepMultiArray, ({ arrays, seq }) => {
				assertEq(
					ensure(
						arrays.reduce(
							(s, [{ length }, r]) => s.ordinalAdd(ordinalMult(length, r)),
							zero,
						),
					),
					seq.length,
				);
			}),
		);
	});

	it("equivalent of concat of arrays", () => {
		fc.assert(
			fc.property(
				arbSERepMultiArray,
				arbFiniteBigintOrd.map(ensure),
				({ arrays, seq }, i) => {
					const reduced = arrays.reduce(
						(s, [a, r]) =>
							concat(s, cycleArray(a, ensure(a.length).ordinalMult(r))),
						empty as Seq<Value>,
					);
					return ensureSeqEquiv(reduced, seq, i);
				},
			),
		);
	});
});

describe("constant folding", () => {
	it("fold 2 adjacent singleton values", () => {
		fc.assert(
			fc.property(
				arbValue.map((x) => [x]),
				arbOrd3.filter(isPositive),
				arbOrd3.filter(isPositive),
				(vs, x, y) => {
					const se = new SeqExpansion<Value>([
						[vs, x],
						[vs, y],
					]);
					expect(se.entries).toHaveLength(1);
				},
			),
		);
	});

	it("fold 3 adjacent singleton values", () => {
		fc.assert(
			fc.property(
				arbValue.map((x) => [x]),
				arbOrd3.filter(isPositive),
				arbOrd3.filter(isPositive),
				arbOrd3.filter(isPositive),
				(vs, x, y, z) => {
					const se = new SeqExpansion<Value>([
						[vs, x],
						[vs, y],
						[vs, z],
					]);
					expect(se.entries).toHaveLength(1);
				},
			),
		);
	});

	it("fold 2 adjacent singleton values in the middle", () => {
		fc.assert(
			fc.property(
				arbValue.map((x) => [x]),
				arbValue.map((x) => [x]),
				arbValue.map((x) => [x]),
				arbOrd3.filter(isPositive),
				arbOrd3.filter(isPositive),
				arbOrd3.filter(isPositive),
				arbOrd3.filter(isPositive),
				(vs1, vs2, vs3, p, q, x, y) => {
					const se = new SeqExpansion<Value>([
						[vs1, p],
						[vs2, x],
						[vs2, y],
						[vs3, q],
					]);
					try {
						expect(se.entries.length).toBeLessThanOrEqual(3);
					} catch (err) {
						console.error({ err, se, e: se.entries });
						throw err;
					}
				},
			),
		);
	});
});

describe("flattening", () => {
	it("filters out zero-length entries", () => {
		fc.assert(
			fc.property(
				arbSE3,
				(f) => f.entries.findIndex(({ length }) => isZero(length)) === -1,
			),
		);
	});

	it("flatten anything repeated once", () => {
		fc.assert(
			fc.property(
				arbSE3.filter((x) => !x.isEmpty),
				(f) => new SeqExpansion([[f, one]]).entries.length === f.entries.length,
			),
		);
	});

	it("folds adjacent constants (in general)", () => {
		fc.assert(
			fc.property(
				arbSE3.filter((f) => f.entries.length > 1),
				(f) => {
					const n = f.entries.length;
					for (let i = 0; i + 1 < n; i++) {
						const e1 = f.entries[i];
						const e2 = f.entries[i + 1];
						if (e1.isConstant && e2.isConstant) {
							const v1 = Array.isArray(e1.seq) ? e1.seq[0] : e1.seq.index(zero);
							const v2 = Array.isArray(e2.seq) ? e2.seq[0] : e2.seq.index(zero);
							if (v1 === v2) {
								return false;
							}
						}
					}
					return true;
				},
			),
		);
	});
});

describe("concat", () => {
	it("empty and empty", () => {
		assertEq(
			SeqExpansion.concat(SeqExpansion.empty, SeqExpansion.empty).length,
			zero,
		);
	});

	it("lengths add up", () => {
		fc.assert(
			fc.property(arbSE3, arbSE3, (f, g) =>
				assertEq(
					SeqExpansion.concat(f, g).length,
					f.length.ordinalAdd(g.length),
				),
			),
		);
	});

	it("first element", () => {
		fc.assert(
			fc.property(
				arbSE3.filter((f) => !f.isEmpty),
				arbSE3,
				(f, g) => f.index(zero) === SeqExpansion.concat(f, g).index(zero),
			),
		);
	});

	it("non-empty and empty - same length", () => {
		fc.assert(
			fc.property(
				arbSE3.filter((f) => !f.isEmpty),
				(f) =>
					assertEq(f.length, SeqExpansion.concat(f, SeqExpansion.empty).length),
			),
		);
	});

	it("non-empty and empty", () => {
		fc.assert(
			fc.property(
				arbSE3.filter((f) => !f.isEmpty),
				(f) =>
					f.index(zero) ===
					SeqExpansion.concat(f, SeqExpansion.empty).index(zero),
			),
		);
	});

	it("first element of empty and non-empty", () => {
		fc.assert(
			fc.property(
				arbSE3.filter((f) => !f.isEmpty),
				(g) =>
					g.index(zero) ===
					SeqExpansion.concat(SeqExpansion.empty, g).index(zero),
			),
		);
	});
});

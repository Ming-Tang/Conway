import fc from "fast-check";
import { concat, cycle, cycleArray, fromArray, type Seq } from ".";
import { arbOrd2 } from "../test/generators";
import { eq, lt, ne } from "../op/comparison";
import { ordinalAdd } from "../op/ordinal";

const arbElem = fc.integer({ min: 0 });
const arbFromArray = fc.array(arbElem, { maxLength: 50 }).map(fromArray);
const arbCycleArray = fc.array(arbElem, { maxLength: 10 }).map(cycleArray);
const arbCycle = (arb: fc.Arbitrary<Seq<number>>) => arb.map(cycle);
const arbConcat = (arb: fc.Arbitrary<Seq<number>>) =>
	fc.tuple(arb, arb).map(([a, b]) => concat(a, b));

const arbSeq0 = fc.oneof(arbFromArray, arbCycleArray);
const arbSeqNext = (arb: fc.Arbitrary<Seq<number>>) =>
	fc.oneof(arb, arbCycle(arb), arbConcat(arb));
const arbSeq1 = arbSeqNext(arbSeq0);
const arbSeq2 = arbSeqNext(arbSeq1);

describe.skip("sample", () => {
	it("arbSeq0", () => {
		for (const s of fc.sample(arbSeq0, 10)) {
			console.log(s);
		}
	});

	it("arbSeq1", () => {
		for (const s of fc.sample(arbSeq1, 10)) {
			console.log(s);
		}
	});

	it("arbSeq2", () => {
		for (const s of fc.sample(arbSeq2, 10)) {
			console.log(s);
		}
	});
});

describe("concat", () => {
	it("index does not throw for valid indices", () => {
		fc.assert(
			fc.property(arbSeq2, arbOrd2, (f, i) => {
				fc.pre(lt(i, f.length));
				f.index(i);
				return true;
			}),
		);
	});

	it("index throws for index = length", () => {
		fc.assert(
			fc.property(arbSeq2, (f) => {
				try {
					f.index(f.length);
					return false;
				} catch {
					return true;
				}
			}),
		);
	});

	it("length: |f & g| = |f| + |g|", () => {
		fc.assert(
			fc.property(arbSeq2, arbSeq2, (f, g) => {
				return eq(concat(f, g).length, ordinalAdd(f.length, g.length));
			}),
		);
	});

	it("associative, same length and indexing: ((f & g) & h)[i] = (f & (g & h))[i]", () => {
		fc.assert(
			fc.property(arbSeq2, arbSeq2, arbSeq2, arbOrd2, (f, g, h, i) => {
				const left = concat(concat(f, g), h);
				const right = concat(f, concat(g, h));
				if (ne(left.length, right.length)) {
					throw new Error("different lengths");
				}
				fc.pre(lt(i, left.length));
				return left.index(i) === right.index(i);
			}),
		);
	});
});

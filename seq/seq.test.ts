import fc from "fast-check";
import {
	concat,
	cycle,
	cycleArray,
	empty,
	fromArray,
	identity,
	map,
	prod,
	type Seq,
} from ".";
import { arbFiniteBigintOrd, arbOrd3 } from "../test/generators";
import { eq, ge, isPositive, isZero, lt, ne } from "../op/comparison";
import { isLimit, ordinalAdd, ordinalMult } from "../op/ordinal";
import { ensure, one, unit, zero } from "../op";
import { Conway } from "../conway";
import { assertEq } from "../test/propsTest";

fc.configureGlobal({ numRuns: 2000, verbose: false });

const arbElem = fc.integer({ min: 0 });
// Prevent empty arrays so shrinking eliminate them
const arbFromArray = fc
	.array(arbElem, { minLength: 1, maxLength: 50 })
	.map(fromArray);
const arbCycleArray = fc
	.array(arbElem, { minLength: 1, maxLength: 10 })
	.map(cycleArray);
const arbCycle = (arb: fc.Arbitrary<Seq<number>>) => arb.map(cycle);
const arbConcat = (arb: fc.Arbitrary<Seq<number>>) =>
	fc.tuple(arb, arb).map(([a, b]) => concat(a, b));

const arbSeq0 = fc.oneof(arbFromArray, arbCycleArray);
const arbSeqNext = (arb: fc.Arbitrary<Seq<number>>) =>
	fc.oneof(arb, arbCycle(arb), arbConcat(arb));
const arbSeq1 = arbSeqNext(arbSeq0);
const arbSeq2 = arbSeqNext(arbSeq1);
const arbSeq3 = arbSeqNext(arbSeq2);

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

describe("fromArray", () => {
	it("fromArray([]).length = 0", () => {
		expect(isZero(fromArray([]).length)).toBe(true);
	});
});

describe("cycleArray", () => {
	it("cycleArray([]).length = 0", () => {
		expect(isZero(cycleArray([]).length)).toBe(true);
	});
});

describe("concat: f & g", () => {
	it("index does not throw for valid indices", () => {
		fc.assert(
			fc.property(arbSeq3, arbOrd3, (f, i) => {
				fc.pre(lt(i, f.length));
				f.index(i);
				return true;
			}),
		);
	});

	it("index throws for index = length", () => {
		fc.assert(
			fc.property(arbSeq3, (f) => {
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
			fc.property(arbSeq3, arbSeq3, (f, g) => {
				return eq(concat(f, g).length, ordinalAdd(f.length, g.length));
			}),
		);
	});

	it("associative, same length and indexing: ((f & g) & h)[i] = (f & (g & h))[i]", () => {
		fc.assert(
			fc.property(arbSeq3, arbSeq3, arbSeq3, arbOrd3, (f, g, h, i) => {
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

	it("empty & empty = empty", () => {
		expect(concat(empty, empty).length.isZero).toBe(true);
	});

	it("(empty & f)[i] = f[i]", () => {
		fc.assert(
			fc.property(arbSeq3, arbOrd3, (f, i) => {
				fc.pre(lt(i, f.length));
				return concat(empty, f).index(i) === f.index(i);
			}),
		);
	});

	it("(f & empty)[i] = f[i]", () => {
		fc.assert(
			fc.property(arbSeq3, arbOrd3, (f, i) => {
				fc.pre(lt(i, f.length));
				return concat(f, empty).index(i) === f.index(i);
			}),
		);
	});

	it("(f & g)[|f|] = g[0]", () => {
		fc.assert(
			fc.property(arbSeq3, arbSeq3, (f, g) => {
				fc.pre(isPositive(f.length) && isPositive(g.length));
				return concat(f, g).index(f.length) === g.index(Conway.zero);
			}),
		);
	});

	it("(f & f)[|f| + i] = f[i]", () => {
		fc.assert(
			fc.property(arbSeq3, arbOrd3, (f, i) => {
				fc.pre(isPositive(f.length) && lt(i, f.length));
				return (
					concat(f, f).index(ensure(ordinalAdd(f.length, i))) === f.index(i)
				);
			}),
		);
	});
});

describe("cycle", () => {
	it("cycle(empty) = empty", () => {
		expect(cycle(empty).length.isZero).toBe(true);
	});

	describe("finite by finite", () => {
		it("|cycle(f, n)| = |f| * |n|", () => {
			fc.assert(
				fc.property(
					fc.array(arbElem, { minLength: 0, maxLength: 50 }),
					arbFiniteBigintOrd,
					(xs, k) =>
						assertEq(
							cycle(fromArray(xs), ensure(k)).length,
							BigInt(xs.length) * k,
						),
				),
			);
		});

		it("|cycle(f, n)|[i] = f[i % |f|]", () => {
			fc.assert(
				fc.property(
					fc.array(arbElem, { minLength: 0, maxLength: 50 }),
					arbFiniteBigintOrd,
					arbFiniteBigintOrd,
					(xs, k, i) => {
						const c = cycle(fromArray(xs), ensure(k));
						fc.pre(lt(i * BigInt(xs.length), c.length));
						return c.index(ensure(i)) === xs[Number(i) % xs.length];
					},
				),
			);
		});
	});

	it("singleton f: cycle(f)[i] == f[0]", () => {
		fc.assert(
			fc.property(arbElem, arbOrd3, arbOrd3, (f0, i, k) => {
				const f = cycle(fromArray([f0]), k);
				fc.pre(lt(i, f.length));
				return f.index(i) === f0;
			}),
		);
	});

	it("|cycle(f, k)| = |f| k, where k is finite", () => {
		fc.assert(
			fc.property(arbSeq3, arbOrd3, (f, k) => {
				fc.pre(f.length.isAboveReals);
				fc.pre(!k.isZero && k.realPart !== null);
				assertEq(cycle(f, k).length, ordinalMult(f.length, k));
			}),
		);
	});

	it("|cycle(f, k)| = k, where 0 < |f| < w and k is limit", () => {
		fc.assert(
			fc.property(arbFromArray, arbOrd3, (f, k) => {
				fc.pre(isLimit(k));
				assertEq(cycle(f, k).length, k);
			}),
		);
	});

	it("|cycle(empty, k)| = 0", () => {
		fc.assert(fc.property(arbOrd3, (k) => cycle(empty, k).length.isZero));
	});

	it("cycle(f, n)[|f| + i] = (f & f)[|f| + i]", () => {
		fc.assert(
			fc.property(
				arbSeq3,
				arbOrd3,
				arbOrd3.filter((x) => ge(x, 2)),
				(f, i, n) => {
					const f1 = cycle(f, n);
					const f2 = concat(f, f);
					fc.pre(f1.length.isPositive && f2.length.isPositive);
					fc.pre(lt(i, f1.length));
					const i1 = f.length.ordinalAdd(i);
					fc.pre(lt(i1, f2.length));
					return f1.index(i) === f2.index(i1);
				},
			),
		);
	});

	it("cycle(f, n)[i] = cycle(f, n)[|f| + i]", () => {
		fc.assert(
			fc.property(
				arbSeq3,
				arbOrd3,
				arbOrd3.filter((x) => ge(x, 2)),
				(f, i, n) => {
					fc.pre(ge(n, 2));
					const g = cycle(f, n);
					fc.pre(f.length.isPositive && g.length.isPositive);
					fc.pre(lt(i, g.length));
					const i1 = f.length.ordinalAdd(i);
					fc.pre(lt(i1, g.length));
					return g.index(i) === g.index(i1);
				},
			),
		);
	});
});

describe("map", () => {
	const id = <T>(x: T) => x;
	const arbMapping = fc.func(arbElem) as fc.Arbitrary<(v: number) => number>;

	it("|map(func, empty)| = 0", () => {
		fc.assert(
			fc.property(arbMapping, (func) =>
				assertEq(map(empty as Seq<number>, func).length, zero),
			),
		);
	});

	it("|map(f, func)| = |f|", () => {
		fc.assert(
			fc.property(arbSeq3, arbMapping, (f, func) =>
				assertEq(map(f, func).length, f.length),
			),
		);
	});

	it("map(f, id)[i] = f[i]", () => {
		fc.assert(
			fc.property(arbSeq3, arbOrd3, (f, i) => {
				fc.pre(lt(i, f.length));
				map(f, id).index(i) === f.index(i);
			}),
		);
	});

	it("map(f, func)[i] = func(f[i])", () => {
		fc.assert(
			fc.property(arbSeq3, arbMapping, arbOrd3, (f, func, i) => {
				fc.pre(lt(i, f.length));
				map(f, func).index(i) === func(f.index(i));
			}),
		);
	});
});

describe("prod", () => {
	describe("empty", () => {
		it("|prod(empty, f)| = 0", () => {
			fc.assert(fc.property(arbSeq3, (f) => isZero(prod(empty, f).length)));
		});

		it("|prod(f, empty)| = 0", () => {
			fc.assert(fc.property(arbSeq3, (f) => isZero(prod(f, empty).length)));
		});
	});

	describe("w.2 and 2.w", () => {
		const s2 = identity(ensure(2n));
		const sw = identity(unit);
		it("|prod(sw, s2)| = w.2", () => {
			assertEq(prod(sw, s2).length, unit.ordinalMult(2n));
		});

		it("|prod(s2, sw)| = w", () => {
			assertEq(prod(s2, sw).length, Conway.ensure(2n).ordinalMult(unit));
		});

		it("prod(sw, s2)[w.i + j] = (j, i)", () => {
			const p = prod(sw, s2);
			fc.assert(
				fc.property(
					arbFiniteBigintOrd,
					fc.bigInt({ min: 0n, max: 1n }),
					(i, j) => {
						const idx = new Conway([
							[1n, i],
							[0n, j],
						]);
						fc.pre(lt(idx, p.length));
						const [a, b] = p.index(idx);
						assertEq(b, i);
						assertEq(a, j);
					},
				),
			);
		});

		it("prod(sw, s2)[2*i + j] = (j, i)", () => {
			const p = prod(s2, sw);
			fc.assert(
				fc.property(
					arbFiniteBigintOrd,
					fc.bigInt({ min: 0n, max: 1n }),
					(i, j) => {
						const idx = Conway.ensure(2n * i + j);
						fc.pre(lt(idx, p.length));
						const [a, b] = p.index(idx);
						assertEq(b, i);
						assertEq(a, j);
					},
				),
			);
		});
	});

	describe("singleton", () => {
		const single = fromArray([null]);
		it("|prod(single, single)| = 1", () => {
			assertEq(prod(single, single).length, one);
		});

		it("|prod(f, single)| = |f|", () => {
			fc.assert(
				fc.property(arbSeq3, (f) => assertEq(prod(f, single).length, f.length)),
			);
		});

		it("|prod(single, f)| = |f|", () => {
			fc.assert(
				fc.property(arbSeq3, (f) => assertEq(prod(single, f).length, f.length)),
			);
		});

		it("prod(f, single)[i][0] = f[i]", () => {
			fc.assert(
				fc.property(arbSeq3, arbOrd3, (f, i) => {
					fc.pre(lt(i, f.length));
					return prod(f, single).index(i)[0] === f.index(i);
				}),
			);
		});

		it("prod(single, f)[i][1] = f[i]", () => {
			fc.assert(
				fc.property(arbSeq3, arbOrd3, (f, i) => {
					fc.pre(lt(i, f.length));
					return prod(single, f).index(i)[1] === f.index(i);
				}),
			);
		});
	});

	describe("cycle", () => {
		it("|prod(f, g)| = |cycle(f, |g|)|", () => {
			fc.assert(
				fc.property(arbSeq3, arbSeq3, (f, g) =>
					assertEq(prod(f, g).length, cycle(f, g.length).length),
				),
			);
		});

		it("prod(f, g)[i][0] = cycle(f, |g|)[i]", () => {
			fc.assert(
				fc.property(arbSeq3, arbSeq3, arbOrd3, (f, g, i) => {
					const p = prod(f, g);
					const c = cycle(f, g.length);
					fc.pre(lt(i, p.length));
					return p.index(i)[0] === c.index(i);
				}),
			);
		});
	});

	describe("concat", () => {
		it("|prod(f, g & h)| = |f|.|g| + |f|.|h|", () => {
			fc.assert(
				fc.property(arbSeq3, arbSeq3, arbSeq3, (f, g, h) =>
					assertEq(
						prod(f, concat(g, h)).length,
						ordinalAdd(
							ordinalMult(f.length, g.length),
							ordinalMult(f.length, h.length),
						),
					),
				),
			);
		});
	});
});

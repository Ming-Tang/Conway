import "./expect.test";
import fc from "fast-check";
import type { Conway0, Ord } from "../conway";
import { dyadicCommonAncestor, dyadicSimplestBetween } from "../dyadic";
import { dyadicNew } from "../dyadic/class";
import {
	birthday,
	create,
	ensure,
	eq,
	gt,
	isZero,
	le,
	lt,
	mono,
	mono1,
	ne,
	zero,
} from "../op";
import { add, mult, neg, sub } from "../op/arith";
import { signExpansion } from "../signExpansion";
import {
	commonAncestor,
	isSimpler,
	isStrictSimpler,
	leftSeq,
	rightSeq,
	simplestBetween,
	simplicitySeq,
	truncateConway,
} from "../signExpansion/simplicity";
import {
	arbConway3,
	arbDyadic,
	arbFiniteBigint,
	arbFiniteBigintOrd,
	arbOrd3,
} from "./generators";

fc.configureGlobal({ numRuns: 200 });

describe("commonAncestor", () => {
	const arb = arbConway3(arbFiniteBigint);

	it("commonAncestor(a, a) = a", () => {
		fc.assert(fc.property(arb, (a) => eq(a, commonAncestor(a, a))));
	});

	it("commonAncestor(a, b) for a < b is within [a, b] inclusive", () => {
		fc.assert(
			fc.property(arb, arb, (a, b) => {
				fc.pre(lt(a, b));
				const c = commonAncestor(a, b);
				return le(a, c) && le(c, b);
			}),
		);
	});

	it("negation symmetry", () => {
		fc.assert(
			fc.property(arb, arb, (a, b) =>
				eq(commonAncestor(a, b), neg(commonAncestor(neg(a), neg(b)))),
			),
		);
	});

	it("commutative", () => {
		fc.assert(
			fc.property(arb, arb, (a, b) =>
				eq(commonAncestor(a, b), commonAncestor(b, a)),
			),
		);
	});

	it("associative", () => {
		fc.assert(
			fc.property(arb, arb, arb, (a, b, c) =>
				eq(
					commonAncestor(commonAncestor(a, b), c),
					commonAncestor(a, commonAncestor(b, c)),
				),
			),
		);
	});

	it("left zero", () => {
		fc.assert(fc.property(arb, (a) => isZero(commonAncestor(0n, a))));
	});

	it("right zero", () => {
		fc.assert(fc.property(arb, (a) => isZero(commonAncestor(a, 0n))));
	});

	it("preserves isOrdinal", () => {
		fc.assert(
			fc.property(
				arbOrd3,
				arbOrd3,
				(a, b) => ensure(commonAncestor(a, b)).isOrdinal,
			),
		);
	});

	it("same as dyadicCommonAncestor for dyadics", () => {
		fc.assert(
			fc.property(arbDyadic(), arbDyadic(), (a, b) => {
				fc.pre(lt(a, b));
				return eq(commonAncestor(a, b), dyadicCommonAncestor(a, b));
			}),
		);
	});
});

describe("simplestBetween", () => {
	const arb = arbConway3(arbFiniteBigint);
	const arbPair = fc.tuple(arb, arb).filter(([a, b]) => lt(a, b));

	describe("constants", () => {
		it("{ 0 | w^-1 } = w^-1 / 2", () => {
			expect(simplestBetween(0n, mono1(-1n))).conwayEq(mono(0.5, -1n));
		});

		it("{ 0 | 0.5 w^-1 } = 0.25 w^-1", () => {
			expect(simplestBetween(0n, mono(0.5, -1n))).conwayEq(mono(0.25, -1n));
		});

		it("{ 0 | 2 w^-1 } = w^-1", () => {
			expect(simplestBetween(0n, mono(2n, -1n))).conwayEq(mono1(-1n));
		});

		it("{ 0 | w^-1 + w^-2 } = w^-1", () => {
			// { [] | [+ -^w + -^w] } = [+ -^w]
			expect(simplestBetween(0n, add(mono1(-1n), mono1(-2n)))).conwayEq(
				mono1(-1n),
			);
		});

		it("{ -1 | -w^-1 } = { [-] | [-+^w] } = -0.5", () => {
			expect(simplestBetween(-1n, mono(-1n, -1n))).conwayEq(-0.5);
		});

		it("{ w^-1 | 1 } = 0.5", () => {
			expect(simplestBetween(mono1(-1n), 1n)).conwayEq(0.5);
		});
	});

	it("simplestBetween(a, b) != a", () => {
		fc.assert(fc.property(arbPair, ([a, b]) => ne(simplestBetween(a, b), a)));
	});

	it("simplestBetween(a, b) != b", () => {
		fc.assert(fc.property(arbPair, ([a, b]) => ne(simplestBetween(a, b), b)));
	});

	it("simplestBetween negation symmetry", () => {
		fc.assert(
			fc.property(arbPair, ([a, b]) =>
				eq(simplestBetween(a, b), neg(simplestBetween(neg(b), neg(a)))),
			),
		);
	});

	it("simplestBetween(a, b) is within (a, b) exclusive", () => {
		fc.assert(
			fc.property(arbPair, ([a, b]) => {
				const c = simplestBetween(a, b);
				return lt(a, c) && lt(c, b);
			}),
		);
	});

	it("no simpler in-betweens", () => {
		fc.assert(
			fc.property(arbPair, arbOrd3, ([a, b], i) => {
				const c = simplestBetween(a, b);
				fc.pre(lt(i, birthday(c)));
				const c1 = truncateConway(c, i);
				if (lt(a, c1) && lt(c1, b)) {
					// console.error({
					// 	a,
					// 	b,
					// 	c,
					// 	birthdayC: birthday(c),
					// 	trunc: i,
					// 	c1,
					// 	ca: commonAncestor(a, b),
					// });
					throw new Error(`found a new simpler in-between: ${c1}`);
				}
				return true;
			}),
		);
	});

	it("same as dyadicSimplestBetween for dyadics", () => {
		fc.assert(
			fc.property(arbDyadic(32), arbDyadic(32), (a, b) => {
				fc.pre(lt(a, b));
				return eq(simplestBetween(a, b), dyadicSimplestBetween(a, b));
			}),
		);
	});
});

describe("truncateConway", () => {
	const arb = arbConway3(arbFiniteBigint);

	it("isSimpler is true for the truncation", () => {
		fc.assert(
			fc.property(arb, arbOrd3, (a, i) => {
				fc.pre(le(i, birthday(a)));
				const a0 = truncateConway(a, i);
				return isSimpler(a0, a);
			}),
		);
	});

	it("birthday of the truncation", () => {
		fc.assert(
			fc.property(arb, arbOrd3, (a, i) => {
				fc.pre(le(i, birthday(a)));
				const a0 = truncateConway(a, i);
				return eq(birthday(a0), i);
			}),
		);
	});
});

describe("isSimpler", () => {
	const arb = arbConway3(arbFiniteBigint);

	it("false for higher birthday of former", () => {
		fc.assert(
			fc.property(arb, arb, (a, b) => {
				fc.pre(gt(birthday(a), birthday(b)));
				return !isSimpler(a, b);
			}),
		);
	});

	it("true for Conway normal form term truncation", () => {
		fc.assert(
			fc.property(
				arb.chain((x) =>
					fc.tuple(fc.constant(x), fc.integer({ min: 0, max: x.length })),
				),
				([a, i]) => {
					const a0 = create(a.terms.slice(0, i));
					return isSimpler(a0, a);
				},
			),
		);
	});

	it("negating both sides preserves value", () => {
		fc.assert(
			fc.property(
				arb,
				arb,
				(a, b) => isSimpler(a, b) === isSimpler(neg(a), neg(b)),
			),
		);
	});

	it("reflexive", () => {
		fc.assert(fc.property(arb, (a) => isSimpler(a, a)));
	});

	it("transitive between two truncations", () => {
		fc.assert(
			fc.property(
				arb,
				fc.tuple(arbOrd3, arbOrd3).filter(([a, b]) => lt(a, b)),
				(x, [i, j]) => {
					const b = birthday(x);
					fc.pre(lt(i, b));
					fc.pre(lt(j, b));
					const xi = truncateConway(x, i);
					const xj = truncateConway(x, j);
					return isSimpler(xi, xj) && isSimpler(xj, x) && isSimpler(xi, x);
				},
			),
		);
	});
});

describe("isStrictSimpler", () => {
	const arb = arbConway3(arbFiniteBigint);

	it("not reflexive", () => {
		fc.assert(fc.property(arb, (a) => !isStrictSimpler(a, a)));
	});

	it("true implies not equals", () => {
		fc.assert(
			fc.property(arb, arb, (a, b) => {
				fc.pre(isStrictSimpler(a, b));
				return ne(a, b);
			}),
		);
	});

	it("same as isSimpler for non-equals", () => {
		fc.assert(
			fc.property(arb, arb, (a, b) => {
				fc.pre(ne(a, b));
				return isStrictSimpler(a, b) === isSimpler(a, b);
			}),
		);
	});
});

describe("simplicitySeq", () => {
	const arb = arbConway3(arbFiniteBigint);

	describe("left sequence", () => {
		it("are less than x", () => {
			fc.assert(
				fc.property(arb, arbOrd3, (x, i) => {
					const left = leftSeq(x);
					fc.pre(lt(i, left.length));
					return lt(left.index(i), x);
				}),
			);
		});

		it("increasing", () => {
			fc.assert(
				fc.property(arb, arbOrd3, arbOrd3, (x, i, j) => {
					fc.pre(lt(i, j));
					const left = leftSeq(x);
					fc.pre(lt(j, left.length));
					return lt(left.index(i), left.index(j));
				}),
			);
		});

		it("is empty for negative ordinals", () => {
			fc.assert(
				fc.property(arbOrd3.map(neg), (x) => isZero(leftSeq(x).length)),
			);
		});
	});

	describe("right sequence", () => {
		it("are greater than x", () => {
			fc.assert(
				fc.property(arb, arbOrd3, (x, i) => {
					const right = rightSeq(x);
					fc.pre(lt(i, right.length));
					return gt(right.index(i), x);
				}),
			);
		});

		it("decreasing", () => {
			fc.assert(
				fc.property(arb, arbOrd3, arbOrd3, (x, i, j) => {
					fc.pre(lt(i, j));
					const right = rightSeq(x);
					fc.pre(lt(j, right.length));
					return gt(right.index(i), right.index(j));
				}),
			);
		});

		it("is empty for ordinals", () => {
			fc.assert(fc.property(arbOrd3, (x) => isZero(rightSeq(x).length)));
		});
	});

	describe("negation symmetry of leftSeq and rightSeq", () => {
		it("preserves length", () => {
			fc.assert(
				fc.property(arb, (x) => {
					const left = leftSeq(x);
					const right = rightSeq(neg(x));
					return eq(left.length, right.length);
				}),
			);
		});

		it("same index", () => {
			fc.assert(
				fc.property(arb, arbOrd3, (x, i) => {
					const left = leftSeq(x);
					const right = rightSeq(neg(x));
					fc.pre(lt(i, right.length));
					return eq(right.index(i), neg(left.index(i)));
				}),
			);
		});
	});

	it("truncates at a plus (right) or minus (left)", () => {
		fc.assert(
			fc.property(arb, fc.boolean(), arbOrd3, (x, sign, i) => {
				const seq = simplicitySeq(x, sign);
				fc.pre(lt(i, seq.length));
				const x0 = ensure(birthday(seq.index(i)));
				return signExpansion(x).index(x0 as Ord) === sign;
			}),
		);
	});
});

describe("arithmetic in terms of left/right", () => {
	const within = ({
		mid,
		left,
		right,
	}: {
		mid: Conway0;
		left: Conway0[];
		right: Conway0[];
	}) => {
		for (const l of left) {
			if (!lt(l, mid)) {
				throw new Error(`!(left < mid): left=${left}, mid=${mid}`);
			}
		}

		for (const r of right) {
			if (!lt(mid, r)) {
				throw new Error(`!(mid < right): mid=${mid}, right=${right}`);
			}
		}
	};

	const arb = arbConway3(arbFiniteBigint);
	const arbLR = fc
		.tuple(
			arb.map((x) => ({ x, left: leftSeq(x), right: rightSeq(x) })),
			arbOrd3,
			arbOrd3,
		)
		.map(([{ x, left, right }, i, j]) => ({
			x,
			left: isZero(left.length)
				? sub(x, 1n)
				: left.index(lt(i, left.length) ? i : zero),
			right: isZero(right.length)
				? add(x, 1n)
				: right.index(lt(j, right.length) ? j : zero),
		}));

	it("addition", () => {
		fc.assert(
			fc.property(
				arbLR,
				arbLR,
				({ x, left: xl, right: xr }, { x: y, left: yl, right: yr }) =>
					within({
						mid: add(x, y),
						left: [add(x, yl), add(xl, y)],
						right: [add(x, yr), add(xr, y)],
					}),
			),
		);
	});

	it("additive inverse", () => {
		fc.assert(
			fc.property(arbLR, ({ x, left: xl, right: xr }) =>
				within({
					mid: neg(x),
					left: [neg(xr)],
					right: [neg(xl)],
				}),
			),
		);
	});

	it("multiplication", () => {
		fc.assert(
			fc.property(
				arbLR,
				arbLR,
				({ x, left: xl, right: xr }, { x: y, left: yl, right: yr }) =>
					within({
						mid: mult(x, y),
						left: [
							[xl, yl],
							[xr, yr],
						].map(([xo, yo]) =>
							sub(add(mult(xo, y), mult(x, yo)), mult(xo, yo)),
						),
						right: [
							[xl, yr],
							[xr, yl],
						].map(([xo, yo]) =>
							sub(add(mult(xo, y), mult(x, yo)), mult(xo, yo)),
						),
					}),
			),
		);
	});

	it("mono1(x) = {0, mono(k, x) | mono(1/2^k, x)}", () => {
		fc.assert(
			fc.property(arbLR, arbFiniteBigintOrd, ({ x, left: xl, right: xr }, k) =>
				within({
					mid: mono1(x),
					left: [0n, mono(k, xl)],
					right: [mono(dyadicNew(1n, k), xr)],
				}),
			),
		);
	});
});

import { conwayMinus, conwayPlus } from ".";
import type { Conway0 } from "../conway";
import { Dyadic } from "../dyadic";
import { mono, mono1, zero } from "../op";
import { add, mult, neg } from "../op/arith";

const customInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

export class CanonSeq {
	public readonly head: Conway0[];

	public constructor(
		public readonly seq: (i: bigint) => Conway0,
		public readonly isInfinite = true,
	) {
		if (isInfinite) {
			this.head = Array(5)
				.fill(0)
				.map((_, i) => seq(BigInt(i)));
		} else {
			this.head = [seq(0n), seq(1n)];
		}
	}

	public evaluate(i: bigint): Conway0 {
		return this.seq(i);
	}

	public static step(v0: Conway0, v1: Conway0) {
		return new CanonSeq((i) => (i === 0n ? v0 : v1), false);
	}

	public static iterSign(v0: Conway0, isMinus = false) {
		const f = isMinus ? conwayMinus : conwayPlus;
		return new CanonSeq((n) => {
			let v = v0;
			for (let i = 0n; i < n; i++) {
				v = f(v);
			}
			return v;
		});
	}

	public static monos(p: Conway0, isNegative = false) {
		if (isNegative) {
			return new CanonSeq((i) => mono(-i, p));
		}
		return new CanonSeq((i) => mono(i, p));
	}

	public static monosPos(p: Conway0, isDecreasing = false) {
		if (isDecreasing) {
			return new CanonSeq((i) => mono(Dyadic.pow2(-i), p));
		}
		return new CanonSeq((i) => mono(1n + i, p));
	}

	public static zero(): CanonSeq {
		return new CanonSeq(() => 0n);
	}

	public map(func: (value: Conway0, i: bigint) => Conway0) {
		const func0 = this.seq;
		return new CanonSeq((i) => func(func0(i), i), this.isInfinite);
	}

	public add(offset: Conway0) {
		return this.map((x) => add(offset, x));
	}

	public mult(factor: Conway0) {
		return this.map((x) => mult(x, factor));
	}

	public mono1() {
		return this.map((x) => mono1(x));
	}

	public neg() {
		return this.map((x) => neg(x));
	}

	public shift(v0 = 0n as Conway0) {
		const func = this.seq;
		return new CanonSeq((i) => (i === 0n ? v0 : func(i - 1n)), this.isInfinite);
	}

	public [customInspectSymbol]() {
		if (this.isInfinite) {
			return `CanonSeq {${this.head.map((x) => x.toString()).join(", ")}, ...}`;
		}
		return `CanonSeq [${this.head.map((x) => x.toString()).join(", ")}]`;
	}
}

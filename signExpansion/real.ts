import type { Real } from "../conway";
import { ensure } from "../op";
import { concat, cycle, empty, fromArray, type Seq } from "../seq";

export type Sign = boolean;

export const fracSignExpansion = (
	fracPart: number,
	push?: (sign: boolean) => void,
): [number, number] => {
	let mid = 1;
	let half = 0.5;
	while (half) {
		if (fracPart === mid) {
			break;
		}

		if (fracPart > mid) {
			push?.(true);
			mid += half;
		} else {
			push?.(false);
			mid -= half;
		}
		half /= 2;
	}
	return [mid, half];
};

export const plusNumber = (r: number): number => {
	if (r >= 0) {
		return r + 1;
	}
	const pos = -r;
	const half = fracSignExpansion(pos - Math.floor(pos))[1];
	return r + half;
};

export const minusNumber = (r: number): number => {
	if (r <= 0) {
		return r - 1;
	}
	const half = fracSignExpansion(r - Math.floor(r))[1];
	return r - half;
};

export const plus = (r: Real): Real => {
	if (typeof r === "bigint" && r >= 0n) {
		return r + 1n;
	}
	return plusNumber(Number(r));
};

export const minus = (r: Real): Real => {
	if (typeof r === "bigint" && r <= 0n) {
		return r - 1n;
	}
	return minusNumber(Number(r));
};

export const signExpansionNumber = (r: number): Seq<Sign> => {
	if (r === 0) {
		return empty as Seq<Sign>;
	}

	if (!Number.isFinite(r)) {
		throw new RangeError("Not a finite number.");
	}

	const isPositive = r > 0;
	const integerPart = r < 0 ? Math.floor(-r) : Math.floor(r);
	const fracPart = r < 0 ? -r - integerPart : r - integerPart;
	const integerSigns = cycle(fromArray([isPositive]), ensure(integerPart));
	if (fracPart === 0) {
		return integerSigns;
	}

	const fracSigns: Sign[] = [];
	fracSignExpansion(fracPart, (s) => fracSigns.push(s === isPositive));
	return concat(
		cycle(fromArray([isPositive]), ensure(integerPart + 1)),
		fromArray(fracSigns),
	);
};

export const signExpansionBigint = (r: bigint): Seq<Sign> => {
	if (r === 0n) {
		return empty as Seq<Sign>;
	}
	if (r > 0) {
		return cycle(fromArray([true]), ensure(r));
	}
	return cycle(fromArray([false]), ensure(-r));
};

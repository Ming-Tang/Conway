import {
	Dyadic,
	dyadicAdd,
	dyadicBirthday,
	dyadicCompare,
	dyadicEq,
	dyadicFromBigint,
	dyadicFromNumber,
	dyadicGe,
	dyadicGt,
	dyadicLe,
	dyadicLt,
	dyadicMult,
	dyadicNe,
	dyadicNeg,
	dyadicSign,
	dyadicSub,
} from "./dyadic";

export type Real = number | bigint | Dyadic;

export const realZero: Real = 0n;
export const realOne: Real = 1n;
export const realNegOne: Real = -1n;

export const realIsDyadic = (value: Real): value is Dyadic =>
	value instanceof Dyadic;
export const realIsPositive = (value: Real) =>
	value instanceof Dyadic ? value.isPositive : value > 0;
export const realIsNegative = (value: Real) =>
	value instanceof Dyadic ? value.isNegative : value < 0;
export const realIsOne = (value: Real): boolean =>
	value instanceof Dyadic ? value.isOne : value === 1n || value === 1;
export const realIsZero = (value: Real): boolean =>
	value instanceof Dyadic ? value.isZero : !value;

const maybeCoerceDyadic2 = (a: Real, b: Real): [Dyadic, Dyadic] | null => {
	if (a instanceof Dyadic || b instanceof Dyadic) {
		return [
			a instanceof Dyadic
				? a
				: typeof a === "bigint"
					? dyadicFromBigint(a)
					: dyadicFromNumber(a),
			b instanceof Dyadic
				? b
				: typeof b === "bigint"
					? dyadicFromBigint(b)
					: dyadicFromNumber(b),
		];
	}
	return null;
};

export const realSign = (value: Real): -1 | 0 | 1 => {
	if (value instanceof Dyadic) {
		return dyadicSign(value);
	}
	return realIsZero(value) ? 0 : realIsPositive(value) ? 1 : -1;
};

export const realNeg = <R extends Real = Real>(value: R): R =>
	// @ts-ignore will preserve type of input
	value instanceof Dyadic ? dyadicNeg(value) : -value;

export const realAdd = (left: Real, right: Real): Real => {
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicAdd(p[0], p[1]);
	}

	if (typeof left === "bigint" && typeof right === "bigint") {
		return left + right;
	}
	return Number(left) + Number(right);
};

export const realSub = (left: Real, right: Real): Real => {
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicSub(p[0], p[1]);
	}

	if (typeof left === "bigint" && typeof right === "bigint") {
		return left - right;
	}
	return Number(left) - Number(right);
};

export const realMult = (left: Real, right: Real): Real => {
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicMult(p[0], p[1]);
	}

	if (typeof left === "bigint" && typeof right === "bigint") {
		return left * right;
	}
	return Number(left) * Number(right);
};

export const realIntegerDiv = (left: Real, right: Real): Real => {
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return Math.floor(Number(p[0]) / Number(p[1]));
	}

	if (typeof left === "bigint" && typeof right === "bigint") {
		return left / right;
	}
	return Math.floor(Number(left) / Number(right));
};

export const realIntegerPow = (left: Real, right: Real): Real => {
	// TODO handle dyadics
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left ** right;
	}
	return Number(left) ** Number(right);
};

export const realCompare = (left: Real, right: Real): number => {
	if (left === right) {
		return 0;
	}

	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicCompare(p[0], p[1]);
	}

	if (typeof left === "bigint" && typeof right === "bigint") {
		return right > left ? 1 : -1;
	}
	const nr = Number(right);
	const nl = Number(left);
	return nl === nr ? 0 : nr > nl ? 1 : -1;
};

export const realEq = (left: Real, right: Real): boolean => {
	if (left === right) {
		return true;
	}
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicEq(p[0], p[1]);
	}
	return typeof left === "bigint" && typeof right === "bigint"
		? left === right
		: Number(left) === Number(right);
};

export const realNe = (left: Real, right: Real): boolean => {
	if (left === right) {
		return false;
	}
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicNe(p[0], p[1]);
	}

	return typeof left === "bigint" && typeof right === "bigint"
		? left !== right
		: Number(left) !== Number(right);
};

export const realGt = (left: Real, right: Real): boolean => {
	if (left === right) {
		return false;
	}
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicGt(p[0], p[1]);
	}

	return left > right;
};
export const realGe = (left: Real, right: Real): boolean => {
	if (left === right) {
		return true;
	}
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicGe(p[0], p[1]);
	}

	return left >= right;
};
export const realLt = (left: Real, right: Real): boolean => {
	if (left === right) {
		return false;
	}
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicLt(p[0], p[1]);
	}

	return left < right;
};
export const realLe = (left: Real, right: Real): boolean => {
	if (left === right) {
		return true;
	}
	const p = maybeCoerceDyadic2(left, right);
	if (p) {
		return dyadicLe(p[0], p[1]);
	}

	return left <= right;
};
export const realAbs = <R extends Real = Real>(value: R): R =>
	realIsNegative(value) ? realNeg(value) : value;

export const realFloorToBigint = (value: Real): bigint =>
	value instanceof Dyadic
		? value.isNegative
			? value.bigintQuotient + 1n
			: value.bigintQuotient
		: typeof value === "bigint"
			? value
			: BigInt(Math.floor(value));

export const realCeilingToBigint = (value: Real): bigint =>
	realIsInteger(value)
		? realFloorToBigint(value)
		: realFloorToBigint(value) + 1n;

export const realIsInteger = (value: Real): boolean =>
	value instanceof Dyadic
		? value.isInteger
		: typeof value === "bigint"
			? true
			: Number.isInteger(value);

export const realToBigint = (value: Real): bigint => {
	if (value instanceof Dyadic) {
		if (!value.isInteger) {
			throw new RangeError("Dyadic is not an integer");
		}
		return value.bigintQuotient;
	}
	return BigInt(value);
};
export const realToNumber = (value: Real): number => Number(value);

export const realBirthday = (value: Real): bigint => {
	if (value instanceof Dyadic) {
		return dyadicBirthday(value);
	}

	if (realIsZero(value)) {
		return 0n;
	}

	if (typeof value === "bigint") {
		return value < 0n ? -value : value;
	}

	if (typeof value === "number" && Number.isInteger(value)) {
		return BigInt(value < 0 ? -value : value);
	}

	return dyadicBirthday(dyadicFromNumber(value));
};

export const realToJson = (
	value: Real,
	preserveBigint = false,
): string | bigint | unknown => {
	if (value instanceof Dyadic) {
		return preserveBigint
			? { dn: value.numerator, dp: value.power }
			: {
					dn: `${value.numerator}n`,
					dp: `${value.power}`,
				};
	}

	if (typeof value === "bigint") {
		return preserveBigint ? value : `${value}n`;
	}

	return `${value}`;
};

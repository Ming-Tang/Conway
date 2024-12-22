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
	dyadicLongDivision,
	dyadicLongDivisionIters,
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

export const realToDyadic = (a: Real): Dyadic => {
	if (a instanceof Dyadic) {
		return a;
	}
	return typeof a === "bigint" ? dyadicFromBigint(a) : dyadicFromNumber(a);
};

const maybeCoerceDyadic2 = (a: Real, b: Real): [Dyadic, Dyadic] | null => {
	if (a instanceof Dyadic || b instanceof Dyadic) {
		return [realToDyadic(a), realToDyadic(b)];
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

export const realLongDivision = (left: Real, right: Real): [Real, Real] =>
	dyadicLongDivision(realToDyadic(left), realToDyadic(right));

export const realLongDivisionLossy = (
	left: Real,
	right: Real,
): [Real, Real] => {
	if (typeof left === "number" || typeof right === "number") {
		return [Number(left) / Number(right), 0];
	}
	return dyadicLongDivision(realToDyadic(left), realToDyadic(right));
};

export const realLongDivisionIters = (
	left: Real,
	right: Real,
	iters = 1n as number | bigint,
): [Real, Real] =>
	dyadicLongDivisionIters(realToDyadic(left), realToDyadic(right), iters);

export const realCompare = (left: Real, right: Real): -1 | 0 | 1 => {
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

/**
 * Determines the birthday of a bigint or number.
 * Floating point numbers are treated as exact values and since they
 * are in the form of (integer * 2^exponent), floating point numbers
 * have a finite birthday.
 */
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

export const realToString = (value: Real) => {
	if (value instanceof Dyadic) {
		return value.toString();
	}
	return `${value}`;
};

const EQ_HASH_CACHE = new Map<Real, number>([]);
export const realEqHash = (value: Real): number => {
	if (realIsZero(value)) {
		return 0;
	}

	const found = EQ_HASH_CACHE.get(value);
	if (typeof found === "number") {
		return found;
	}

	const s = realToString(value) as string;
	const MASK = 0xffff_ffff;
	const MULT = 31;
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = MULT * h + s.charCodeAt(i);
		h = h & MASK;
	}

	if (typeof value === "bigint" && value > -256n && value < 256n) {
		EQ_HASH_CACHE.set(value, h);
	} else if (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value > -256 &&
		value < 256
	) {
		EQ_HASH_CACHE.set(value, h);
	}
	return h;
};

export const hasRealType = (x: unknown): x is Real => {
	if (typeof x === "number" || typeof x === "bigint") {
		return true;
	}
	if (x instanceof Dyadic) {
		return true;
	}
	return false;
};

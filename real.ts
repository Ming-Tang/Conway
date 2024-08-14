export type Real = number | bigint;

export const realZero: Real = 0n;
export const realOne: Real = 1n;
export const realNegOne: Real = -1n;

export const realIsPositive = (value: Real) => value > 0;
export const realIsNegative = (value: Real) => value < 0;
export const realIsOne = (value: Real): boolean => value === 1n || value === 1;
export const realIsZero = (value: Real): boolean => !value;

export const realSign = (value: Real): -1 | 0 | 1 =>
	realIsZero(value) ? 0 : realIsPositive(value) ? 1 : -1;

export const realNeg = <R extends Real = Real>(value: R): R =>
	// @ts-expect-error number | bigint
	-value;

export const realAdd = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left + right;
	}
	return Number(left) + Number(right);
};

export const realSub = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left - right;
	}
	return Number(left) - Number(right);
};

export const realMult = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left * right;
	}
	return Number(left) * Number(right);
};

export const realIntegerDiv = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left / right;
	}
	return Math.floor(Number(left) / Number(right));
};

export const realIntegerPow = (left: Real, right: Real): Real => {
	if (typeof left === "bigint" && typeof right === "bigint") {
		return left ** right;
	}
	return Number(left) ** Number(right);
};

export const realCompare = (left: Real, right: Real): number =>
	left === right ? 0 : right > left ? 1 : -1;

export const realEq = (left: Real, right: Real): boolean =>
	typeof left === "bigint" && typeof right === "bigint"
		? left === right
		: Number(left) === Number(right);
export const realNe = (left: Real, right: Real): boolean =>
	typeof left === "bigint" && typeof right === "bigint"
		? left !== right
		: Number(left) !== Number(right);
export const realGt = (left: Real, right: Real): boolean => left > right;
export const realLt = (left: Real, right: Real): boolean => left < right;
export const realAbs = <R extends Real = Real>(value: R): R =>
	realIsNegative(value) ? realNeg(value) : value;

export const realToBigint = (value: Real): bigint => BigInt(value);
export const realToNumber = (value: Real): number => Number(value);

export const realBirthday = (real: Real) => {
	if (realIsZero(real)) {
		return real;
	}

	if (typeof real === "bigint") {
		return real < 0n ? -real : real;
	}

	if (typeof real === "number" && Number.isInteger(real)) {
		return real < 0 ? -real : real;
	}

	const x = realAbs(real);
	const iPart = Math.floor(realToNumber(x));
	const fracPart = realSub(x, iPart);
	if (fracPart === 0) {
		return iPart;
	}

	let i = 1;
	let mid = 1;
	let half = 0.5;
	while (half) {
		if (fracPart === mid) {
			break;
		}

		if (fracPart > mid) {
			mid += half;
		} else {
			mid -= half;
		}
		i += 1;
		half /= 2;
	}

	return iPart + i;
};

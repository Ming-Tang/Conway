export interface EqHashArgs<T, Hash> {
	eqHash(value: T): Hash;
	eq(a: T, b: T): boolean;
}

export interface MakeInternableArgs<T, Args extends unknown[], Hash>
	extends EqHashArgs<T, Hash> {
	create(...args: Args): T;
	shouldIntern(...args: Args): boolean;
}

export interface MakeInternableReturn<T, Args extends unknown[], Hash> {
	table: Map<Hash, T[]>;
	create(...args: Args): T;
	intern(...args: Args): T;
}

const tableInsert = <T, Hash>(
	map: Map<Hash, T[]>,
	value: T,
	{ eqHash, eq }: EqHashArgs<T, Hash>,
) => {
	const h = eqHash(value);
	const xs = map.get(h);
	if (!xs) {
		map.set(h, [value]);
		return;
	}

	if (xs.find((y) => eq(y, value))) {
		return;
	}

	xs.push(value);
};

const tableFind = <T, Hash>(
	map: Map<Hash, T[]>,
	value: T,
	{ eqHash, eq }: EqHashArgs<T, Hash>,
): T | undefined => {
	const h = eqHash(value);
	const xs = map.get(h);
	if (!xs) {
		return undefined;
	}
	for (const x of xs) {
		if (eq(x, value)) {
			return x;
		}
	}
	return undefined;
};

/**
 * Given a factory, should intern check and equality/hashing of a
 * particular reference type, return a factory that interns
 * the created value (same reference for same inputs under
 * the `shouldIntern` condition).
 */
export const makeInternable = <T, Args extends unknown[], Hash>(
	intern: MakeInternableArgs<T, Args, Hash>,
): MakeInternableReturn<T, Args, Hash> => {
	const { shouldIntern, create } = intern;
	const table = new Map<Hash, T[]>();
	return Object.freeze({
		table,
		create(...args: Args) {
			const value = create(...args);
			const found = tableFind<T, Hash>(table, value, intern);
			if (found) {
				return found;
			}

			if (!shouldIntern(...args)) {
				return value;
			}

			tableInsert(table, value, intern);
			return value;
		},
		intern(...args: Args) {
			const value = create(...args);
			const found = tableFind<T, Hash>(table, value, intern);
			if (found) {
				return found;
			}
			tableInsert(table, value, intern);
			return value;
		},
	});
};

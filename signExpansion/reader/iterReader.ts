import type { Ord0 } from "../../conway";
import { eq, isZero, lt } from "../../op";
import { ordinalAdd, ordinalRightSub } from "../../op/ordinal";
import type { Entry, SignExpansionReader } from "./types";

const isAlreadyGrouped = (array: Entry[]) => {
	for (let i = 0; i < array.length; i++) {
		const e = array[i];
		if (isZero(e.length)) {
			return false;
		}
		if (i > 0 && array[i].sign === array[i - 1].sign) {
			return false;
		}
	}

	return true;
};

const groupBySignArrayMemo = new WeakMap<Entry[], Readonly<Entry[]>>();
export function groupBySignArray<O extends Ord0 = Ord0>(
	array: Entry<O>[],
): Readonly<Entry<O>[]> {
	if (array.length === 0 || (array.length === 1 && !isZero(array[0].length))) {
		return array;
	}

	if (groupBySignArrayMemo.has(array)) {
		return groupBySignArrayMemo.get(array) as Readonly<Entry<never>[]>;
	}

	if (isAlreadyGrouped(array)) {
		groupBySignArrayMemo.set(array, array);
		return array;
	}

	const res: Entry<O>[] = [];
	let pending: Entry<O> = { sign: false, length: 0n as O };
	for (let i = 0; i < array.length; i++) {
		const entry = array[i];
		if (isZero(entry.length)) {
			continue;
		}

		if (entry.sign === pending.sign) {
			pending.length = ordinalAdd(pending.length, entry.length) as O;
			continue;
		}

		if (!isZero(pending.length)) {
			res.push(pending);
		}
		pending = { ...entry };
	}

	if (!isZero(pending.length)) {
		res.push(pending);
	}

	groupBySignArrayMemo.set(array, res);
	return res;
}

function* groupBySignGen<O extends Ord0 = Ord0>(
	iter: Iterable<Entry<O>>,
): Generator<Entry<O>> {
	let pending: Entry<O> = { sign: false, length: 0n as O };
	for (const entry of iter) {
		if (isZero(entry.length)) {
			continue;
		}

		const { sign, length } = entry;
		if (pending.sign === sign) {
			pending.length = ordinalAdd(pending.length, length) as O;
			continue;
		}

		if (!isZero(pending.length)) {
			yield pending;
		}
		pending = { ...entry };
	}

	if (pending && !isZero(pending.length)) {
		yield pending;
	}
}

export const groupBySign = <O extends Ord0 = Ord0>(
	iter: Iterable<Entry<O>>,
): Iterable<Entry<O>> =>
	Array.isArray(iter) ? groupBySignArray(iter) : groupBySignGen(iter);

export class IterReader<O extends Ord0 = Ord0, Return = void>
	implements SignExpansionReader<O>
{
	#it: Iterator<Entry<O>>;
	#done = false;
	#entry: Entry<O> | null = null;
	public returnValue: Return | undefined = undefined;

	constructor(iter: Iterable<Entry<O>>) {
		this.#it = groupBySign(iter)[Symbol.iterator]();
	}

	get isDone() {
		return this.#done;
	}

	lookahead(): Readonly<Entry<O>> | null {
		this.#ensure();
		return !this.#done && this.#entry ? { ...this.#entry } : null;
	}

	consume(length: Ord0): void {
		if (isZero(length)) {
			return;
		}

		this.#ensure();

		const entry = this.#entry;
		if (!entry || this.#done) {
			throw new RangeError("cannot consume: reached the end");
		}

		const remain = entry.length;
		if (eq(remain, length)) {
			this.#entry = null;
			return;
		}

		if (lt(remain, length)) {
			console.error("cannot consume", { remain, length, sign: entry.sign });
			throw new RangeError("cannot consume: larger than lookahead");
		}

		const remain1 = ordinalRightSub(length, remain) as O;

		this.#entry = {
			sign: entry.sign,
			length: remain1,
		};
	}

	#ensure() {
		if (this.#done || this.#entry) {
			return;
		}

		const { done, value: entry } = this.#it.next();
		if (done) {
			this.returnValue = entry;
		}

		if (done || isZero(entry.length)) {
			this.#entry = null;
			this.#done = true;
			return;
		}

		this.#entry = entry;
	}
}

export function* iterSignExpansionReader<O extends Ord0 = Ord0>(
	reader: SignExpansionReader<O>,
) {
	while (true) {
		const entry = reader.lookahead();
		if (entry === null) {
			break;
		}
		const { sign, length } = entry;
		yield { sign, length } as Entry<O>;
		reader.consume(entry.length);
	}
}

export const makeReader = <O extends Ord0 = Ord0>(x: Iterable<Entry<O>>) =>
	new IterReader(x);

import type { Ord0 } from "../../conway";
import { eq, gt, isZero, lt } from "../../op";
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

export class IterReader<O extends Ord0 = Ord0>
	implements SignExpansionReader<O>
{
	#gen: Generator<Entry<O>>;
	#res: { done: true } | { done: false; value: Entry<O> };

	constructor(iter: Iterable<Entry<O>>) {
		this.#gen = groupBySignGen(iter)[Symbol.iterator]();
		this.#res = this.#maintain();
	}

	get isDone() {
		return this.#res.done ?? false;
	}

	lookahead(): Readonly<Entry<O>> | null {
		if (this.#res.done) {
			return null;
		}
		return { sign: this.#res.value.sign, length: this.#res.value.length };
	}

	consume(length: O): void {
		if (this.#res.done) {
			throw new RangeError("cannot consume: reached the end");
		}

		const remain = this.#res.value.length;
		if (eq(length, remain)) {
			this.#res = this.#maintain();
			return;
		}
		if (gt(length, remain)) {
			throw new RangeError("cannot consume: larger than lookahead");
		}
		this.#res.value.length = ordinalRightSub(length, remain) as O;
	}

	#maintain(): { done: true } | { done: false; value: Entry<O> } {
		const { done, value } = this.#gen.next();
		return { done: done ?? false, value: { ...value } };
	}
}

export class ArrayReader<O extends Ord0 = Ord0>
	implements SignExpansionReader<O>
{
	#array: Readonly<Entry<O>[]>;
	#index: number;
	#remain: O;
	constructor(array: Entry<O>[]) {
		this.#array = groupBySignArray(array);
		this.#index = 0;
		this.#remain = 0n as O;
		if (this.#array.length > 0) {
			this.#remain = this.#array[0].length;
		}
	}

	get isDone() {
		return this.#index >= this.#array.length;
	}

	lookahead(): Readonly<Entry<O>> | null {
		if (this.#index >= this.#array.length) {
			return null;
		}
		return { sign: this.#array[this.#index].sign, length: this.#remain };
	}

	consume(length: O): void {
		if (this.#index >= this.#array.length) {
			throw new RangeError("cannot consume: reached the end");
		}
		if (eq(length, this.#remain)) {
			this.#index++;
			if (this.#index < this.#array.length) {
				this.#remain = this.#array[this.#index].length;
			}
			return;
		}
		if (gt(length, this.#remain)) {
			throw new RangeError("cannot consume: larger than lookahead");
		}
		this.#remain = ordinalRightSub(length, this.#remain) as O;
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

export const makeReader = <O extends Ord0 = Ord0>(
	x: Iterable<Entry<O>>,
): SignExpansionReader<O> =>
	Array.isArray(x) ? new ArrayReader<O>(x) : new IterReader<O>(x);

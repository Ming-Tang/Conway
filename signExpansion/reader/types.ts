import type { Ord0 } from "../../conway";
import { eq, isZero, lt } from "../../op/comparison";
import { ordinalAdd, ordinalRightSub } from "../../op/ordinal";

export interface Entry<O extends Ord0 = Ord0> {
	sign: boolean;
	length: O;
}

export interface SignExpansionReader<O extends Ord0 = Ord0> {
	lookahead(): Readonly<Entry<O>> | null;
	consume(length: O): void;
}

export function* groupBySign<O extends Ord0 = Ord0>(
	iter: Iterable<Entry<O>>,
): Generator<Entry<O>> {
	let partialEntry: Entry<O> | null = null;
	const it = iter[Symbol.iterator]();
	while (true) {
		const { value: entry, done } = it.next();
		if (done) {
			break;
		}

		if (partialEntry === null) {
			partialEntry = entry;
			continue;
		}

		const { sign: sign0, length: len0 } = partialEntry as Entry;
		if (isZero(len0)) {
			continue;
		}

		const { sign, length } = entry;
		if (sign0 === sign) {
			partialEntry = { sign: sign0, length: ordinalAdd(len0, length) as O };
			continue;
		}

		if (!isZero(partialEntry.length)) {
			yield partialEntry;
		}
		partialEntry = entry;
	}

	if (partialEntry && !isZero(partialEntry.length)) {
		yield partialEntry;
	}
}

export class IterReader<O extends Ord0 = Ord0>
	implements SignExpansionReader<O>
{
	#it: Iterator<Entry<O>>;
	#done = false;
	#entry: Entry<O> | null = null;

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
			throw new RangeError("cannot consume: larger than lookahead");
		}

		this.#entry = {
			sign: entry.sign,
			length: ordinalRightSub(length, remain) as O,
		};
	}

	#ensure() {
		if (this.#done || this.#entry) {
			return;
		}

		const { done, value: entry } = this.#it.next();
		if (done || isZero(entry.length)) {
			this.#entry = null;
			this.#done = true;
			return;
		}

		this.#entry = entry;
	}
}

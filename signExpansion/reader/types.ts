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
	if (Array.isArray(iter) && iter.length === 0) {
		return;
	}

	let partialEntry: Entry<O> | null = null;
	const it = iter[Symbol.iterator]();
	while (true) {
		const { value: entry, done } = it.next();
		if (done) {
			break;
		}

		if (isZero(entry.length)) {
			continue;
		}

		if (partialEntry === null) {
			partialEntry = entry;
			continue;
		}

		const { sign: sign0, length: len0 } = partialEntry as Entry;

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

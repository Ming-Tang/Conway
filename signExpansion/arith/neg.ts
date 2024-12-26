import type { Ord0 } from "../../conway";
import type { Entry, SignExpansionReader } from "../reader";

export function* neg<O extends Ord0 = Ord0>(reader: SignExpansionReader<O>) {
	while (true) {
		const res = reader.lookahead();
		if (res === null) {
			break;
		}
		reader.consume(res.length);
		const { sign, length } = res;
		yield { sign: !sign, length } as Entry<O>;
	}
}

export const negEntries = <O extends Ord0 = Ord0>(entries: Entry<O>[]) =>
	entries.map(({ sign, length }) => ({ sign: !sign, length }));

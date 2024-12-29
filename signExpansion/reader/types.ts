import type { Ord0 } from "../../conway";

export interface Entry<O extends Ord0 = Ord0> {
	sign: boolean;
	length: O;
}

export interface SignExpansionReader<O extends Ord0 = Ord0> {
	lookahead(): Readonly<Entry<O>> | null;
	consume(length: O): void;
	/**
	 * `true` if and only if `lookahead()` would return `null`.
	 */
	readonly isDone: boolean;
}

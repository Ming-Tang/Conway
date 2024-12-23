import { Conway } from "../conway";
import { type Real, realToJson } from "../real";

export const toRepr = (x: Conway): [unknown, Real][] =>
	x.terms.map(([e, c]) => [e instanceof Conway ? toRepr(e) : e, c]);

export const toJson = (
	x: Conway,
	preserveBigint = false,
): {
	t: { e: unknown; c: string | unknown }[];
	oh: string;
	eh: number;
} => ({
	oh: `${x.ordHash}`,
	eh: x.eqHash,
	t: x.terms.map(([e, c]) => ({
		e:
			e instanceof Conway
				? toJson(e, preserveBigint)
				: realToJson(e, preserveBigint),
		c: realToJson(c, preserveBigint),
	})),
});

export const toLaTeX = (x: Conway): string =>
	x
		.toString()
		.replace(/\^(-?[0-9]+(?:\.[0-9]*)?)/g, "^{$1}")
		.replace(/w\b/g, "\\omega")
		.replace(/[\[\]]/g, (x1) => (x1 === "[" ? "{" : "}"));

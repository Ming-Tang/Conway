import { Conway } from "./conway";
import { realToBigint, realToNumber, type Real } from "./real";
import {
	birthday,
	mono,
	mono1,
	one,
	unit,
	fromReal as real,
	ensure,
} from "./op";
import { isZero } from "./op/comparison";
import { canon, isLimit, isSucc, noSucc, ordinalAdd } from "./op/ordinal";
import { cnfOrDefault, concat, cycleArray, fromArray, type Seq } from "./seq";
import { signExpansion } from "./signExpansion";
import type { Sign } from "./signExpansion/real";
import {
	summarizeCnf,
	signExpansionToString,
	summarizeCnfLaTeX,
	ordToLaTeX,
} from "./seq/cnf";
import { expandOrDefault, summarizeExpansionLaTeX } from "./seq/expansion";

const unSucc = (x: Real | Conway, n: number): (Real | Conway)[] => {
	const sp = realToNumber(ensure(x).realPart);
	const i0 = Math.max(sp - n - 1, 0);
	const row = [] as (Real | Conway)[];
	const x0 = noSucc(x);
	for (let i = i0; i < sp; i++) {
		row.push(ordinalAdd(x0, BigInt(i)));
	}
	return row;
};

const countbackOrd = (ord: Real | Conway, n: number): (Real | Conway)[][] => {
	const arr: (Real | Conway)[][] = [];
	let x: Real | Conway = ord;

	while (true) {
		if (isSucc(x)) {
			const row = unSucc(x, n);
			if (row.length) {
				arr.push(row);
			}
			x = noSucc(x);
		}
		if (isZero(x)) {
			break;
		}
		const row: (Real | Conway)[] = [];
		x = ensure(x);
		let n0 = 1;
		for (let i = n; i >= n0; i--) {
			const last = canon(x, i);
			row.push(last);
			if (isSucc(last) && n0) {
				n0 = 0;
				row.shift();
			}
		}
		arr.push(row.reverse());
		if (!isLimit(x)) {
			break;
		}
		x = canon(x, n0);
	}
	return arr.reverse();
};

const summarizesignExpansion = (seq: Seq<Sign>, n: number) => {
	const len = seq.length;
	const cb = countbackOrd(len, n);
	for (const row of cb) {
		console.log(
			`f[${row[0]}, ${row[1]}, ...] =`,
			row.map((i) => (seq.index(ensure(i)) ? "+" : "-")).join(""),
		);
	}
};

const s1 = cycleArray([1, 2, 3]);
const s2 = fromArray([4, 5, 6]);
const s12 = concat(s1, s2);
console.log(`|s1| = ${s1.length}, |s2| = ${s2.length}, |s12| = ${s12.length}`);

const a = new Conway([[0, 1]]);
const b = new Conway([
	[1, 1],
	[0, 1],
]);
const [q] = a.divRemIters(b, 10);
console.log(`a = ${a}`);
console.log(`b = ${b}`);
console.log(`a/b = ${q}`);
console.log(`b(${a}) = ${a.birthday()}`);
console.log(`b(${b}) = ${b.birthday()}`);
console.log(`b(${q}) = ${birthday(q)}`);

const x0 = new Conway([
	[0, 1],
	[unit.neg(), 2],
	[unit.neg().add(real(-4)), 6],
]);
console.log(`b(${x0}) = ${birthday(x0)}`);

const x1 = new Conway([
	[0, 1],
	[unit.neg(), 2],
]);
console.log(`b(${x1}) = ${birthday(x1)}`);

const x2 = new Conway([
	[0, 4],
	[one.neg(), 6],
]);
console.log(`b(${x2}) = ${birthday(x2)}`);

const x3 = new Conway([
	[
		new Conway([
			[1, -1],
			[0, -1],
		]),
		1,
	],
	[one.neg(), 2],
]);

const x4 = new Conway([[0, -4.2345]]);

const x5 = new Conway([[2, 0.5]]);

const x6 = new Conway([[-1, 2]]);

const x7 = new Conway([[-1, -2]]);

const x8 = new Conway([[0.75, 3.5]]);

const x9 = new Conway([
	[mono1(mono1(unit)).add(-0.5), 2.75],
	[unit, -2.5],
	[1, 4],
	[-Math.E, 3],
	[-Math.PI, 8],
	[unit.add(unit.mult(0.5)).add(2.44).neg(), 3],
]);

const x10 = new Conway([
	[1, 4],
	[-Math.E, 3],
	[-Math.PI, 8],
	[unit.add(unit.mult(0.5)).add(2.44).neg(), 3],
]);

const xs = [a, b, q, x0, x1, x2, x3, x4, x5, x6, x7, x8, x9, x10];
for (const x of [mono1(-1)]) {
	console.log(`b(${x}) = ${birthday(x)}`);
	const se = signExpansion(x);
	console.log(`SE(${x}) =`, se);
	summarizesignExpansion(se, 6);
	// const cnf = cnfOrDefault(se, 10);
	const e = expandOrDefault(se, 10);
	console.log(`e(SE(${x})) =`, e);
	// console.log(`cnf(SE(${x})) = `, cnf);
	// console.log(`cnf(SE(${x})) =`, summarizeCnf(cnf, signExpansionToString));
	console.log(
		`\$\$\\text{signExpansion}(${ordToLaTeX(ensure(x))}) = ${summarizeExpansionLaTeX(e, signExpansionToString)}\$\$`,
	);
	console.log("");
}

for (const x of xs) {
	const se = signExpansion(x);
	const e = expandOrDefault(se, 10);
	console.log(
		`\$\$\\text{signExpansion}(${ordToLaTeX(ensure(x))}) = ${summarizeExpansionLaTeX(e, signExpansionToString)}\$\$`,
	);
}
console.log("");

// biome-ignore lint/correctness/noConstantCondition: <explanation>
if (false) {
	const ords = [
		unit,
		unit.mult(2n),
		unit.mult(2n).add(mono(4n, unit)),
		mono(4n, unit),
		mono1(unit),
		mono(2n, unit.add(2n))
			.add(mono(4n, unit.add(10n)))
			.add(mono(2n, 1)),
	];

	const countback = (ord: Real | Conway, n: number) => {
		let x: Real | Conway = ord;
		while (true) {
			if (isSucc(x)) {
				x = noSucc(x);
			}
			if (isZero(x) || !(x instanceof Conway)) {
				break;
			}
			console.log("...");
			for (let i = n; i > 0; i--) {
				console.log(`${canon(x, i)}`);
			}
			if (!isLimit(x)) {
				break;
			}
			x = canon(x, 1);
		}
	};

	for (const ord of ords) {
		console.log(`canon(${ord}) = [`);
		Array(5)
			.fill(null)
			.forEach((_, i) => console.log("  ", canon(ord, i)));
		console.log("]");

		countback(ord, 5);
	}

	console.log(unit.add(1).ordinalPow(4n));
	console.log(mono(4n, 6n).add(1n).ordinalPow(10n));
	console.log(mono(4n, 6n).add(mono(3n, 3n)).add(1n).ordinalPow(10n));
	console.log(
		mono(2n, unit).add(mono(4n, 6n)).add(mono(3n, 3n)).add(1n).ordinalPow(10n),
	);
	console.log(
		mono(2n, unit).add(mono(4n, 6n)).add(mono(3n, 3n)).ordinalPow(10n),
	);
}

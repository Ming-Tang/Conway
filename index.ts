import { Conway } from "./conway";

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
console.log(`b(${q}) = ${Conway.birthday(q)}`);

const x0 = new Conway([
	[0, 1],
	[Conway.unit.neg(), 2],
	[Conway.unit.neg().add(Conway.real(-4)), 6],
]);
console.log(`b(${x0}) = ${Conway.birthday(x0)}`);

const x1 = new Conway([
	[0, 1],
	[Conway.unit.neg(), 2],
]);
console.log(`b(${x1}) = ${Conway.birthday(x1)}`);

const x2 = new Conway([
	[0, 4],
	[Conway.one.neg(), 6],
]);
console.log(`b(${x2}) = ${Conway.birthday(x2)}`);

const x3 = new Conway([
	[
		new Conway([
			[1, -1],
			[0, -1],
		]),
		1,
	],
	[Conway.one.neg(), 2],
]);
console.log(`b(${x3}) = ${Conway.birthday(x3)}`);

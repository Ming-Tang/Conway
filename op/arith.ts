import { Conway } from "../conway";
import type { Real } from "../conway";

export const neg = Conway.neg;
export const add = Conway.add;
export const sub = Conway.sub;
export const mult = Conway.mult;
export const divRem = (a: Conway, b: Conway | Real) => a.divRem(b);
export const divRemIters = (a: Conway, b: Conway | Real, n: number) => a.divRemIters(b, n);

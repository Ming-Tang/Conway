import { Conway, type Conway0 } from "../../conway";
import { add0, mult0, neg0, sub0 } from "../arith";

Conway.prototype.neg = function (this: Conway) {
	return neg0(this);
};

// @ts-expect-error Type specified in header
Conway.prototype.add = function (this: Conway, other: B): Conway {
	return add0(this, other);
};

Conway.prototype.sub = function (this: Conway, other: Conway0): Conway {
	return sub0(this, other);
};

// @ts-expect-error Type specified in header
Conway.prototype.mult = function (this: Conway, other: Conway0): Conway {
	return mult0(this, other);
};

declare module "../../conway" {
	interface Conway<IsOrd extends boolean = boolean> {
		neg(): Conway;
		add<B extends Conway0 = Conway0>(
			other: B,
		): Conway<BothIsOrd<IsOrd, InferIsOrd<B>>>;
		sub(other: Conway0): Conway;
		mult<B extends Conway0 = Conway0>(
			other: B,
		): Conway<BothIsOrd<IsOrd, InferIsOrd<B>>>;
	}
}

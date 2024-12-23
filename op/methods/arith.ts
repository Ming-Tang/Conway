import { Conway, type Conway0 } from "../../conway";
import { addWrapped, multWrapped, negWrapped, subWrapped } from "../arith";

Conway.prototype.neg = function (this: Conway) {
	return negWrapped(this);
};

// @ts-expect-error Type specified in header
Conway.prototype.add = function (this: Conway, other: B): Conway {
	return addWrapped(this, other);
};

Conway.prototype.sub = function (this: Conway, other: Conway0): Conway {
	return subWrapped(this, other);
};

// @ts-expect-error Type specified in header
Conway.prototype.mult = function (this: Conway, other: Conway0): Conway {
	return multWrapped(this, other);
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

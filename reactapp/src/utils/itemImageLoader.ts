import { GameError, GameErrorType } from "@/types/shared/error.ts";
import W50 from "@images/items/W50.png";
import W100 from "@images/items/W100.png";
import W200 from "@images/items/W200.png";
import W250 from "@images/items/W250.png";
import W500 from "@images/items/W500.png";
import W1000 from "@images/items/W1000.png";
import Apple from "@images/items/apple.png";
import Aubergine from "@images/items/aubergine.png";
import Banana from "@images/items/banana.png";
import Bikini from "@images/items/bikini.png";
import Bills from "@images/items/bills.png";
import BlueCup from "@images/items/bluecup.png";
import BluePlate from "@images/items/blueplate.png";
import Bracelet from "@images/items/bracelet.png";
import Card from "@images/items/card.png";
import Carrot from "@images/items/carrot.png";
import Chili from "@images/items/chili.png";
import Coconut from "@images/items/coconut.png";
import Coin from "@images/items/coin.png";
import Curry from "@images/items/curry.png";
import FlipFlop from "@images/items/flipflop.png";
import Garlic from "@images/items/garlic.png";
import Glasses from "@images/items/glasses.png";
import Lemon from "@images/items/lemon.png";
import Lime from "@images/items/lime.png";
import Melon from "@images/items/melon.png";
import Mug from "@images/items/mug.png";
import Oregano from "@images/items/oregano.png";
import Papaya from "@images/items/papaya.png";
import Pear from "@images/items/pear.png";
import Pearl from "@images/items/pearl.png";
import Pepper from "@images/items/pepper.png";
import Pineapple from "@images/items/pineapple.png";
import Pumpkin from "@images/items/pumpkin.png";
import RedCup from "@images/items/redcup.png";
import RedPlate from "@images/items/redplate.png";
import Shell from "@images/items/shell.png";
import Shirt from "@images/items/shirt.png";
import Shorts from "@images/items/shorts.png";
import Spoon from "@images/items/spoon.png";
import Sugar from "@images/items/sugar.png";
import Sweets from "@images/items/sweets.png";
import Teapot from "@images/items/teapot.png";

const items: Map<string, string> = new Map<string, string>([
    ["apple", Apple],
    ["aubergine", Aubergine],
    ["banana", Banana],
    ["bikini", Bikini],
    ["bills", Bills],
    ["bluecup", BlueCup],
    ["blueplate", BluePlate],
    ["bracelet", Bracelet],
    ["card", Card],
    ["carrot", Carrot],
    ["chili", Chili],
    ["coconut", Coconut],
    ["coin", Coin],
    ["curry", Curry],
    ["flipflop", FlipFlop],
    ["garlic", Garlic],
    ["glasses", Glasses],
    ["lemon", Lemon],
    ["lime", Lime],
    ["melon", Melon],
    ["mug", Mug],
    ["oregano", Oregano],
    ["papaya", Papaya],
    ["pear", Pear],
    ["pearl", Pearl],
    ["pepper", Pepper],
    ["pineapple", Pineapple],
    ["pumpkin", Pumpkin],
    ["redcup", RedCup],
    ["redplate", RedPlate],
    ["shell", Shell],
    ["shirt", Shirt],
    ["shorts", Shorts],
    ["spoon", Spoon],
    ["sugar", Sugar],
    ["sweets", Sweets],
    ["teapot", Teapot],
    ["W50", W50],
    ["W100", W100],
    ["W200", W200],
    ["W250", W250],
    ["W500", W500],
    ["W1000", W1000]
]);

export function getImageSourceByName(name: string): string {
    const src: string | undefined = items.get(name);
    if (src === undefined) {
        console.error(`The name ${name} of the item is not well defined.`);
        throw new GameError(GameErrorType.EXERCISE_ERROR);
    }
    return src;
}

import { Operator } from "@/types/math/enums.ts";
import { LinearEquation } from "@/types/math/linearEquation.ts";
import { Term } from "@/types/math/term.ts";
import { SubstitutionItem } from "@/types/shared/item.ts";
import { SubstitutionItemType } from "@/types/substitution/conceptual-knowledge/enums.ts";
import { SubstitutionExercise } from "@/types/substitution/conceptual-knowledge/substitutionExercise.ts";

export interface IItemEquation {
    readonly leftItems: SubstitutionItem[];
    readonly rightItems: SubstitutionItem[];
}

export class ItemEquation implements IItemEquation {
    constructor(
        public readonly leftItems: SubstitutionItem[],
        public readonly rightItems: SubstitutionItem[]
    ) {}

    public static getItemEquationFromLinearEquation(exercise: SubstitutionExercise, equation: LinearEquation): ItemEquation {
        const leftItems: SubstitutionItem[] = [];
        equation.leftTerms.map((term: Term): void => {
            leftItems.push(new SubstitutionItem(term.variable as string, term.coefficient.value as number, term.operator ?? Operator.Plus, this.getItemType(exercise, term.variable as string)));
        });

        const rightItems: SubstitutionItem[] = [];
        equation.rightTerms.map((term: Term): void => {
            rightItems.push(new SubstitutionItem(term.variable as string, term.coefficient.value as number, term.operator ?? Operator.Plus, this.getItemType(exercise, term.variable as string)));
        });

        return new ItemEquation(leftItems, rightItems);
    }

    private static getItemType(exercise: SubstitutionExercise, name: string): SubstitutionItemType {
        if (name === exercise.isolatedVariable.name) {
            return SubstitutionItemType.IsolatedVariable;
        } else if (name === exercise.secondVariable.name) {
            return SubstitutionItemType.SecondVariable;
        }
        return SubstitutionItemType.Coin;
    }
}

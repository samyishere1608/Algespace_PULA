import { SubstitutionItem } from "@/types/shared/item.ts";
import { SubstitutionLocation } from "@/types/substitution/conceptual-knowledge/enums.ts";

export interface ISubstitutionProps {
    readonly substitutionItems: SubstitutionItem[];
    readonly selectedItem?: SubstitutionItem;
    readonly itemLocation?: SubstitutionLocation;
}

export class SubstitutionInfo implements ISubstitutionProps {
    constructor(
        public readonly substitutionItems: SubstitutionItem[],
        public readonly selectedItem?: SubstitutionItem,
        public readonly itemLocation?: SubstitutionLocation
    ) {}
}

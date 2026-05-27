import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";

export default function HeadEntry({ name }: { name: string }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Variables);

    return (
        <th className={"notebook__table-entry head-entry"}>
            <p>{t(name + "-plural")}</p>
            <img src={getImageSourceByName(name)} alt={name} />
        </th>
    );
}

export function HeadEntryForCosts(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Variables);

    return (
        <th className={"notebook__table-entry head-entry head-entry-bills"}>
            <p>{t(EliminationConstants.BILL)}</p>
            <img src={getImageSourceByName(EliminationConstants.BILL)} alt={"bill"} />
        </th>
    );
}

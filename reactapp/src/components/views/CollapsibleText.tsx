import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { AboutTranslations } from "@/types/shared/aboutTranslations.ts";
import "@styles/views/collapsible-text.scss";

export default function CollapsibleText({ title, descriptions, references }: { title: string; descriptions: string[]; references: string[] }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.About);

    const [open, setOpen] = useState<boolean>(false);

    return (
        <div className={"collapsible-text"}>
            <div className={"collapsible-text__contents"}>
                <b>{t(title)}</b>
                <p>{t(descriptions[0])}</p>
                {open &&
                    descriptions.slice(1).map((text, index) => {
                        return <p key={index}>{t(text)}</p>;
                    })
                }
                {open &&
                    references.map((text, index) => {
                        return <p key={index}>{text}</p>;
                    })
                }
                {descriptions.length > 1 && (
                    <button className={"text-button--blue"} onClick={() => setOpen((open: boolean) => !open)}>
                        {open ? t(AboutTranslations.LESS) : t(AboutTranslations.MORE)}
                    </button>
                )}
            </div>
        </div>
    );
}

import { useAuth } from "@/contexts/AuthProvider.tsx";
import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "@styles/views/link.scss";

export default function NavLink({ to, translationKey }: { to: string; translationKey: string }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const { logout } = useAuth();

    return (
        <Link className={"link"} to={to} onClick={() => logout()}>
            {t(translationKey)}
        </Link>
    );
}

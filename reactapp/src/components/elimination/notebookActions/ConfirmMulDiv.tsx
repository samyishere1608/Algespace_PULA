import { TranslationNamespaces } from "@/i18n.ts";
import { faBan, faCalculator } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";
import { InputError } from "@/types/elimination/enums.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import CancelAction from "@components/elimination/notebookActions/CancelAction.tsx";

export default function ConfirmMulDiv({ cancelAction, multiplyOrDivideRow }: { cancelAction: () => void; multiplyOrDivideRow: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    return (
        <React.Fragment>
            <p>{t(EliminationTranslations.MUL_DIV_INSTR, { ns: TranslationNamespaces.Elimination })}</p>
            <div className={"action__buttons"}>
                <button className={"button notebook-button"} onClick={() => cancelAction()}>
                    <FontAwesomeIcon icon={faBan} />
                    {t(GeneralTranslations.BUTTON_CANCEL, { ns: TranslationNamespaces.General })}
                </button>
                <button className={"button notebook-button"} onClick={() => multiplyOrDivideRow()}>
                    <FontAwesomeIcon icon={faCalculator} />
                    {t(GeneralTranslations.BUTTON_APPLY, { ns: TranslationNamespaces.General })}
                </button>
            </div>
        </React.Fragment>
    );
}

export function MulDivError({ errorType, isMultiplication, cancelAction }: { errorType: InputError; isMultiplication: boolean; cancelAction: () => void }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Elimination);

    const textForInputError: TranslationInterpolation = EliminationTranslations.getInputError(isMultiplication);

    let message: ReactElement;
    switch (errorType) {
        case InputError.Validation: {
            message = (
                <React.Fragment>
                    <Trans ns={TranslationNamespaces.Elimination} i18nKey={textForInputError.translationKey} values={textForInputError.interpolationVariables as object} />
                    &#43;, &#8722;, &#215;, &#8725;
                </React.Fragment>
            );
            break;
        }

        case InputError.Evaluation: {
            message = (
                <React.Fragment>
                    {t(EliminationTranslations.INPUT_EVAL_ERROR)}
                    <Trans ns={TranslationNamespaces.Elimination} i18nKey={textForInputError.translationKey} values={textForInputError.interpolationVariables as object} />
                    &#43;, &#8722;, &#215;, &#8725;
                </React.Fragment>
            );
            break;
        }

        case InputError.OutOfRange: {
            message = <React.Fragment>{t(EliminationTranslations.INPUT_RANGE_ERROR)}</React.Fragment>;
            break;
        }
    }

    return (
        <React.Fragment>
            <p className={"notebook__input-feedback"}>{message}</p>
            <CancelAction text={EliminationTranslations.INPUT_ERROR_INSTR} cancelAction={cancelAction} />
        </React.Fragment>
    );
}

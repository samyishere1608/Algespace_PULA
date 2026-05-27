import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";
import { math } from "@/types/math/math.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { TermFromRow } from "@components/elimination/notebookActions/EquationFromRow.tsx";
import ImageEquation from "@components/math/conceptual-knowledge/ImageEquation.tsx";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";

export default function EquationChoice({ exercise, showFractions, text, handleClick }: { exercise: EliminationExercise; showFractions: boolean; text: TranslationInterpolation; handleClick: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    return (
        <div className={"notebook__page"}>
            <p>
                <Trans ns={[TranslationNamespaces.Elimination, TranslationNamespaces.Variables]} i18nKey={text.translationKey} values={text.interpolationVariables as object} />
            </p>
            <p> {t(EliminationTranslations.SYSTEM_SOL_1, { ns: TranslationNamespaces.Elimination })}</p>
            <div className={"action__system-equation"}>
                <p>1.</p>
                <ImageEquation equation={exercise.firstEquation} style={{ color: "var(--dark-text)" }} />
            </div>
            <div className={"action__system-equation"}>
                <p>2.</p>
                <ImageEquation equation={exercise.secondEquation} style={{ color: "var(--dark-text)" }} />
            </div>
            <p> {t(EliminationTranslations.SYSTEM_SOL_2, { ns: TranslationNamespaces.Elimination })}</p>
            <div className={"action__buttons"}>
                <div className={"action__equation-solution"}>
                    <div className={"image-equation__image"}>
                        <img src={getImageSourceByName(exercise.firstVariable.name)} alt={exercise.firstVariable.name} />
                    </div>
                    <p>&#61;</p>
                    <TermFromRow coefficient={math.fraction(exercise.firstVariable.solution.value)} variable={EliminationConstants.BILL} displayOperator={false} showFractions={showFractions} />
                </div>
                <div className={"action__equation-solution"}>
                    <div className={"image-equation__image"}>
                        <img src={getImageSourceByName(exercise.secondVariable.name)} alt={exercise.secondVariable.name} />
                    </div>
                    <p>&#61;</p>
                    <TermFromRow coefficient={math.fraction(exercise.secondVariable.solution.value)} variable={EliminationConstants.BILL} displayOperator={false} showFractions={showFractions} />
                </div>
            </div>
            <button className={"button primary-button"} onClick={handleClick}>
                {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faArrowRight} />
            </button>
        </div>
    );
}

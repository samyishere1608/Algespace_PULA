import React, { ReactElement, useMemo, useState } from "react";
import { getFirstEquation, getFirstSolution, getSecondEquation, getSecondTransformedEquationForEqualizationAndSubstitution } from "@utils/workedExamples.ts";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import EquivalenceSymbol from "@images/flexibility/equivalenceThin.svg";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { Language, TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Trans, useTranslation } from "react-i18next";
import { Step } from "@components/flexibility/workedExamples/Step.tsx";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { Method } from "@/types/flexibility/enums.ts";

const introductionDE1: ReactElement = <p>Um allgemein Gleichungssysteme und insbesondere das LGS</p>;
const introductionDE2: ReactElement = <p>mit dem <strong>Einsetzungsverfahren</strong> zu lösen, sind die folgenden
    Schritte erforderlich:</p>;
const introductionEN1: ReactElement = <p>To solve systems of equations with the <strong>substitution method</strong> in
    general and the LSE</p>;
const introductionEN2: ReactElement = <p>in particular, the following steps are required:</p>;

const instruction1DE: string = "Lösen einer der beiden Gleichungen im LGS für eine der unbekannten Variablen:";
const instruction1EN: string = "Solving one equation for one of the unknown variables:";
const description1DE: string = "Am einfachsten wäre, die zweite Gleichung des LGS für die Variable y zu lösen. Das ergibt die folgende Gleichung:";
const description1EN: string = "The easiest way would be to solve the second equation in the LSE for the variable y. This yields the following equation:";

const instruction2DE: string = "Einsetzen des Terms aus Schritt 1 in die andere Gleichung des Systems:";
const instruction2EN: string = "Substituting the expression obtained in step 1 into the other equation of the system:";
const description2DE: string = "Die umgeformte Gleichung drückt aus, dass wir die Variable y in der ersten Gleichung des LGS durch den Term 2x-3 ersetzen können. Dadurch erhalten wir die folgende Gleichung:";
const description2EN: string = "The transformed equation expresses that we can replace the variable y in the first equation of the LGS with the term 2x-3. This gives us the following equation:";

const instruction3DE: string = "Lösen der letzten Gleichung:";
const instruction3EN: string = "Solving the resulting equation:";
const description3DE: string = "Die letzte Gleichung enthält nur eine unbekannte Variable. Damit können wir die Lösung für die x berechnen:";
const description3EN: string = "The last equation contains only one unknown variable. Therefore, we can compute the solution for x:";

const instruction4DE: string = "Einsetzen der ersten Lösung in die Gleichung aus Schritt 1 oder in eine der Gleichungen des ursprünglichen LGS:";
const instruction4EN: string = "Substituting the first solution into the equation from step 1 or into one of the equations from the original LSE:";
const description4DE: string = "Einsetzen der Lösung für x in die Gleichung aus Schritt 1 ergibt:";
const description4EN: string = "Inserting the solution for x into the equation from step 1 yields:";

const solutionDE: string = "Die Lösung des LGS ist wieder";
const solutionEN: string = "Again, the the solution of the LSE is";

const tipDE: string = "Das Einsetzungsverfahren ist optimal, wenn einer der beiden Gleichungen im LGS bereits für eine unbekannte Variable gelöst ist. Dann kann Schritt 1 übersprungen werden.";
const tipEN: string = "The substitution method is optimal if one of the two equations in the LSE has already been solved for an unknown variable. Step 1 can then be skipped.";

export function WorkedExampleForSubstitution({ language, showAll, loadNextStep, loadPreviousStep }: {
    language: string;
    showAll: boolean;
    loadNextStep: () => void,
    loadPreviousStep: () => void
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Flexibility]);

    const firstEquation = useMemo(() => getFirstEquation(), []);
    const secondEquation = useMemo(() => getSecondEquation(), []);
    const secondTransformedEquation = useMemo(() => getSecondTransformedEquationForEqualizationAndSubstitution(), []);
    const label = useMemo(() => FlexibilityTranslations.getBackButtonLabel(Method.Equalization), []);

    const substitutionEquation: ReactElement = useMemo(() => <div className={"flexibility-equation flexibility-equation--light"}>
        <p>3</p>
        <p>x</p>
        <p>&#43;</p>
        <p>2</p>
        <p>(</p>
        <p>2</p>
        <p>x</p>
        <p>&#8722;</p>
        <p>3</p>
        <p>)</p>
        <p>&#61;</p>
        <p>8</p>
    </div>, []);

    const [showSecondStep, setShowSecondStep] = useState<boolean>(false);
    const [showThirdStep, setShowThirdStep] = useState<boolean>(false);
    const [showFourthStep, setShowFourthStep] = useState<boolean>(false);
    const [showTip, setShowTip] = useState<boolean>(false);

    return <React.Fragment>
        {language === Language.DE ? introductionDE1 : introductionEN1}
        <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} />
        {language === Language.DE ? introductionDE2 : introductionEN2}
        <Step language={language} num={1} instruction={language === Language.DE ? instruction1DE : instruction1EN}
              description={language === Language.DE ? description1DE : description1EN} />
        <FlexibilityEquation equation={secondTransformedEquation} classname={"flexibility-equation--light"} />
        {(showAll || showSecondStep) && <SecondStep language={language} substitutionEquation={substitutionEquation} />}
        {(showAll || showThirdStep) && <ThirdStep language={language} substitutionEquation={substitutionEquation} />}
        {(showAll || showFourthStep) && <FourthStep language={language} />}
        {(showAll || showFourthStep) && <p>{language === Language.DE ? solutionDE : solutionEN} (2,1).</p>}
        {(showAll || showTip) && <p>{language === Language.DE ? tipDE : tipEN}</p>}
        <div className={"worked-examples__buttons"}>
            <button className={"button primary-button"} onClick={loadPreviousStep}>
                <FontAwesomeIcon icon={faArrowLeft} />
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={label.translationKey} values={label.interpolationVariables as object} />
            </button>
            <button className={"button primary-button"} onClick={handleClick}>
                {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faArrowRight} />
            </button>
        </div>
    </React.Fragment>;

    function handleClick(): void {
        if (showAll || showTip) {
            loadNextStep();
        } else if (showFourthStep) {
            setShowTip(true);
        } else if (showThirdStep) {
            setShowFourthStep(true);
        } else if (showSecondStep) {
            setShowThirdStep(true);
        } else {
            setShowSecondStep(true);
        }
    }
}

function SecondStep({ language, substitutionEquation }: { language: string, substitutionEquation: ReactElement }): ReactElement {
    return <React.Fragment>
        <Step language={language} num={2} instruction={language === Language.DE ? instruction2DE : instruction2EN}
              description={language === Language.DE ? description2DE : description2EN} />
        {substitutionEquation}
    </React.Fragment>;
}

function ThirdStep({ language, substitutionEquation }: { language: string, substitutionEquation: ReactElement }): ReactElement {
    const firstSolution = useMemo(() => getFirstSolution(), []);

    return <React.Fragment>
        <Step language={language} num={3} instruction={language === Language.DE ? instruction3DE : instruction3EN}
              description={language === Language.DE ? description3DE : description3EN} />
        <div className={"worked-examples__equivalent-equations"}>
            {substitutionEquation}
            <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
            <div className={"flexibility-equation flexibility-equation--light"}>
                <p>3</p>
                <p>x</p>
                <p>&#43;</p>
                <p>4</p>
                <p>x</p>
                <p>&#8722;</p>
                <p>6</p>
                <p>&#61;</p>
                <p>8</p>
            </div>
            <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
            <div className={"flexibility-equation flexibility-equation--light"}>
                <p>7</p>
                <p>x</p>
                <p>&#61;</p>
                <p>14</p>
            </div>
            <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
            <FlexibilityEquation equation={firstSolution} classname={"flexibility-equation--light"} />
        </div>
    </React.Fragment>;
}

function FourthStep({ language }: { language: string }): ReactElement {
    return <React.Fragment>
        <Step language={language} num={4} instruction={language === Language.DE ? instruction4DE : instruction4EN}
              description={language === Language.DE ? description4DE : description4EN} />
        <div className={"flexibility-equation flexibility-equation--light"}>
            <p>y</p>
            <p>&#61;</p>
            <p>2</p>
            <p>&#8901;</p>
            <p>2</p>
            <p>&#8722;</p>
            <p>3</p>
            <p>&#61;</p>
            <p>1</p>
        </div>
    </React.Fragment>;
}
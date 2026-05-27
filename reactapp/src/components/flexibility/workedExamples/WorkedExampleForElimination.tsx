import React, { ReactElement, useMemo, useState } from "react";
import { getFirstEquation, getFirstSolution, getSecondEquation } from "@utils/workedExamples.ts";
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
const introductionDE2: ReactElement = <p>mit dem <strong>Additionsverfahren</strong> zu lösen, sind die folgenden
    Schritte erforderlich:</p>;
const introductionEN1: ReactElement = <p>To solve systems of equations with the <strong>elimination method</strong> in
    general and the LSE</p>;
const introductionEN2: ReactElement = <p>in particular, the following steps are required:</p>;

const instruction1DE: string = "Umformen der Gleichungen (optional):";
const instruction1EN: string = "Transforming the equations (optional):";
const description1DE: string = "Das Ziel des Additionsverfahrens ist es, durch Addieren oder Subtrahieren der Gleichungen im LGS eine Variable zu eliminieren. Je nach LGS müssen wir also eine oder beide Gleichungen mit konstanten Werten multiplizieren (oder dividieren), um die Vorfaktoren einer der Variablen so anzupassen, dass sie bis auf das Vorzeichen gleich sind. Im Fall des Beispielproblems könnte die zweite Gleichung mit dem Faktor 2 multipliziert werden:";
const description1EN: string = "The aim of the elimination method is to eliminate one variable by adding or subtracting the equations in the LSE. Depending on the LSE, we therefore have to multiply (or divide) one or both equations by constant values in order to adjust the coefficients of one of the variables so that they are the same except for the sign. In the case of the example problem, the second equation could be multiplied by a factor of 2:";

const instruction2DE: string = "Addieren (oder Subtrahieren) der Gleichungen:";
const instruction2EN: string = "Adding (or subtracting) the equations:";
const description2DE: string = "Addieren wir die erste Gleichung im LGS mit der umgeformten Gleichung aus Schritt 1, erhalten wir die folgende Gleichung:";
const description2EN: string = "If we add the first equation in the system to the transformed equation from step 1, we obtain the following equation:";

const instruction3DE: string = "Lösen der letzten Gleichung:";
const instruction3EN: string = "Solving the resulting equation:";
const description3DE: string = "Die letzte Gleichung enthält nur eine unbekannte Variable. Damit können wir die Lösung für die x berechnen:";
const description3EN: string = "The last equation contains only one unknown variable. Therefore, we can compute the solution for x:";

const instruction4DE: string = "Einsetzen der ersten Lösung in die Gleichung(en) aus Schritt 1 oder in eine der Gleichungen des ursprünglichen LGS:";
const instruction4EN: string = "Substituting the first solution into the equation(s) from step 1 or into one of the equations from the original LSE:";
const description4DE: string = "Einsetzen der Lösung für x in die zweite Gleichung des LGS ergibt:";
const description4EN: string = "Inserting the solution for x into the second equation of the LSE yields:";

const solutionDE: string = "Die Lösung des LGS ist wieder";
const solutionEN: string = "Again, the the solution of the LSE is";

const tipDE: string = "Im Vergleich zum Additionsverfahren muss das LGS zur Anwendung der anderen beiden Verfahren oft umgeformt werden. Es ist aber in Ordnung, wenn du die anderen beiden Verfahren bevorzugst.";
const tipEN: string = "Compared to the addition method, the LSE often has to be transformed to apply the other two methods. However, it is fine if you prefer the other two methods.";

const endDE: string = "Wenn du dir alles sorgfältig durchgelesen hast, bist du gut auf die anderen Aufgaben vorbereitet!";
const endEN: string = "If you have read through everything carefully, you will be well prepared for the other tasks!";

export function WorkedExampleForElimination({ language, loadNextStep, loadPreviousStep }: {
    language: string;
    loadNextStep: () => void,
    loadPreviousStep: () => void
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    const firstEquation = useMemo(() => getFirstEquation(), []);
    const secondEquation = useMemo(() => getSecondEquation(), []);
    const label = useMemo(() => FlexibilityTranslations.getBackButtonLabel(Method.Substitution), []);

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
        <div className={"flexibility-equation flexibility-equation--light"}>
            <p>4</p>
            <p>x</p>
            <p>&#8722;</p>
            <p>2</p>
            <p>y</p>
            <p>&#61;</p>
            <p>6</p>
        </div>
        {showSecondStep && <SecondStep language={language} />}
        {showThirdStep && <ThirdStep language={language} />}
        {showFourthStep && <FourthStep language={language} />}
        {showFourthStep && <p>{language === Language.DE ? solutionDE : solutionEN} (2,1).</p>}
        {showTip && <p>{language === Language.DE ? tipDE : tipEN}</p>}
        {showTip && <p>{language === Language.DE ? endDE : endEN}</p>}
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
        if (showTip) {
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

function SecondStep({ language }: { language: string }): ReactElement {
    return <React.Fragment>
        <Step language={language} num={2} instruction={language === Language.DE ? instruction2DE : instruction2EN}
              description={language === Language.DE ? description2DE : description2EN} />
        <div className={"flexibility-equation flexibility-equation--light"}>
            <p>7</p>
            <p>x</p>
            <p>&#61;</p>
            <p>14</p>
        </div>
    </React.Fragment>;
}

function ThirdStep({ language }: { language: string }): ReactElement {
    const firstSolution = getFirstSolution();

    return <React.Fragment>
        <Step language={language} num={3} instruction={language === Language.DE ? instruction3DE : instruction3EN}
              description={language === Language.DE ? description3DE : description3EN} />
        <div className={"worked-examples__equivalent-equations"}>
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
        <div className={"worked-examples__equivalent-equations"}>
            <div className={"flexibility-equation flexibility-equation--light"}>
                <p>2</p>
                <p>&#8901;</p>
                <p>2</p>
                <p>&#8722;</p>
                <p>y</p>
                <p>&#61;</p>
                <p>3</p>
            </div>
            <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
            <div className={"flexibility-equation flexibility-equation--light"}>
                <p>y</p>
                <p>&#61;</p>
                <p>1</p>
            </div>
        </div>
    </React.Fragment>;
}
import React, { ReactElement, useMemo, useState } from "react";
import {
    getEqualizationEquation,
    getFirstEquation,
    getFirstSolution,
    getFirstTransformedEquationForEqualization,
    getSecondEquation, getSecondTransformedEquationForEqualizationAndSubstitution,
    getSimplifiedEqualizationEquation
} from "@utils/workedExamples.ts";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import EquivalenceSymbol from "@images/flexibility/equivalenceThin.svg";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { Language, TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import { Step } from "@components/flexibility/workedExamples/Step.tsx";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";

const introductionDE1: ReactElement = <p>Um allgemein Gleichungssysteme und insbesondere das LGS</p>;
const introductionDE2: ReactElement = <p>mit dem <strong>Gleichsetzungsverfahren</strong> zu lösen, sind die folgenden
    Schritte erforderlich:</p>;
const introductionEN1: ReactElement = <p>To solve systems of equations with the <strong>equalization method</strong> in
    general and the LSE</p>;
const introductionEN2: ReactElement = <p>in particular, the following steps are required:</p>;

const instruction1DE: string = "Lösen beider Gleichungen im LGS für eine der unbekannten Variablen:";
const instruction1EN: string = "Solving both equations in the LSE for one of the unknown variables:";
const description1DE: string = "Der einfachste Ansatz wäre, beide Gleichung des LGS für die Variable y zu lösen. Das ergibt das folgende äquivalente System:";
const description1EN: string = "The simplest approach would be to solve both equations in the LSE for the variable y. This yields the following equivalent system:";

const instruction2DE: string = "Gleichsetzen beider Terme:";
const instruction2EN: string = "Setting both terms equal:";
const description2DE: string = "Da beide Terme auf der rechten Seite gleich y sind, müssen sie auch gleich sein, also:";
const description2EN: string = "Since both terms on the right-hand side are equal to y, they must also be equal to each other, thus:";

const instruction3DE: string = "Lösen der letzten Gleichung:";
const instruction3EN: string = "Solving the resulting equation:";
const description3DE: string = "Die letzte Gleichung enthält nur eine unbekannte Variable. Damit können wir die Lösung für die x berechnen:";
const description3EN: string = "The last equation contains only one unknown variable. Therefore, we can compute the solution for x:";

const instruction4DE: string = "Einsetzen der ersten Lösung in eine der Gleichungen aus Schritt 1 oder des ursprünglichen LGS:";
const instruction4EN: string = "Substituting the first solution into one of the equations from step 1 or into to original LSE:";
const description4DE: string = "Einsetzen der Lösung für x in die zweite Gleichung aus Schritt 1 ergibt:";
const description4EN: string = "Inserting the solution for x into the second equation from step 1 yields:";

const solutionDE: string = "Die Lösung des LGS lautet also";
const solutionEN: string = "The solution of the LSE is therefore";

const tipDE: string = "Das Gleichsetzungsverfahren ist am effizientesten, wenn beide Gleichungen im LGS bereits für dieselbe Variable gelöst sind, so dass Schritt 1 übersprungen werden kann.";
const tipEN: string = "The equalization method is most efficient when both equations in the LSE are already solved for the same variable, allowing step 1 to be skipped.";

export function WorkedExampleForEqualization({ language, showAll, loadNextStep }: {
    language: string; showAll: boolean;
    loadNextStep: () => void
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    const firstEquation = useMemo(() => getFirstEquation(), []);
    const secondEquation = useMemo(() => getSecondEquation(), []);
    const firstTransformedEquation = useMemo(() => getFirstTransformedEquationForEqualization(), []);
    const secondTransformedEquation = useMemo(() => getSecondTransformedEquationForEqualizationAndSubstitution(), []);
    const equalizationEquation = useMemo(() => getEqualizationEquation(), []);

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
        <LinearSystem firstEquation={firstTransformedEquation} secondEquation={secondTransformedEquation} />
        {(showAll || showSecondStep) && <SecondStep language={language} equalizationEquation={equalizationEquation} />}
        {(showAll || showThirdStep) && <ThirdStep language={language} equalizationEquation={equalizationEquation} />}
        {(showAll || showFourthStep) && <FourthStep language={language} />}
        {(showAll || showFourthStep) && <p>{language === Language.DE ? solutionDE : solutionEN} (2,1).</p>}
        {(showAll || showTip) && <p>{language === Language.DE ? tipDE : tipEN}</p>}
        <button className={"button primary-button"} onClick={handleClick}>
            {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
            <FontAwesomeIcon icon={faArrowRight} />
        </button>
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

function SecondStep({ language, equalizationEquation }: { language: string, equalizationEquation: FlexibilityEquationProps }): ReactElement {
    return <React.Fragment>
        <Step language={language} num={2} instruction={language === Language.DE ? instruction2DE : instruction2EN}
              description={language === Language.DE ? description2DE : description2EN} />
        <FlexibilityEquation equation={equalizationEquation} classname={"flexibility-equation--light"} />
    </React.Fragment>;
}

function ThirdStep({ language, equalizationEquation }: { language: string, equalizationEquation: FlexibilityEquationProps }): ReactElement {
    const simplifiedEqualizationEquation = useMemo(() => getSimplifiedEqualizationEquation(), []);
    const firstSolution = useMemo(() => getFirstSolution(), []);

    return <React.Fragment>
        <Step language={language} num={3} instruction={language === Language.DE ? instruction3DE : instruction3EN}
              description={language === Language.DE ? description3DE : description3EN} />
        <div className={"worked-examples__equivalent-equations"}>
            <FlexibilityEquation equation={equalizationEquation} classname={"flexibility-equation--light"} />
            <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
            <FlexibilityEquation equation={simplifiedEqualizationEquation} classname={"flexibility-equation--light"} />
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
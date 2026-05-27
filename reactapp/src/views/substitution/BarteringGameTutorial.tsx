import { useAuth } from "@/contexts/AuthProvider.tsx";
import { Language, TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
import React, { ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { TutorialInstruction } from "@/types/shared/tutorialInstruction.ts";
import { BarteringTranslations } from "@/types/substitution/substitutionTranslations.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import OrientationModal from "@components/shared/OrientationModal.tsx";
import Tutorial from "@components/views/Tutorial.tsx";
import { Paths } from "@routes/paths.ts";
import { setCKStudyTutorialCompleted, setCKTutorialCompleted } from "@utils/storageUtils.ts";
import ExchangeDe from "@images/tutorials/bartering/bartering-exchange-button-de.png";
import ExchangeEn from "@images/tutorials/bartering/bartering-exchange-button-en.png";
import HintsDe from "@images/tutorials/bartering/bartering-hints-button-de.png";
import HintsEn from "@images/tutorials/bartering/bartering-hints-button-en.png";
import InventoryDe from "@images/tutorials/bartering/bartering-inventory-de.png";
import InventoryEn from "@images/tutorials/bartering/bartering-inventory-en.png";
import MerchantDe from "@images/tutorials/bartering/bartering-merchant-de.png";
import MerchantEn from "@images/tutorials/bartering/bartering-merchant-en.png";
import PlainDe from "@images/tutorials/bartering/bartering-plain-de.png";
import PlainEn from "@images/tutorials/bartering/bartering-plain-en.png";
import TaskDe from "@images/tutorials/bartering/bartering-task-de.png";
import TaskEn from "@images/tutorials/bartering/bartering-task-en.png";
import UndoDe from "@images/tutorials/bartering/bartering-undo-redo-buttons-de.png";
import UndoEn from "@images/tutorials/bartering/bartering-undo-redo-buttons-en.png";

export default function BarteringGameTutorial({ isStudy = false }: { isStudy?: boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Substitution);
    const location = useLocation();
    const { logout } = useAuth();
    const { studyId } = useParams();

    const instructions: TutorialInstruction[] = [
        new TutorialInstruction([t(BarteringTranslations.TUTORIAL_STORY)], PlainDe, PlainEn),
        new TutorialInstruction([t(BarteringTranslations.TUTORIAL_TASK)], TaskDe, TaskEn),
        new TutorialInstruction([t(BarteringTranslations.TUTORIAL_INVENTORY)], InventoryDe, InventoryEn),
        new TutorialInstruction([t(BarteringTranslations.TUTORIAL_MERCHANT)], MerchantDe, MerchantEn, "bartering-instruction"),
        new TutorialInstruction([t(BarteringTranslations.TUTORIAL_EXCHANGE)], ExchangeDe, ExchangeEn, "bartering-instruction"),
        new TutorialInstruction([t(BarteringTranslations.TUTORIAL_HINTS)], HintsDe, HintsEn),
        new TutorialInstruction([t(BarteringTranslations.TUTORIAL_UNDO_REDO)], UndoDe, UndoEn),
        new TutorialInstruction(undefined, PlainDe, PlainEn)
    ];

    const isGerman: boolean = useMemo((): boolean => {
        return getCurrentLanguage() === Language.DE;
    }, []);

    if (isStudy) {
        if (studyId === undefined || studyId === "undefined") {
            logout();
            return <ErrorScreen text={ErrorTranslations.ERROR_STUDY_ID} routeToReturn={Paths.StudiesLoginPath} showFrownIcon={true} />;
        } else {
            return (
                <React.Fragment>
                    <Tutorial title={t(BarteringTranslations.TUTORIAL_TITLE)} isGerman={isGerman} instructions={instructions} returnTo={Paths.CKStudyPath + studyId} setTutorialCompleted={() => setCKStudyTutorialCompleted(studyId, "bartering")} />
                    <OrientationModal />
                </React.Fragment>
            );
        }
    } else {
        const isOnboarding: boolean = location.state?.onboarding === true;
        return (
            <React.Fragment>
                <Tutorial
                    title={t(BarteringTranslations.TUTORIAL_TITLE)}
                    isGerman={isGerman}
                    instructions={instructions}
                    returnTo={isOnboarding ? Paths.HomePath : Paths.SubstitutionPath}
                    navigateToExercise={isOnboarding ? Paths.OnboardingBarteringGamePath : Paths.BarteringGamePath}
                    exercises={location.state?.exercises}
                    setTutorialCompleted={() => setCKTutorialCompleted("bartering")}
                    hideReturnButton={isOnboarding}
                />
                <OrientationModal />
            </React.Fragment>
        );
    }
}

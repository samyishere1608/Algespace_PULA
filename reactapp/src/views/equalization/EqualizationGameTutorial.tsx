import { useAuth } from "@/contexts/AuthProvider.tsx";
import { Language, TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
import React, { ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { EqualizationTranslations } from "@/types/equalization/equalizationTranslations.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { TutorialInstruction } from "@/types/shared/tutorialInstruction.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import OrientationModal from "@components/shared/OrientationModal.tsx";
import Tutorial from "@components/views/Tutorial.tsx";
import { Paths } from "@routes/paths.ts";
import { setCKStudyTutorialCompleted, setCKTutorialCompleted } from "@utils/storageUtils.ts";
import HintsDe from "@images/tutorials/equalization/equalization-hints-button-de.png";
import HintsEn from "@images/tutorials/equalization/equalization-hints-button-en.png";
import InstructionDe from "@images/tutorials/equalization/equalization-instruction-de.png";
import InstructionEn from "@images/tutorials/equalization/equalization-instruction-en.png";
import ItemsDe from "@images/tutorials/equalization/equalization-items-de.png";
import ItemsEn from "@images/tutorials/equalization/equalization-items-en.png";
import PlainDe from "@images/tutorials/equalization/equalization-plain-de.png";
import PlainEn from "@images/tutorials/equalization/equalization-plain-en.png";
import ScaleDe from "@images/tutorials/equalization/equalization-scale-de.png";
import ScaleEn from "@images/tutorials/equalization/equalization-scale-en.png";
import SystemDe from "@images/tutorials/equalization/equalization-system-de.png";
import SystemEn from "@images/tutorials/equalization/equalization-system-en.png";
import UndoDe from "@images/tutorials/equalization/equalization-undo-redo-buttons-de.png";
import UndoEn from "@images/tutorials/equalization/equalization-undo-redo-buttons-en.png";
import VerifyDe from "@images/tutorials/equalization/equalization-verify-button-de.png";
import VerifyEn from "@images/tutorials/equalization/equalization-verify-button-en.png";

export default function EqualizationGameTutorial({ isStudy = false }: { isStudy?: boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Equalization);
    const location = useLocation();
    const { logout } = useAuth();
    const { studyId } = useParams();

    const instructions: TutorialInstruction[] = [
        new TutorialInstruction([t(EqualizationTranslations.TUTORIAL_STORY_1), t(EqualizationTranslations.TUTORIAL_STORY_2), t(EqualizationTranslations.TUTORIAL_STORY_3), t(EqualizationTranslations.TUTORIAL_STORY_4)], PlainDe, PlainEn),
        new TutorialInstruction([t(EqualizationTranslations.TUTORIAL_INSTRUCTION)], InstructionDe, InstructionEn),
        new TutorialInstruction([t(EqualizationTranslations.TUTORIAL_SCALE)], ScaleDe, ScaleEn, "equalization-instruction"),
        new TutorialInstruction([t(EqualizationTranslations.TUTORIAL_ITEMS)], ItemsDe, ItemsEn),
        new TutorialInstruction([t(EqualizationTranslations.TUTORIAL_SYSTEM)], SystemDe, SystemEn),
        new TutorialInstruction([t(EqualizationTranslations.TUTORIAL_UNDO_REDO)], UndoDe, UndoEn),
        new TutorialInstruction([t(EqualizationTranslations.TUTORIAL_HINTS)], HintsDe, HintsEn),
        new TutorialInstruction([t(EqualizationTranslations.TUTORIAL_VERIFY)], VerifyDe, VerifyEn),
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
                    <Tutorial title={t(EqualizationTranslations.TUTORIAL_TITLE)} isGerman={isGerman} instructions={instructions} returnTo={Paths.CKStudyPath + studyId} setTutorialCompleted={() => setCKStudyTutorialCompleted(studyId, "equalization")} />
                    <OrientationModal />
                </React.Fragment>
            );
        }
    } else {
        const isOnboarding: boolean = location.state?.onboarding === true;
        return (
            <React.Fragment>
                <Tutorial
                    title={t(EqualizationTranslations.TUTORIAL_TITLE)}
                    isGerman={isGerman}
                    instructions={instructions}
                    returnTo={isOnboarding ? Paths.HomePath : Paths.EqualizationPath}
                    navigateToExercise={isOnboarding ? Paths.OnboardingEqualizationGamePath : Paths.EqualizationGamePath}
                    exercises={location.state?.exercises}
                    setTutorialCompleted={() => setCKTutorialCompleted("equalization")}
                    hideReturnButton={isOnboarding}
                />
                <OrientationModal />
            </React.Fragment>
        );
    }
}

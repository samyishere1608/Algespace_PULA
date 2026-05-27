import { useAuth } from "@/contexts/AuthProvider.tsx";
import { Language, TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
import React, { ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { TutorialInstruction } from "@/types/shared/tutorialInstruction.ts";
import { SubstitutionTranslations } from "@/types/substitution/substitutionTranslations.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import OrientationModal from "@components/shared/OrientationModal.tsx";
import Tutorial from "@components/views/Tutorial.tsx";
import { Paths } from "@routes/paths.ts";
import { setCKStudyTutorialCompleted, setCKTutorialCompleted } from "@utils/storageUtils.ts";
import HintsDe from "@images/tutorials/substitution/substitution-hints-button-de.png";
import HintsEn from "@images/tutorials/substitution/substitution-hints-button-en.png";
import PlainDe from "@images/tutorials/substitution/substitution-plain-de.png";
import PlainEn from "@images/tutorials/substitution/substitution-plain-en.png";
import SelectionDe from "@images/tutorials/substitution/substitution-selection-de.png";
import SelectionEn from "@images/tutorials/substitution/substitution-selection-en.png";
import SubstitutionDe from "@images/tutorials/substitution/substitution-substitution-de.png";
import SubstitutionEn from "@images/tutorials/substitution/substitution-substitution-en.png";
import UndoDe from "@images/tutorials/substitution/substitution-undo-button-de.png";
import UndoEn from "@images/tutorials/substitution/substitution-undo-button-en.png";

export default function SubstitutionGameTutorial({ isStudy = false }: { isStudy?: boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Substitution);
    const location = useLocation();
    const { logout } = useAuth();
    const { studyId } = useParams();

    const instructions: TutorialInstruction[] = [
        new TutorialInstruction([t(SubstitutionTranslations.TUTORIAL_STORY_1), t(SubstitutionTranslations.TUTORIAL_STORY_2)], PlainDe, PlainEn),
        new TutorialInstruction([t(SubstitutionTranslations.TUTORIAL_GENERAL)], PlainDe, PlainEn),
        new TutorialInstruction([t(SubstitutionTranslations.TUTORIAL_SELECTION)], SelectionDe, SelectionEn, "substitution-selection-instruction"),
        new TutorialInstruction([t(SubstitutionTranslations.TUTORIAL_HINTS)], HintsDe, HintsEn),
        new TutorialInstruction([t(SubstitutionTranslations.TUTORIAL_SUBSTITUTION)], SubstitutionDe, SubstitutionEn, "substitution-substitution-instruction"),
        new TutorialInstruction([t(SubstitutionTranslations.TUTORIAL_UNDO)], UndoDe, UndoEn),
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
                    <Tutorial title={t(SubstitutionTranslations.TUTORIAL_TITLE)} isGerman={isGerman} instructions={instructions} returnTo={Paths.CKStudyPath + studyId} setTutorialCompleted={() => setCKStudyTutorialCompleted(studyId, "substitution")} />
                    <OrientationModal />
                </React.Fragment>
            );
        }
    } else {
        return (
            <React.Fragment>
                <Tutorial title={t(SubstitutionTranslations.TUTORIAL_TITLE)} isGerman={isGerman} instructions={instructions} returnTo={Paths.SubstitutionPath} navigateToExercise={Paths.SubstitutionGamePath} exercises={location.state?.exercises} setTutorialCompleted={() => setCKTutorialCompleted("substitution")} />
                <OrientationModal />
            </React.Fragment>
        );
    }
}

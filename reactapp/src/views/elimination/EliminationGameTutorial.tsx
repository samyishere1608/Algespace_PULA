import { useAuth } from "@/contexts/AuthProvider.tsx";
import { Language, TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
import React, { ReactElement, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { TutorialInstruction } from "@/types/shared/tutorialInstruction.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import OrientationModal from "@components/shared/OrientationModal.tsx";
import Tutorial from "@components/views/Tutorial.tsx";
import { Paths } from "@routes/paths.ts";
import { setCKStudyTutorialCompleted, setCKTutorialCompleted } from "@utils/storageUtils.ts";
import AddSubButtonsDe from "@images/tutorials/elimination/elimination-add-subtract-buttons-de.png";
import AddSubButtonsEn from "@images/tutorials/elimination/elimination-add-subtract-buttons-en.png";
import CopyDe from "@images/tutorials/elimination/elimination-copy-delete-buttons-de.png";
import CopyEn from "@images/tutorials/elimination/elimination-copy-delete-buttons-en.png";
import FloatingPointsDe from "@images/tutorials/elimination/elimination-floating-points-de.png";
import FloatingPointsEn from "@images/tutorials/elimination/elimination-floating-points-en.png";
import FractionsSwitchDe from "@images/tutorials/elimination/elimination-fractions-switch-de.png";
import FractionsSwitchEn from "@images/tutorials/elimination/elimination-fractions-switch-en.png";
import HintsDe from "@images/tutorials/elimination/elimination-hints-button-de.png";
import HintsEn from "@images/tutorials/elimination/elimination-hints-button-en.png";
import ImagesSwitchDe from "@images/tutorials/elimination/elimination-images-switch-de.png";
import ImagesSwitchEn from "@images/tutorials/elimination/elimination-images-switch-en.png";
import MulDivButtonsDe from "@images/tutorials/elimination/elimination-mul-div-buttons-de.png";
import MulDivButtonsEn from "@images/tutorials/elimination/elimination-mul-div-buttons-en.png";
import MulErrorDe from "@images/tutorials/elimination/elimination-mul-error-de.png";
import MulErrorEn from "@images/tutorials/elimination/elimination-mul-error-en.png";
import MulInputDe from "@images/tutorials/elimination/elimination-mul-input-de.png";
import MulInputEn from "@images/tutorials/elimination/elimination-mul-input-en.png";
import MulResultDe from "@images/tutorials/elimination/elimination-mul-result-de.png";
import MulResultEn from "@images/tutorials/elimination/elimination-mul-result-en.png";
import MulValidDe from "@images/tutorials/elimination/elimination-mul-valid-de.png";
import MulValidEn from "@images/tutorials/elimination/elimination-mul-valid-en.png";
import NewRowDe from "@images/tutorials/elimination/elimination-new-row-de.png";
import NewRowEn from "@images/tutorials/elimination/elimination-new-row-en.png";
import NotebookDe from "@images/tutorials/elimination/elimination-notebook-de.png";
import NotebookEn from "@images/tutorials/elimination/elimination-notebook-en.png";
import PlainDe from "@images/tutorials/elimination/elimination-plain-de.png";
import PlainEn from "@images/tutorials/elimination/elimination-plain-en.png";
import PostItDe from "@images/tutorials/elimination/elimination-post-it-de.png";
import PostItEn from "@images/tutorials/elimination/elimination-post-it-en.png";
import RowSelectionDe from "@images/tutorials/elimination/elimination-row-selection-de.png";
import RowSelectionEn from "@images/tutorials/elimination/elimination-row-selection-en.png";
import SolutionDe from "@images/tutorials/elimination/elimination-solution-de.png";
import SolutionEn from "@images/tutorials/elimination/elimination-solution-en.png";
import SubActionsDe from "@images/tutorials/elimination/elimination-subtraction-actions-de.png";
import SubActionsEn from "@images/tutorials/elimination/elimination-subtraction-actions-en.png";
import SubPreviewDe from "@images/tutorials/elimination/elimination-subtraction-preview-de.png";
import SubPreviewEn from "@images/tutorials/elimination/elimination-subtraction-preview-en.png";
import UndoDe from "@images/tutorials/elimination/elimination-undo-redo-buttons-de.png";
import UndoEn from "@images/tutorials/elimination/elimination-undo-redo-buttons-en.png";

export default function EliminationGameTutorial({ isStudy = false }: { isStudy?: boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Elimination);
    const location = useLocation();
    const { logout } = useAuth();
    const { studyId } = useParams();

    const classLeftAlign: string = "elimination-instruction-left";
    const instructions: TutorialInstruction[] = [
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_STORY_1), t(EliminationTranslations.TUTORIAL_STORY_2)], PlainDe, PlainEn),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_POST_IT)], PostItDe, PostItEn),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_NOTEBOOK)], NotebookDe, NotebookEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_ADD_SUB)], AddSubButtonsDe, AddSubButtonsEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_ROW_SELECT)], RowSelectionDe, RowSelectionEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_SUB_PREVIEW)], SubPreviewDe, SubPreviewEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_SUB_ACTIONS)], SubActionsDe, SubActionsEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_NEW_ROW)], NewRowDe, NewRowEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_UNDO_REDO)], UndoDe, UndoEn),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_COPY_DEL)], CopyDe, CopyEn, "elimination-instruction-left--small"),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_MUL_DIV)], MulDivButtonsDe, MulDivButtonsEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_MUL_INPUT)], MulInputDe, MulInputEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_MUL_ERROR)], MulErrorDe, MulErrorEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_MUL_VALID)], MulValidDe, MulValidEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_MUL_RESULT)], MulResultDe, MulResultEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_IMAGES_SWITCH)], ImagesSwitchDe, ImagesSwitchEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_FLOATING_POINTS)], FloatingPointsDe, FloatingPointsEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_FRAC_SWITCH)], FractionsSwitchDe, FractionsSwitchEn, classLeftAlign),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_HINTS)], HintsDe, HintsEn),
        new TutorialInstruction([t(EliminationTranslations.TUTORIAL_SOLUTION)], SolutionDe, SolutionEn, classLeftAlign),
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
                    <Tutorial title={t(EliminationTranslations.TUTORIAL_TITLE)} isGerman={isGerman} instructions={instructions} returnTo={Paths.CKStudyPath + studyId} setTutorialCompleted={() => setCKStudyTutorialCompleted(studyId, "elimination")} />
                    <OrientationModal />
                </React.Fragment>
            );
        }
    } else {
        const isOnboarding: boolean = location.state?.onboarding === true;
        return (
            <React.Fragment>
                <Tutorial
                    title={t(EliminationTranslations.TUTORIAL_TITLE)}
                    isGerman={isGerman}
                    instructions={instructions}
                    returnTo={isOnboarding ? Paths.HomePath : Paths.EliminationPath}
                    navigateToExercise={isOnboarding ? Paths.OnboardingEliminationGamePath : Paths.EliminationGamePath}
                    exercises={location.state?.exercises}
                    setTutorialCompleted={() => setCKTutorialCompleted("elimination")}
                    hideReturnButton={isOnboarding}
                />
                <OrientationModal />
            </React.Fragment>
        );
    }
}

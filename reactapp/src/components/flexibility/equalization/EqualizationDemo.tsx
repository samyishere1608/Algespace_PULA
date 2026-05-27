import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityDragSource, FlexibilityDragTarget } from "@/types/flexibility/enums.ts";
import React, { ReactElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { countElementsInTerm } from "@utils/utils.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { DraggableEqualizationEquation } from "@components/flexibility/equalization/DraggableEqualizationEquation.tsx";
import { DroppableEqualizationEquation } from "@components/flexibility/equalization/DroppableEqualizationEquation.tsx";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";

export function EqualizationDemo({ firstEquation, secondEquation }: {
    firstEquation: FlexibilityEquation;
    secondEquation: FlexibilityEquation;
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
                delay: 10,
                tolerance: 5
            }
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                distance: 8,
                delay: 10,
                tolerance: 5
            }
        })
    );

    const minWidth = useMemo(() => {
        const leftCount: number = Math.max(countElementsInTerm(firstEquation.leftTerms), countElementsInTerm(secondEquation.leftTerms), 1) * 1.5;
        const rightCount: number = Math.max(countElementsInTerm(firstEquation.rightTerms), countElementsInTerm(secondEquation.rightTerms), 1) * 1.5;
        return Math.max(leftCount, rightCount);
    }, [firstEquation, secondEquation]);

    const [leftTerms, setLeftTerms] = useState<[FlexibilityTerm[], FlexibilityDragSource]>();
    const [rightTerms, setRightTerms] = useState<[FlexibilityTerm[], FlexibilityDragSource]>();
    const [errorFeedback, setErrorFeedback] = useState<string | undefined>(undefined);
    const [successFeedback, setSuccessFeedback] = useState<boolean>(false);

    const disabled: boolean = errorFeedback !== undefined || successFeedback;

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[snapCenterToCursor]}>
            <div className={"equalization-application"}>
                <DraggableEqualizationEquation equation={firstEquation} isFirstEquation={true} isFirst={true} minWidth={minWidth} disabled={disabled} />
                <DraggableEqualizationEquation equation={secondEquation} isFirstEquation={false} isFirst={false} minWidth={minWidth} disabled={disabled} />
                <DroppableEqualizationEquation leftTerms={leftTerms !== undefined ? leftTerms[0] : undefined}
                                               rightTerms={rightTerms !== undefined ? rightTerms[0] : undefined}
                                               classname={successFeedback ? "--valid" : (errorFeedback !== undefined ? "--invalid" : "")}
                />
                {(leftTerms !== undefined && rightTerms !== undefined && !successFeedback && errorFeedback === undefined) && (
                    <button className={"button primary-button"} onClick={evaluateEquation} disabled={disabled}>
                        {t(GeneralTranslations.BUTTON_VERIFY_ANSWER, { ns: TranslationNamespaces.General })}
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                )}
            </div>
            {(errorFeedback !== undefined || successFeedback) && (
                <React.Fragment>
                    {successFeedback && <p>{t(FlexibilityTranslations.EQUALIZATION_DEMO_SOL)}</p>}
                    {errorFeedback !== undefined && <p>{t(errorFeedback)} {t(FlexibilityTranslations.TRY_AGAIN)}</p>}
                    <button className={"button primary-button"} onClick={reset}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        {t(FlexibilityTranslations.DEMO_TRY_AGAIN)}
                    </button>
                </React.Fragment>
            )}
        </DndContext>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragEnd(event: any): void {
        const { over, active } = event;

        let terms: FlexibilityTerm[] = firstEquation.leftTerms;
        let source: FlexibilityDragSource = FlexibilityDragSource.FirstLeft;
        switch (active.data.current.source) {
            case FlexibilityDragSource.FirstRight: {
                terms = firstEquation.rightTerms;
                source = FlexibilityDragSource.FirstRight;
                break;
            }
            case FlexibilityDragSource.SecondLeft: {
                terms = secondEquation.leftTerms;
                source = FlexibilityDragSource.SecondLeft;
                break;
            }
            case FlexibilityDragSource.SecondRight: {
                terms = secondEquation.rightTerms;
                source = FlexibilityDragSource.SecondRight;
                break;
            }
        }

        if (over === null) {
            return;
        }

        if (over.data.current.target === FlexibilityDragTarget.Left) {
            setLeftTerms([terms, source]);
        } else {
            setRightTerms([terms, source]);
        }
    }

    function evaluateEquation(): void {
        if (leftTerms === undefined || rightTerms === undefined) {
            return;
        }
        if (leftTerms[1] === rightTerms[1]) {
            setErrorFeedback(FlexibilityTranslations.EQUALIZATION_SAME_SOURCE_ERROR);
        } else if (leftTerms[0].length === 1 || rightTerms[0].length === 1) {
            if (leftTerms[0].length === 1 && rightTerms[0].length === 1) {
                setErrorFeedback(FlexibilityTranslations.EQUALIZATION_SAME_SOURCE_ERROR);
            } else {
                setErrorFeedback(FlexibilityTranslations.EQUALIZATION_TWO_VAR_ERROR);
            }
        } else {
            setSuccessFeedback(true);
        }
    }

    function reset(): void {
        setLeftTerms(undefined);
        setRightTerms(undefined);
        setErrorFeedback(undefined);
        setSuccessFeedback(false);
    }
}
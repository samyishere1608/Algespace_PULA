import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import React, { ReactElement, useMemo, useState } from "react";
import { FlexibilityDragSource, FlexibilityDragTarget, IsolatedIn, SubstitutionError } from "@/types/flexibility/enums.ts";
import { SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { DraggableSubstitutionEquation } from "@components/flexibility/substitution/DraggableSubstitutionEquation.tsx";
import { DroppableSubstitutionEquation } from "@components/flexibility/substitution/DroppableSubstitutionEquation.tsx";
import { coefficientIsOne } from "@utils/utils.ts";

export function SubstitutionApplication({ system, firstVariable, isolatedVariables, setSubstitutionParams, setAttempts, trackAction, trackError, isTip }: {
    system: [FlexibilityEquation, FlexibilityEquation];
    firstVariable: Variable;
    isolatedVariables: [IsolatedIn, IsolatedIn];
    setSubstitutionParams: (value: React.SetStateAction<SubstitutionResultParameters | undefined>) => void;
    setAttempts: (value: React.SetStateAction<number>) => void;
    trackAction: (action: string) => void;
    trackError: () => void;
    isTip: boolean;
}): ReactElement {
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

    const validDragSource: FlexibilityDragSource | undefined = useMemo(() => {
        if (isTip) {
            return getValidDragSource(system, isolatedVariables);
        }
        return undefined;
    }, [isTip, system, isolatedVariables]);

    const [dragSource, setDragSource] = useState<FlexibilityDragSource | null>(null);

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={[snapCenterToCursor]}>
            <div className={"substitution-application"}>
                <div className={"substitution-application__numbers"}>
                    <p>1.</p>
                    <p>2.</p>
                </div>
                <div className={"substitution-application__system"}>
                    {dragSource === null || dragSource === FlexibilityDragSource.FirstLeft || dragSource === FlexibilityDragSource.FirstRight ?
                        <DraggableSubstitutionEquation equation={system[0]} isFirstEquation={true} /> :
                        <DroppableSubstitutionEquation equation={system[0]} isValidDropLocation={isValidDropLocation} isTip={isTip} />}
                    {dragSource === null || dragSource === FlexibilityDragSource.SecondLeft || dragSource === FlexibilityDragSource.SecondRight ?
                        <DraggableSubstitutionEquation equation={system[1]} isFirstEquation={false} /> :
                        <DroppableSubstitutionEquation equation={system[1]} isValidDropLocation={isValidDropLocation} isTip={isTip} />}
                </div>
            </div>
        </DndContext>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragStart(event: any): void {
        setDragSource(event.active.data.current.source);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragEnd(event: any): void {
        setDragSource(null);

        const { over, active } = event;

        let substitutionItems: FlexibilityTerm[] = [];
        let isFirstEquation: boolean = true;
        let dragAction: string = "";
        switch (active.data.current.source) {
            case FlexibilityDragSource.FirstLeft: {
                const dragInfo = dragTrackingInfo(system[0].leftTerms);
                dragAction = `DRAG ${dragInfo} from FIRST LEFT and`;
                substitutionItems = system[0].leftTerms;
                isFirstEquation = false;
                break;
            }
            case FlexibilityDragSource.FirstRight: {
                const dragInfo = dragTrackingInfo(system[0].rightTerms);
                dragAction = `DRAG ${dragInfo} from FIRST RIGHT and`;
                substitutionItems = system[0].rightTerms;
                isFirstEquation = false;
                break;
            }
            case FlexibilityDragSource.SecondLeft: {
                const dragInfo = dragTrackingInfo(system[1].leftTerms);
                dragAction = `DRAG ${dragInfo} from SECOND LEFT and`;
                substitutionItems = system[1].leftTerms;
                break;
            }
            case FlexibilityDragSource.SecondRight: {
                const dragInfo = dragTrackingInfo(system[1].rightTerms);
                dragAction = `DRAG ${dragInfo} from SECOND RIGHT and`;
                substitutionItems = system[1].rightTerms;
                break;
            }
        }

        if (over === null) {
            trackAction("DROP OUTSIDE");
            return;
        }

        trackDrop(trackAction, trackError, dragAction, over.data.current.valid, over.data.current.target === FlexibilityDragTarget.Left, over.data.current.index, over.data.current.variable);

        const substitutionInfo: SubstitutionResultParameters = {
            isValid: over.data.current.valid,
            substitutionItems: substitutionItems,
            isFirstEquation: isFirstEquation,
            isLeft: over.data.current.target === FlexibilityDragTarget.Left,
            index: over.data.current.index,
            variable: over.data.current.variable,
            replaceAll: over.data.current.isUnion && isTip,
            error: over.data.current.error
        } as SubstitutionResultParameters;

        if (!over.data.current.valid) {
            setAttempts((prevState: number) => prevState + 1);
        }

        setSubstitutionParams(substitutionInfo);
    }

    function isValidDropLocation(isUnion: boolean, dropVariable?: string): [boolean, SubstitutionError] {
        if (isTip) {
            if (!isUnion) {
                if (dropVariable === undefined) {
                    return [false, SubstitutionError.ExchangedFactor];
                } else if (dragSource !== validDragSource) {
                    return [false, SubstitutionError.NotExchangeable];
                }
                return [false, SubstitutionError.ExchangedWrongVariable];
            }
            return [true, SubstitutionError.ExchangedFactor];
        }

        if (dropVariable === undefined) {
            return [false, SubstitutionError.ExchangedFactor];
        }

        const isFirstVariable = dropVariable === firstVariable.name;
        let isValid: boolean = false;
        let lengthFits: boolean = false;
        let isIsolated: boolean = false;
        if (dragSource !== null) {
            switch (dragSource) {
                case FlexibilityDragSource.FirstLeft: {
                    lengthFits = system[0].rightTerms.length === 1;
                    if (isFirstVariable) {
                        isValid = lengthFits && isolatedVariables[0] === IsolatedIn.First;
                    } else {
                        isValid = lengthFits && isolatedVariables[0] === IsolatedIn.Second;
                    }
                    isIsolated = isolatedVariables[0] !== IsolatedIn.None;
                    break;
                }
                case FlexibilityDragSource.FirstRight: {
                    lengthFits = system[0].leftTerms.length === 1;
                    if (isFirstVariable) {
                        isValid = lengthFits && isolatedVariables[0] === IsolatedIn.First;
                    } else {
                        isValid = lengthFits && isolatedVariables[0] === IsolatedIn.Second;
                    }
                    isIsolated = isolatedVariables[0] !== IsolatedIn.None;
                    break;
                }
                case FlexibilityDragSource.SecondLeft: {
                    lengthFits = system[1].rightTerms.length === 1;
                    if (isFirstVariable) {
                        isValid = lengthFits && isolatedVariables[1] === IsolatedIn.First;
                    } else {
                        isValid = lengthFits && isolatedVariables[1] === IsolatedIn.Second;
                    }
                    isIsolated = isolatedVariables[1] !== IsolatedIn.None;
                    break;
                }
                case FlexibilityDragSource.SecondRight: {
                    lengthFits = system[1].leftTerms.length === 1;
                    if (isFirstVariable) {
                        isValid = lengthFits && isolatedVariables[1] === IsolatedIn.First;
                    } else {
                        isValid = lengthFits && isolatedVariables[1] === IsolatedIn.Second;
                    }
                    isIsolated = isolatedVariables[1] !== IsolatedIn.None;
                    break;
                }
            }
        }

        const error: SubstitutionError = lengthFits && isIsolated ? SubstitutionError.ExchangedWrongVariable : SubstitutionError.NotExchangeable;
        return [isValid, error];
    }
}

function getValidDragSource(system: [FlexibilityEquation, FlexibilityEquation], isolatedVariables: [IsolatedIn, IsolatedIn]): FlexibilityDragSource {
    if (isolatedVariables[0] === IsolatedIn.FirstMultiple || isolatedVariables[0] === IsolatedIn.SecondMultiple) {
        return system[0].leftTerms.length === 1 ? FlexibilityDragSource.FirstLeft : FlexibilityDragSource.FirstRight;
    } else {
        return system[1].leftTerms.length === 1 ? FlexibilityDragSource.SecondLeft : FlexibilityDragSource.SecondRight;
    }
}

function trackDrop(trackAction: (action: string) => void, trackError: () => void, dragAction: string, isValid: boolean, isLeft: boolean, index: number, variable?: string) {
    if (isValid) {
        trackAction(`${dragAction} DROP for VAR ${variable},\nSUCCESS`);
    } else {
        trackAction(`${dragAction} DROP for ${variable === undefined ? "NUMBER" : `VAR ${variable}`} on ${index} ${isLeft ? "LEFT" : "RIGHT"},\nFAILED`);
        trackError();
    }
}

function dragTrackingInfo(terms: FlexibilityTerm[]): string {
    if (terms.length === 1) {
        if (terms[0].variable === null) {
            return "NUMBER";
        } else if (coefficientIsOne(terms[0].coefficient) && terms[0].coefficient.s > 0) {
            return "VAR";
        }
    }
    return "TERM";
}
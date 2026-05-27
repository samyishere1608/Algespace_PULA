import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import React, { ReactElement, useState } from "react";
import { FlexibilityDragSource, FlexibilityDragTarget, IsolatedIn, SubstitutionError } from "@/types/flexibility/enums.ts";
import { SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { DraggableSubstitutionEquation } from "@components/flexibility/substitution/DraggableSubstitutionEquation.tsx";
import { DroppableSubstitutionEquation } from "@components/flexibility/substitution/DroppableSubstitutionEquation.tsx";

export function SubstitutionDemoApplication({ system, firstVariable, isolatedVariables, setSubstitutionParams }: {
    system: [FlexibilityEquation, FlexibilityEquation];
    firstVariable: Variable;
    isolatedVariables: [IsolatedIn, IsolatedIn];
    setSubstitutionParams: (value: React.SetStateAction<SubstitutionResultParameters | undefined>) => void;
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
                        <DroppableSubstitutionEquation equation={system[0]} isValidDropLocation={isValidDropLocation} isTip={false} />}
                    {dragSource === null || dragSource === FlexibilityDragSource.SecondLeft || dragSource === FlexibilityDragSource.SecondRight ?
                        <DraggableSubstitutionEquation equation={system[1]} isFirstEquation={false} /> :
                        <DroppableSubstitutionEquation equation={system[1]} isValidDropLocation={isValidDropLocation} isTip={false} />}
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
        switch (active.data.current.source) {
            case FlexibilityDragSource.FirstLeft: {
                substitutionItems = system[0].leftTerms;
                isFirstEquation = false;
                break;
            }
            case FlexibilityDragSource.FirstRight: {
                substitutionItems = system[0].rightTerms;
                isFirstEquation = false;
                break;
            }
            case FlexibilityDragSource.SecondLeft: {
                substitutionItems = system[1].leftTerms;
                break;
            }
            case FlexibilityDragSource.SecondRight: {
                substitutionItems = system[1].rightTerms;
                break;
            }
        }

        if (over === null) {
            return;
        }

        const substitutionInfo: SubstitutionResultParameters = {
            isValid: over.data.current.valid,
            substitutionItems: substitutionItems,
            isFirstEquation: isFirstEquation,
            isLeft: over.data.current.target === FlexibilityDragTarget.Left,
            index: over.data.current.index,
            variable: over.data.current.variable,
            replaceAll: false,
            error: over.data.current.error
        } as SubstitutionResultParameters;

        setSubstitutionParams(substitutionInfo);
    }

    function isValidDropLocation(_: boolean, dropVariable?: string): [boolean, SubstitutionError] {
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
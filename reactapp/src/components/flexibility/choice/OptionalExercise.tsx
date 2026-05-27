import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { ReactElement } from "react";
import { Intervention } from "@components/flexibility/interventions/Intervention.tsx";

export function OptionalExercise({ loadNextStep, question, agentType, additionalMessage, trackChoice }: {
    loadNextStep: (choice: boolean) => void;
    question?: string;
    agentType?: AgentType;
    additionalMessage?: string;
    trackChoice: (choice: string) => void;
}): ReactElement {
    return <Intervention
        handleYes={() => {
            loadNextStep(true);
            trackChoice("Yes");
        }}
        handleNo={() => {
            loadNextStep(false);
            trackChoice("No");
        }}
        agentType={agentType} agentExpression={AgentExpression.Smiling} additionalMessage={additionalMessage}
    >
        <p>{question}</p>
    </Intervention>;
}
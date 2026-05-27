import { ReactElement } from "react";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";

// Pedagogical agent images are hidden — component kept for future use
export function Agent({ type: _type, expression: _expression }: { type: AgentType; expression: AgentExpression }): ReactElement {
    return <></>;
}


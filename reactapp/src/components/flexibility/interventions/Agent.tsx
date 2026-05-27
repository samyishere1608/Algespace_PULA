import { ReactElement } from "react";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";

// Pedagogical agent images are hidden — component kept for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Agent({ type, expression }: { type: AgentType; expression: AgentExpression }): ReactElement {
    return <></>;
}


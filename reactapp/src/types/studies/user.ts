import { StudyType } from "@/types/studies/enums.ts";
import { AgentCondition } from "@/types/flexibility/enums.ts";

export interface IUser {
    readonly id: number;
    readonly username: string;
    readonly studyType: StudyType;
    readonly studyId: number;
    readonly agentCondition?: AgentCondition;
    readonly expirationDate?: string;
    readonly token: string;
}

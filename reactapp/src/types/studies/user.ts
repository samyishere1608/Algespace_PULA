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

/**
 * The parts of an identity the exercise tracker records under.
 *
 * Deliberately narrower than `IUser`. A student session has no study type and no agent condition,
 * and the tracker reads only these three fields — saying exactly that lets a study login and a
 * student login both satisfy it honestly, without casting one into the other's shape.
 */
export type TrackerUser = Pick<IUser, "id" | "username" | "token">;

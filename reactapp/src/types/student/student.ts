export interface IStudent {
    readonly id: number;
    readonly username: string;
    readonly token: string;
    /**
     * "treatment" or "control" — see `isControlStudent` in `@utils/studyCondition.ts`.
     *
     * Optional because a session saved before the study arm existed has no such field, and a session
     * without it must read as treatment rather than break the type.
     */
    readonly condition?: string;
}

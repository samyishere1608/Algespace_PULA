export class GameError extends Error {
    constructor(public readonly type: GameErrorType) {
        super();
    }
}

export enum GameErrorType {
    GAME_LOGIC_ERROR,
    EXERCISE_ERROR,
    STUDY_ID_ERROR,
    AUTH_ERROR
}

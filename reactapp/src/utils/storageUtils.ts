import { AgentType, CompletedDemo } from "@/types/flexibility/enums.ts";

export type OnboardingStep = "bartering" | "equalization" | "elimination" | "complete";

export function getOnboardingStep(studentId: number): OnboardingStep | null {
    return localStorage.getItem(`onboarding-step-${studentId}`) as OnboardingStep | null;
}

export function setOnboardingStep(studentId: number, step: OnboardingStep): void {
    localStorage.setItem(`onboarding-step-${studentId}`, step);
}

function setExerciseCompleted(storageKey: string, propertyKey: string, exerciseId: number | string, isSession: boolean = false): void {
    const jsonString: string | null = isSession ? sessionStorage.getItem(storageKey) : localStorage.getItem(storageKey);

    if (jsonString === null) {
        const jsonObject: { [key: string]: (number | string)[] } = {};
        jsonObject[propertyKey] = [exerciseId];
        isSession ? sessionStorage.setItem(storageKey, JSON.stringify(jsonObject)) : localStorage.setItem(storageKey, JSON.stringify(jsonObject));
    } else {
        const jsonObject = JSON.parse(jsonString);

        if (jsonObject[propertyKey] === undefined || jsonObject[propertyKey] === null) {
            jsonObject[propertyKey] = [exerciseId];
        } else {
            const index: number = jsonObject[propertyKey].findIndex((entry: number): boolean => entry === exerciseId);
            if (index !== -1) {
                return;
            }
            jsonObject[propertyKey].push(exerciseId);
        }

        isSession ? sessionStorage.setItem(storageKey, JSON.stringify(jsonObject)) : localStorage.setItem(storageKey, JSON.stringify(jsonObject));
    }
}

export function setCKTutorialCompleted(storageKey: string, propertyKey: string = "conceptual-knowledge") {
    setExerciseCompleted(storageKey, propertyKey, "tutorial");
}

export function setCKStudyTutorialCompleted(studyId: number | string, propertyKey: string) {
    setExerciseCompleted(`ck-study-${studyId}`, propertyKey, "tutorial", true);
}

export function setCKExerciseCompleted(exerciseId: number | string, storageKey: string, propertyKey: string = "conceptual-knowledge"): void {
    setExerciseCompleted(storageKey, propertyKey, exerciseId);
}

export function setCKStudyExerciseCompleted(studyId: number | string, propertyKey: string, exerciseId: number | string): void {
    setExerciseCompleted(`ck-study-${studyId}`, propertyKey, exerciseId, true);
}

export function setPKExerciseCompleted(exerciseId: number | string, storageKey: string): void {
    setExerciseCompleted(storageKey, "procedural-knowledge", exerciseId);
}

export function setFlexibilityStudyExerciseCompleted(studyId: number | string, exerciseId: number | string): void {
    setExerciseCompleted(`flexibility-study-${studyId}`, "procedural-knowledge", exerciseId, true);
}

export function setFlexibilityStudyDemosCompleted(studyId: number | string, demo: CompletedDemo): void {
    setExerciseCompleted(`flexibility-study-${studyId}`, "demo", demo, true);
}

export function setFlexibilityStudyStudyCompleted(studyId: number | string, study: number | string): void {
    setExerciseCompleted(`flexibility-study-${studyId}`, "study", study, true);
}

export function getCompletedExercises(storageKey: string, propertyKey: string, isSession: boolean = false): (number | string)[] | undefined {
    const jsonString: string | null = isSession ? sessionStorage.getItem(storageKey) : localStorage.getItem(storageKey);
    if (jsonString !== null) {
        const jsonObj = JSON.parse(jsonString);

        if (jsonObj[propertyKey] !== undefined) {
            return jsonObj[propertyKey] as (number | string)[];
        }
    }
    return undefined;
}

export function getCompletedCKExercises(storageKey: string, propertyKey: string = "conceptual-knowledge"): (number | string)[] | undefined {
    return getCompletedExercises(storageKey, propertyKey);
}

export function getCompletedPKExercises(storageKey: string): (number | string)[] | undefined {
    return getCompletedExercises(storageKey, "procedural-knowledge");
}

export function getCompletedFlexibilityStudyExercises(studyId: number | string): (number | string)[] | undefined {
    return getCompletedExercises(`flexibility-study-${studyId}`, "procedural-knowledge", true);
}

export function getCompletedFlexibilityStudyDemos(studyId: number | string): CompletedDemo[] | undefined {
    return getCompletedExercises(`flexibility-study-${studyId}`, "demo", true) as (CompletedDemo[] | undefined);
}

export function getCompletedFlexibilityStudyStudy(studyId: number | string): (number | string)[] | undefined {
    return getCompletedExercises(`flexibility-study-${studyId}`, "study", true);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getExercises(jsonObject: any, propertyKey: string): (number | string)[] | undefined {
    if (jsonObject[propertyKey] !== undefined) {
        return jsonObject[propertyKey] as (number | string)[];
    }
    return undefined;
}

export function setCollapsibleState(storageKey: string, propertyKey: string, open: boolean): void {
    const jsonString: string | null = localStorage.getItem(storageKey);

    const jsonObject: {
        [key: string]: (number | string)[] | boolean;
    } = jsonString === null ? {} : JSON.parse(jsonString);

    jsonObject[propertyKey] = open;
    localStorage.setItem(storageKey, JSON.stringify(jsonObject));
}

export function getCollapsibleState(storageKey: string, propertyKey: string, initialState: boolean): boolean {
    const jsonString: string | null = localStorage.getItem(storageKey);

    if (jsonString !== null) {
        const jsonObj = JSON.parse(jsonString);
        if (jsonObj[propertyKey] !== undefined) {
            return jsonObj[propertyKey] as boolean;
        }
    }

    return initialState;
}

export function setCKStudyCollapsibleState(propertyKey: string, open: boolean): void {
    sessionStorage.setItem(`${propertyKey}-collapsible`, open.toString());
}

export function getCKStudyCollapsibleState(propertyKey: string, initialState: boolean): boolean {
    const jsonString: string | null = sessionStorage.getItem(`${propertyKey}-collapsible`);
    if (jsonString !== null) {
        return JSON.parse(jsonString) as boolean;
    }

    return initialState;
}

export function getRandomAgent(storage: Storage): AgentType {
    const jsonString: string | null = storage.getItem("pedagogicalAgents");

    let agentArray: number[];
    let random: number;
    if (jsonString === null) {
        agentArray = [0, 1, 2, 3, 4, 5, 6, 7];
        random = Math.floor(Math.random() * 8);
        agentArray.splice(random, 1);
    } else {
        agentArray = JSON.parse(jsonString) as number[];
        const index: number = Math.floor(Math.random() * agentArray.length);
        random = agentArray[index];
        agentArray.splice(index, 1);
        if (agentArray.length === 0) {
            agentArray = [0, 1, 2, 3, 4, 5, 6, 7];
        }
    }
    storage.setItem("pedagogicalAgents", JSON.stringify(agentArray));
    return random as AgentType;
}
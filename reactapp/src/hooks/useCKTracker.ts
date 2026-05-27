import { useEffect, useRef, useState } from "react";
import axiosInstance from "@/types/shared/axiosInstance.ts";
import { CKExerciseType, EliminationChoice, EqualizationPhase, SubstitutionPhase } from "@/types/studies/enums.ts";
import { IUser } from "@/types/studies/user.ts";
import { getTime } from "@utils/utils.ts";

export default function useCKTracker(useLogger: boolean, user: IUser, exerciseType: CKExerciseType, studyId: number, exerciseId: number, currentTime: number) {
    const exerciseStartTime = useRef<number>(currentTime);

    const [entryId, setEntryId] = useState<number>();

    const [hints, setHints] = useState<number>(0);
    const [errors, setErrors] = useState<number>(0);

    const [phase, setPhase] = useState<EqualizationPhase | SubstitutionPhase>(exerciseType === CKExerciseType.Equalization ? EqualizationPhase.Equalization : SubstitutionPhase.FirstSelection);
    const [startTimeInPhase, setStartTimeInPhase] = useState<number>(performance.now());
    const [hintsInPhase, setHintsInPhase] = useState<number>(0);
    const [errorsInPhase, setErrorsInPhase] = useState<number>(0);

    useEffect(() => {
        const fetchRowId = async (userId: number) => {
            try {
                const response = await axiosInstance.put(
                    "/ck-study/createEntry",
                    { exerciseType, userId, studyId, exerciseId },
                    {
                        headers: {
                            Authorization: "Bearer " + user.token
                        }
                    }
                );
                setEntryId(response.data);
            } catch (error) {
                console.error(error);
                throw new Error("Server initialization for tracking failed: " + error);
            }
        };

        if (useLogger) {
            fetchRowId(user.id);
        }
    }, [useLogger, user, studyId, exerciseId, exerciseType]);

    function trackAction(action: string): void {
        if (useLogger) {
            const data = { exerciseType, id: entryId, action };
            sendData(data);
        }
    }

    function trackActionInPhase(action: string): void {
        if (useLogger) {
            let data;
            if (exerciseType === CKExerciseType.Equalization) {
                data = { exerciseType, id: entryId, action, equalizationPhase: phase };
            } else {
                data = { exerciseType, id: entryId, action, substitutionPhase: phase };
            }
            sendData(data);
        }
    }

    function trackHint(): void {
        if (useLogger) {
            setHints((previousHints: number) => previousHints + 1);
            trackAction("HINT");
        }
    }

    function trackHintInPhase(): void {
        if (useLogger) {
            setHints((previousHints: number) => previousHints + 1);
            setHintsInPhase((previousHints: number) => previousHints + 1);
            trackActionInPhase("HINT");
        }
    }

    function trackError(): void {
        if (useLogger) {
            setErrors((previousErrors: number) => previousErrors + 1);
        }
    }

    function trackErrorInPhase(): void {
        if (useLogger) {
            setErrors((previousErrors: number) => previousErrors + 1);
            setErrorsInPhase((previousErrors: number) => previousErrors + 1);
        }
    }

    function setNextTrackingPhase(newPhase: EqualizationPhase | SubstitutionPhase): void {
        if (useLogger) {
            endTrackingPhase();
            setPhase(newPhase);
            setStartTimeInPhase(performance.now());
            setHintsInPhase(0);
            setErrorsInPhase(0);
        }
    }

    function endTrackingPhase(): void {
        if (useLogger) {
            const time: number = getTime(startTimeInPhase);

            let data;
            if (exerciseType === CKExerciseType.Equalization) {
                data = {
                    exerciseType,
                    id: entryId,
                    time,
                    hints: hintsInPhase,
                    errors: errorsInPhase,
                    equalizationPhase: phase
                };
            } else {
                data = {
                    exerciseType,
                    id: entryId,
                    time,
                    hints: hintsInPhase,
                    errors: errorsInPhase,
                    substitutionPhase: phase
                };
            }
            sendDataOnPhaseEnd(data);
        }
    }

    function endTracking(): void {
        if (useLogger) {
            sendDataOnEnd();
        }
    }

    function trackChoice(choice: EliminationChoice): void {
        if (useLogger) {
            sendChoiceData(choice);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function sendData(data: any): Promise<void> {
        try {
            await axiosInstance.post(`/ck-study/addActionToEntry`, data, {
                headers: {
                    Authorization: "Bearer " + user.token
                }
            });
        } catch (error) {
            console.error(error);
            throw new Error("Sending tracked action data failed: " + error);
        }
    }

    async function sendDataOnEnd(): Promise<void> {
        const time: number = getTime(exerciseStartTime.current);
        try {
            await axiosInstance.post(
                `/ck-study/completeTracking`,
                {
                    exerciseType,
                    id: entryId,
                    time,
                    hints,
                    errors
                },
                {
                    headers: {
                        Authorization: "Bearer " + user.token
                    }
                }
            );
        } catch (error) {
            console.error(error);
            throw new Error("Sending final tracking data failed: " + error);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function sendDataOnPhaseEnd(data: any): Promise<void> {
        try {
            await axiosInstance.post(`/ck-study/completePhaseTracking`, data, {
                headers: {
                    Authorization: "Bearer " + user.token
                }
            });
        } catch (error) {
            console.error(error);
            throw new Error("Sending tracking data on phase end failed: " + error);
        }
    }

    async function sendChoiceData(choice: EliminationChoice): Promise<void> {
        try {
            await axiosInstance.post(
                `/ck-study/trackEliminationChoice`,
                {
                    id: entryId,
                    choice
                },
                {
                    headers: {
                        Authorization: "Bearer " + user.token
                    }
                }
            );
        } catch (error) {
            console.error(error);
            throw new Error("Sending choice data for elimination failed: " + error);
        }
    }

    return {
        trackAction,
        trackActionInPhase,
        trackHint,
        trackHintInPhase,
        trackError,
        trackErrorInPhase,
        setNextTrackingPhase,
        endTrackingPhase,
        endTracking,
        trackChoice
    };
}

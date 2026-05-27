import {IUser} from "@/types/studies/user.ts";
import {
    FlexibilityExerciseActionPhase,
    FlexibilityExerciseChoicePhase,
    FlexibilityExercisePhase,
    FlexibilityStudyExerciseType
} from "@/types/studies/enums.ts";
import {useEffect, useRef, useState} from "react";
import axiosInstance from "@/types/shared/axiosInstance.ts";
import {AgentCondition, AgentType, Method} from "@/types/flexibility/enums.ts";
import {getTime} from "@utils/utils.ts";
import { incrementExerciseErrorCount, incrementExerciseHintCount } from "@utils/goalUtils.ts";

export default function useFlexibilityTracker(useLogger: boolean, user: IUser, studyId: number, flexibilityId: number, exerciseId: number, exerciseType: FlexibilityStudyExerciseType, currentTime: number, agentCondition: AgentCondition, agentType?: AgentType, initialPhase?: FlexibilityExercisePhase) {
    const exerciseStartTime = useRef<number>(currentTime);

    const [entryId, setEntryId] = useState<number>();

    const [errors, setErrors] = useState<number>(0);
    const [hints, setHints] = useState<number>(0);

    const [phase, setPhase] = useState<FlexibilityExercisePhase>(initialPhase ?? FlexibilityExercisePhase.Transformation);
    const [startTimeInPhase, setStartTimeInPhase] = useState<number>(0);
    const [errorsInPhase, setErrorsInPhase] = useState<number>(0);
    const [hintsInPhase, setHintsInPhase] = useState<number>(0);



    useEffect(() => {
        const fetchRowId = async (userId: number, username: string) => {
            try {
                const response = await axiosInstance.put(
                    "/flexibility-study/createEntry",
                    { userId, username, studyId, flexibilityId, exerciseId, exerciseType, agentCondition, agentType },
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
            fetchRowId(user.id, user.username);
        }
    }, [useLogger, user, studyId, flexibilityId, exerciseId, exerciseType, agentCondition, agentType]);

    function initializeTrackingPhase(phase: FlexibilityExercisePhase): void {
        if (useLogger) {
            setPhase(phase);
            setStartTimeInPhase(performance.now());
            setErrorsInPhase(0);
            setHintsInPhase(0);
        }
    }

    function trackActionInPhase(action: string, phase: FlexibilityExerciseActionPhase): void {
        if (useLogger) {
            const data = { userId: user.id, username: user.username, studyId, id: entryId, phase, action };
            sendData(data);
        }
    }

    function trackType(type: number, phase: FlexibilityExerciseChoicePhase): void {
        if (useLogger) {
            const data = { userId: user.id, username: user.username, studyId, id: entryId, phase, type };
            sendData(data, "trackType");
        }
    }

    function trackChoice(choice: string, phase: FlexibilityExerciseChoicePhase): void {
        if (useLogger) {
            const data = { userId: user.id, username: user.username, studyId, id: entryId, phase, choice };
            sendData(data, "trackChoice");
        }
    }

    function trackErrorInPhase(): void {
        incrementExerciseErrorCount(); // always track for goal system
        if (useLogger) {
            setErrors((pErrors: number) => pErrors + 1);
            setErrorsInPhase((previousErrors: number) => previousErrors + 1);
        }
    }

    function trackHintsInPhase(): void {
        incrementExerciseHintCount(); // always track for goal system
        if (useLogger) {
            setHints((previousHints: number) => previousHints + 1);
            setHintsInPhase((previousHints: number) => previousHints + 1);
        }
    }

    type InterventionDecision = {
        trigger: boolean;
        messageType: number;
    };

    async function decideExplainIntervention(methode: Method): Promise<InterventionDecision> {
        if (!useLogger) return { trigger: false, messageType: 0 };

        let results1;
        let results2;
        let time;
        try {

            results1 = await fetchErrorSets("SystemSelection", 1, false, 0);
            results2 = await fetchErrorSets("EfficiencySelection", 1, false, 0);

            //console.log("SystemSelection + EfficiencySelection");
           // console.log("Error");
            //console.log(results1.errors, results2.errors);

           // console.log("Hints");
           // console.log(results1.hints, results2.hints);

            //console.log("Time");
            //console.log(results1.time, results2.time);



            if (results1.errors >= 1 || results2.errors >= 1 || results1.hints >= 1 || results2.hints >= 1 || results1.time > 700.00 || results2.time > 700.00) {
                const trigger = true;
                const messageType = 1;
                return {trigger, messageType};
            }


            switch (methode) {
                case Method.Elimination:
                    time = 36;
                    results1 = await fetchErrorSets("Elimination", 1, false, 0);
                    results2 = await fetchErrorSets("Transformation", 1, false, 0, "Elimination");
                    break;
                case Method.Equalization:
                    time = 10;
                    results1 = await fetchErrorSets("Equalization", 1, false, 0);
                    results2 = await fetchErrorSets("Transformation", 1, false, 0, "Equalization");
                    break;
                case Method.Substitution:
                    time = 18;
                    results1 = await fetchErrorSets("Substitution", 1, false, 0);
                    results2 = await fetchErrorSets("Transformation", 1, false, 0, "Equalization");
                    break;
                default:
                    throw new Error("Invalid methode");

            }

            //console.log("Methode + Transformation")
            //console.log("Error");
            //console.log(results1.errors, results2.errors);

            // console.log("Hints");
            //console.log(results1.hints, results2.hints);

           // console.log("Time");
          //  console.log(results1.time, results2.time);

            if (results1.errors >= 1  || results1.hints >= 1 || results1.time > time) {
                const trigger = true;
                const messageType = 2;
                return {trigger, messageType};
            }
            else if(results2.errors >= 1  || results2.hints >= 1 || results2.time > 22.00){
                const trigger = true;
                const messageType = 3;
                return {trigger, messageType};

            }

            const previousEng = await fetchPreviousEngagement("SelfExplanation", true, 0);



            if (!previousEng) {
                const trigger = true;
                const messageType = 5;
                return {trigger, messageType};
            }
            else{
                const trigger = false;
                const messageType = 4;
                return {trigger, messageType};
            }





        } catch (error) {
            console.error("Decision logic failed:", error);
            throw new Error("Failed to fetch previous errors");
        }
    }



    async function decideResolvingIntervention(methode: Method): Promise<InterventionDecision> {
        if (!useLogger) return { trigger: false, messageType: 0 };

        try {

            let time: number;
            let results1;
            let results2;

            switch (methode) {
                case Method.Elimination:
                    time = 36;
                    results1 = await fetchErrorSets("Elimination", 1, false, 0);
                    results2 = await fetchErrorSets("EliminationResolve", 1, false, 0);
                    break;
                case Method.Equalization:
                    time = 10;
                    results1 = await fetchErrorSets("Equalization", 1, false, 0);
                    results2 = await fetchErrorSets("EqualizationResolve", 1, false, 0);
                    break;
                case Method.Substitution:
                    time = 18;
                    results1 = await fetchErrorSets("Substitution", 1, false, 0);
                    results2 = await fetchErrorSets("SubstitutionResolve", 1, false, 0);
                    break;
                default:
                    throw new Error("Invalid methode");

            }

            const methods = await fetchMethodeUse(true, methode, 4);



            if (results1.errors >= 1 || results2.errors >= 1 || results1.hints >= 1 || results2.hints >= 1) {
                const trigger = true;
                const messageType = 2;
                return { trigger, messageType };
            }
            else if(results1.time >= time || results2.time >= time){
                const trigger = true;
                const messageType = 3;
                return { trigger, messageType };
            }
            else if(methods){
                const trigger = true;
                const messageType = 1;
                return { trigger, messageType };
            }
            else {
                return { trigger: false, messageType: 4 };
            }
        } catch (error) {
            console.error("Decision logic failed:", error);
            throw new Error("Failed to fetch previous errors");
        }
    }

    async function decideComparisonIntervention(): Promise<InterventionDecision> {
        if (!useLogger) return { trigger: false, messageType: 0 };

        try {

            const previousEng = await fetchPreviousEngagement("Comparison", true, 1);

            const progress = await fetchProgress();

            const methods = await fetchMethodeUse(false, 0, 0);


            if (!previousEng) {
                const trigger = true;
                const messageType = 3;
                return { trigger, messageType };
            }
            else if(progress <= 5){
                const trigger = true;
                const messageType = 2;
                return { trigger, messageType };
            }
            else if(methods){
                const trigger = true;
                const messageType = 1;
                return { trigger, messageType };
            }
            else {
                return { trigger: false, messageType: 4 };
            }
        } catch (error) {
            console.error("Decision logic failed:", error);
            throw new Error("Failed to fetch previous errors");
        }
    }

    async function decideCalculationIntervention(): Promise<InterventionDecision> {
        if (!useLogger) return { trigger: false, messageType: 0 };

        try {
            const previousErrors_1 = await fetchPreviousErrors(false, "FirstSolution", 1, true, 3);
            const previousErrors_2 = await fetchPreviousErrors(false, "SecondSolution", 1, true, 4);

            const previousHints_1 = await fetchPreviousHints(false, "FirstSolution", 1, true, 3);
            const previousHints_2 = await fetchPreviousHints(false, "SecondSolution", 1, true, 4);

            const previousTime_1 = await fetchPreviousTimes(false, "FirstSolution", 1, true, 3);
            const previousTime_2 = await fetchPreviousTimes(false, "SecondSolution", 1, true, 4);

            const previousEng_1 = await fetchPreviousEngagement("FirstSolution", true, 3);
            const previousEng_2 = await fetchPreviousEngagement("SecondSolution", true, 4);



            if (previousErrors_1 >= 1 || previousErrors_2 >= 1 || previousHints_1 >= 1 || previousHints_2 >= 1) {
                const trigger = true;
                const messageType = 1;
                return { trigger, messageType };

            }
            else if(previousTime_1 > 55.00 || previousTime_2 > 55.00){
                const trigger = true;
                const messageType = 2;
                return { trigger, messageType };

            }
            else if (!previousEng_1 && !previousEng_2) {
                const trigger = true;
                const messageType = 3;
                return { trigger, messageType };
            }
            else {
                return { trigger: false, messageType: 4 };
            }
        } catch (error) {
            console.error("Decision logic failed:", error);
            throw new Error("Failed to fetch previous errors");
        }
    }



    function setNextTrackingPhase(newPhase: FlexibilityExercisePhase, choice?: string): void {
        if (useLogger) {
            endTrackingPhase(choice);
            setPhase(newPhase);
            setStartTimeInPhase(performance.now());
            setErrorsInPhase(0);
            setHintsInPhase(0);
        }
    }

    function endTrackingPhase(choice?: string): void {
        if (useLogger) {
            const time: number = getTime(startTimeInPhase);

            let data;
            if (phase === FlexibilityExercisePhase.Comparison || phase === FlexibilityExercisePhase.ResolveConclusion) {
                data = { userId: user.id, username: user.username, studyId, id: entryId, time, errors: 0, hints: hintsInPhase, phase, choice };
            }
            else {
                data = { userId: user.id, username: user.username, studyId, id: entryId, time, errors: errorsInPhase, hints: hintsInPhase, phase };
            }
            sendDataOnPhaseEnd(data);
        }
    }

    function endTracking(): void {
        if (useLogger) {
            sendDataOnEnd();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function sendData(data: any, route: string = "addActionToEntry"): Promise<void> {
        try {
            await axiosInstance.post(`/flexibility-study/${route}`, data, {
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
            await axiosInstance.post(`/flexibility-study/completeTracking`,
                { userId: user.id, username: user.username, studyId, id: entryId, time, errors, hints},
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
            await axiosInstance.post(`/flexibility-study/completePhaseTracking`, data, {
                headers: {
                    Authorization: "Bearer " + user.token
                }
            });
        } catch (error) {
            console.error(error);
            throw new Error("Sending tracking data on phase end failed: " + error);
        }
    }

    async function fetchPreviousErrors(total: boolean, exercice: string, limit: number, optional: boolean, op_int: number, methode?: string): Promise<number> {
        try {
            const response = await axiosInstance.get(
                `/flexibility-study/getLastErrors/${user.id}/${user.username}/${studyId}`,
                {
                    params: {
                        total,
                        exercice,
                        limit,
                        optional,
                        op_int,
                        methode
                    },
                    headers: {
                        Authorization: "Bearer " + user.token
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error("Failed to fetch previous errors", error);
            throw new Error("Failed to fetch previous errors");
        }
    }

    async function fetchPreviousHints(total: boolean, exercice: string, limit: number, optional: boolean, op_int: number, methode?: string): Promise<number> {
        try {
            const response = await axiosInstance.get(
                `/flexibility-study/getLastHints/${user.id}/${user.username}/${studyId}`,
                {
                    params: {
                        total,
                        exercice,
                        limit,
                        optional,
                        op_int,
                        methode
                    },
                    headers: {
                        Authorization: "Bearer " + user.token
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error("Failed to fetch previous errors", error);
            throw new Error("Failed to fetch previous errors");
        }
    }

    async function fetchPreviousTimes(total: boolean, exercice: string, limit: number, optional: boolean, op_int: number, methode?: string): Promise<number> {
        try {
            const response = await axiosInstance.get(
                `/flexibility-study/getLastTimes/${user.id}/${user.username}/${studyId}`,
                {
                    params: {
                        total,
                        exercice,
                        limit,
                        optional,
                        op_int,
                        methode
                    },
                    headers: {
                        Authorization: "Bearer " + user.token
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error("Failed to fetch previous errors", error);
            throw new Error("Failed to fetch previous errors");
        }
    }

    async function fetchPreviousEngagement(exercice: string, optional: boolean, op_int: number): Promise<boolean> {
        try {
            const response = await axiosInstance.get(
                `/flexibility-study/getEngagement/${user.id}/${user.username}/${studyId}`,
                {
                    params: {
                        exercice,
                        optional,
                        op_int
                    },
                    headers: {
                        Authorization: "Bearer " + user.token
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error("Failed to fetch previous errors", error);
            throw new Error("Failed to fetch previous errors");
        }
    }

    async function fetchProgress(): Promise<number> {
        try {
            const response = await axiosInstance.get(
                `/flexibility-study/getProgress/${user.id}/${user.username}/${studyId}`,
                {
                    headers: {
                        Authorization: "Bearer " + user.token
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error("Failed to fetch previous errors", error);
            throw new Error("Failed to fetch previous errors");
        }
    }



    async function fetchMethodeUse(compare: boolean, methode1: number, methode2: number): Promise<boolean> {
        try {
            const response = await axiosInstance.get(
                `/flexibility-study/getMethodeUse/${user.id}/${user.username}/${studyId}`,
                {
                    params: {
                        compare,
                        methode1,
                        methode2
                    },
                    headers: {
                        Authorization: "Bearer " + user.token
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error("Failed to fetch previous errors", error);
            throw new Error("Failed to fetch previous errors");
        }
    }

    async function fetchErrorSets(
        field1: string,
        limit: number,
        optional: boolean,
        op_int: number,
        method?: string

    ): Promise<{
        errors: number;
        hints: number;
        time: number;
    }> {
        const [errors, hints, time] = await Promise.all([
            fetchPreviousErrors(false, field1, limit, optional, op_int, method),
            fetchPreviousHints(false, field1, limit, optional, op_int, method),
            fetchPreviousTimes(false, field1, limit, optional, op_int, method),
        ]);

        return {errors, hints, time};
    }








    return {
        initializeTrackingPhase,
        trackActionInPhase,
        decideCalculationIntervention,
        decideComparisonIntervention,
        decideResolvingIntervention,
        trackChoice,
        trackErrorInPhase,
        trackHintsInPhase,
        setNextTrackingPhase,
        endTrackingPhase,
        endTracking,
        decideExplainIntervention,
        trackType
    };}
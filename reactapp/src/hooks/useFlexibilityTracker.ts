import type {TrackerUser} from "@/types/studies/user.ts";
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
import { incrementExerciseErrorCount, incrementExerciseHintCount, recordExerciseDecision } from "@utils/progressUtils.ts";
import { useNudge } from "@/contexts/nudgeContext.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { decisionOutcome, declinedElement, engagedElement } from "@utils/anchorDecisions.ts";
import { nudgeBenefitKey, nudgeNameFor, type NudgeResponse } from "@utils/nudges.ts";
import { awardInsightForFacingGap } from "@utils/insightAwards.ts";

/**
 * Destination for the study module. Our own store lives at "/anchor-tracking".
 * The routes and payloads are identical, so only the base differs.
 */
export const STUDY_TRACKING_BASE = "/flexibility-study";
export const ANCHOR_TRACKING_BASE = "/anchor-tracking";

export default function useFlexibilityTracker(logging: boolean, passedUser: TrackerUser | undefined, studyId: number, flexibilityId: number, exerciseId: number, exerciseType: FlexibilityStudyExerciseType, currentTime: number, agentCondition: AgentCondition, agentType?: AgentType, trackingBase: string = STUDY_TRACKING_BASE, initialPhase?: FlexibilityExercisePhase) {
    const exerciseStartTime = useRef<number>(currentTime);

    const { student } = useAuth();

    /**
     * The identity this attempt is recorded under, from whichever login was used.
     *
     * A study participant arrives with `passedUser` set (from /studies/login); a student arrives
     * with only `student` set (from /student/login). Resolving them here, once, is what makes every
     * write below work for both — see `useTrackerIdentity` for why this mattered.
     */
    const user = passedUser ?? student;

    /**
     * Whether this exercise gets written down.
     *
     * Two things have to be true: the caller has to want it logged, and there has to be somebody to
     * log it as. Callers pass `logging` from `useTrackerIdentity`, which only reports true when an
     * owner exists, so the second half never actually fails in practice — it is here so the rest of
     * the hook can treat `user` as present, which is what every `user.id` / `user.token` below
     * assumes.
     */
    const useLogger = logging && user !== undefined;

    // Two attempts can exist for the same exercise: one in our store, one in the study's. They are
    // separate databases, so every write has to name the attempt the destination it is going to
    // actually knows about.
    const [ourEntryId, setOurEntryId] = useState<number>();
    const [studyEntryId, setStudyEntryId] = useState<number>();

    /**
     * A study run writes to two places. Everything else writes to one.
     *
     * This ADDS a destination; it does not redirect anything. The study's tables must keep receiving
     * exactly what they received before, which is why the study call is left precisely as it was.
     * We also write to our own store because the avoidance profile, the goals and the nudge all read
     * from there, and none of them can see data that exists only in the study's tables.
     */
    const isStudy = trackingBase === STUDY_TRACKING_BASE;

    /** Every destination this write has to reach, each with the attempt id that destination knows. */
    function destinations(): { base: string; id: number }[] {
        const targets: { base: string; id: number }[] = [];
        if (ourEntryId !== undefined) targets.push({ base: ANCHOR_TRACKING_BASE, id: ourEntryId });
        if (studyEntryId !== undefined) targets.push({ base: STUDY_TRACKING_BASE, id: studyEntryId });
        return targets;
    }

    // The nudge is ours alone — the study module has no counterpart for it — so it is recorded
    // against our own attempt.
    const nudgeAvailable = useLogger && ourEntryId !== undefined;
    const offerNudge = useNudge();

    /**
     * Elements already paid for in this exercise.
     *
     * The two solution points both map to the same element, so a student who works both out would
     * otherwise be paid twice in one exercise for one act. A ref, not state: it resets when the
     * exercise unmounts, which is exactly the scope of "once per exercise".
     */
    const insightPaidFor = useRef<Set<string>>(new Set());

    const [errors, setErrors] = useState<number>(0);
    const [hints, setHints] = useState<number>(0);

    const [phase, setPhase] = useState<FlexibilityExercisePhase>(initialPhase ?? FlexibilityExercisePhase.Transformation);
    const [startTimeInPhase, setStartTimeInPhase] = useState<number>(0);
    const [errorsInPhase, setErrorsInPhase] = useState<number>(0);
    const [hintsInPhase, setHintsInPhase] = useState<number>(0);



    useEffect(() => {
        const fetchRowId = async (userId: number, username: string) => {
            if (user === undefined) return;
            const headers = { Authorization: "Bearer " + user.token };
            const payload = { userId, username, studyId, flexibilityId, exerciseId, exerciseType, agentCondition, agentType };

            // Ours first, and always. A study attempt is recorded here too, flagged as one, so the
            // profile and the goals have something to read while the study is running.
            try {
                const ours = await axiosInstance.put(
                    `${ANCHOR_TRACKING_BASE}/createEntry`,
                    { ...payload, isStudy },
                    { headers }
                );
                setOurEntryId(ours.data);
            } catch (error) {
                console.error(error);
                throw new Error("Server initialization for tracking failed: " + error);
            }

            if (!isStudy) return;

            // The study's own row, unchanged. A failure here is not fatal to the exercise: our copy
            // already exists, and the study's controller already reported the problem.
            try {
                const theirs = await axiosInstance.put(
                    `${STUDY_TRACKING_BASE}/createEntry`,
                    payload,
                    { headers }
                );
                setStudyEntryId(theirs.data);
            } catch (error) {
                console.error(error);
            }
        };

        if (useLogger) {
            fetchRowId(user.id, user.username);
        }
    }, [useLogger, user, studyId, flexibilityId, exerciseId, exerciseType, agentCondition, agentType, isStudy]);

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
            const data = { userId: user.id, username: user.username, studyId, phase, action };
            sendData(data);
        }
    }

    function trackType(type: number, phase: FlexibilityExerciseChoicePhase): void {
        if (useLogger) {
            const data = { userId: user.id, username: user.username, studyId, phase, type };
            sendData(data, "trackType");
        }
    }

    function trackChoice(choice: string, phase: FlexibilityExerciseChoicePhase): void {
        if (useLogger) {
            const data = { userId: user.id, username: user.username, studyId, phase, choice };
            sendData(data, "trackChoice");
        }

        // Every decision in every exercise funnels through here, which makes it the one place all
        // three reactions can live without touching any of the exercise components.
        considerInsight(choice, phase);

        // What they decided, kept for the reflection afterwards — which cannot otherwise tell
        // "this was easy" apart from "this was easy because I was shown the answer".
        const outcome = decisionOutcome(choice, phase);
        if (outcome !== null) {
            recordExerciseDecision(outcome.element, outcome.engaged ? "Engaged" : "Declined");
        }
    }

    /**
     * Offers the one nudge before a decline takes effect.
     *
     * Resolves true when the student takes the offer up, which means the caller should run the same
     * path as "Ja" — that is the point of the nudge, and merely carrying on would make it advice
     * rather than an offer.
     *
     * Recording is left to the caller's two paths. The "Ja" path writes the engagement over the
     * decline, and the anchor record is keyed on attempt and phase, so the two cannot both stand and
     * the profile ends up reflecting what the student actually did.
     */
    async function reconsiderDecline(phase: FlexibilityExerciseChoicePhase): Promise<boolean> {
        if (!nudgeAvailable) return false;

        const declined = declinedElement("No", phase);
        if (declined === null) return false;

        return offerNudge({
            element: declined.element,
            labelKey: declined.labelKey,
            benefitKey: nudgeBenefitKey(declined.element),
            agentType,
            record: (response: NudgeResponse) => recordNudge(declined.element, response),
        });
    }

    /**
     * Insight for facing something the profile says they avoid.
     *
     * Mirrors the nudge: the nudge reacts to the decline, this reacts to the engagement that follows
     * it — with or without a nudge, because a student who works it out unprompted has done the same
     * difficult thing. See `insightAwards.ts` for why it cannot be farmed.
     */
    function considerInsight(choice: string, phase: FlexibilityExerciseChoicePhase): void {
        if (!useLogger) return;

        const engaged = engagedElement(choice, phase);
        if (engaged === null) return;
        if (insightPaidFor.current.has(engaged.element)) return;

        // Claimed before the async lookup, so a second engagement in the same exercise cannot slip
        // through while the profile is still in flight.
        insightPaidFor.current.add(engaged.element);
        void awardInsightForFacingGap(user.id, engaged.element);
    }

    /**
     * Records how the student answered a nudge, straight into our own store.
     *
     * Deliberately not sent through `sendData`: the nudge is ours, not part of the study protocol,
     * so it must never land in the study's tables.
     */
    function recordNudge(element: string, response: NudgeResponse): void {
        if (!nudgeAvailable || ourEntryId === undefined) return;

        void axiosInstance.post(`${ANCHOR_TRACKING_BASE}/trackRecord`, {
            userId: user.id,
            username: user.username,
            studyId,
            id: ourEntryId,
            name: nudgeNameFor(element),
            choice: response,
        }, {
            headers: {
                Authorization: "Bearer " + user.token
            }
        }).catch(() => {
            // The student keeps their answer either way; only the research record is lost.
        });
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
                data = { userId: user.id, username: user.username, studyId, time, errors: 0, hints: hintsInPhase, phase, choice };
            }
            else {
                data = { userId: user.id, username: user.username, studyId, time, errors: errorsInPhase, hints: hintsInPhase, phase };
            }
            sendDataOnPhaseEnd(data);
        }
    }

    function endTracking(): void {
        if (useLogger) {
            sendDataOnEnd();
        }
    }

    /**
     * Posts the same body to every destination, substituting the attempt id each one knows.
     *
     * A study run has two destinations and practice has one, and the payload is otherwise identical
     * — which is exactly why the tracker can drive both without a fork, and why the request shapes
     * are kept mirrored.
     */
    async function postToAll(route: string, build: (id: number) => unknown): Promise<void> {
        if (user === undefined) return;
        const token = user.token;

        const targets = destinations();
        if (targets.length === 0) return;

        // allSettled, not all: a failure at one destination must not hide the outcome at the other,
        // and the exercise continues either way — the student is not made to care about our logging.
        const results = await Promise.allSettled(
            targets.map((target) =>
                axiosInstance.post(`${target.base}/${route}`, build(target.id), {
                    headers: {
                        Authorization: "Bearer " + token
                    }
                })
            )
        );

        results.forEach((result, index) => {
            if (result.status === "rejected") {
                console.error(`Tracking write to ${targets[index].base}/${route} failed`, result.reason);
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function sendData(data: any, route: string = "addActionToEntry"): Promise<void> {
        await postToAll(route, (id) => ({ ...data, id }));
    }

    async function sendDataOnEnd(): Promise<void> {
        const time: number = getTime(exerciseStartTime.current);
        if (user === undefined) return;
        const { id: ownerId, username: ownerName } = user;
        await postToAll("completeTracking", (id) =>
            ({ userId: ownerId, username: ownerName, studyId, id, time, errors, hints }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function sendDataOnPhaseEnd(data: any): Promise<void> {
        await postToAll("completePhaseTracking", (id) => ({ ...data, id }));
    }

    async function fetchPreviousErrors(total: boolean, exercice: string, limit: number, optional: boolean, op_int: number, methode?: string): Promise<number> {
        if (user === undefined) return 0;
        try {
            const response = await axiosInstance.get(
                `${trackingBase}/getLastErrors/${user.id}/${user.username}/${studyId}`,
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
        if (user === undefined) return 0;
        try {
            const response = await axiosInstance.get(
                `${trackingBase}/getLastHints/${user.id}/${user.username}/${studyId}`,
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
        if (user === undefined) return 0;
        try {
            const response = await axiosInstance.get(
                `${trackingBase}/getLastTimes/${user.id}/${user.username}/${studyId}`,
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
        if (user === undefined) return false;
        try {
            const response = await axiosInstance.get(
                `${trackingBase}/getEngagement/${user.id}/${user.username}/${studyId}`,
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
        if (user === undefined) return 0;
        try {
            const response = await axiosInstance.get(
                `${trackingBase}/getProgress/${user.id}/${user.username}/${studyId}`,
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
        if (user === undefined) return false;
        try {
            const response = await axiosInstance.get(
                `${trackingBase}/getMethodeUse/${user.id}/${user.username}/${studyId}`,
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
        reconsiderDecline,
        trackErrorInPhase,
        trackHintsInPhase,
        setNextTrackingPhase,
        endTrackingPhase,
        endTracking,
        decideExplainIntervention,
        trackType
    };}
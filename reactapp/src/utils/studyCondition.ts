import type { IStudent } from "@/types/student/student.ts";

/**
 * Which arm of the study a student is in, as the server assigned it.
 *
 * TREATMENT is the app as it has been: dashboard, goals, reflection, nudges, the companion. CONTROL is
 * the plain flexibility module — no dashboard, no nudges, no companion — with the exercise data recorded
 * exactly as it is for everyone else, because the exercise data is the measurement.
 *
 * The value comes from the sign-in response and is stored with the session. Every read that cannot find
 * it answers "treatment", which is the arm whose behaviour is the app everyone has been using — so a
 * session stored before this shipped can never quietly move a student into the arm that gets less.
 */
export const CONTROL_CONDITION = "control";

export function isControlStudent(student?: Pick<IStudent, "condition"> | undefined): boolean {
    return (student?.condition ?? "").trim().toLowerCase() === CONTROL_CONDITION;
}

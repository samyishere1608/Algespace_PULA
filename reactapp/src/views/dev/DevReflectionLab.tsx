import { ReactElement, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { ReflectionModal } from "@views/student/dashboard/ReflectionModal.tsx";
import type { ReflectionQueueItem } from "@utils/reflectionUtils.ts";
import "@styles/views/dev-lab.scss";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

interface ScenarioInfo {
    id: string;
    title: string;
    itemType: string;
    what: string;
}

/**
 * A tester's shortcut for the reflection.
 *
 * Checking a reflection means seeing it in states that only occur in particular attempts — a skipped
 * comparison, a tie between two exercises, a clean run, a goal with a hint limit — and producing those by
 * working through the exercises is slow and never quite the same twice. Each button here asks the server
 * to write the records for one of those situations and queue the reflection for it, then opens the real
 * dialog on top. Nothing about the dialog is a copy: it is the same component the dashboard mounts.
 *
 * The server refuses every one of these calls outside Development, so this page is inert anywhere else.
 */
export default function DevReflectionLab(): ReactElement {
    const { student } = useAuth();
    // The id the tester typed outlives a remount, which happens when the auth session arrives: keeping it
    // only in component state meant a scenario could be written against the signed-in student's records
    // instead of the throwaway id on screen.
    const [studentId, setStudentId] = useState<number>(() => {
        const saved = Number(sessionStorage.getItem("reflectionLabStudentId"));
        return saved > 0 ? saved : student?.id ?? 0;
    });
    const [edited, setEdited] = useState<boolean>(() => Number(sessionStorage.getItem("reflectionLabStudentId")) > 0);
    const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
    const [item, setItem] = useState<ReflectionQueueItem | null>(null);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!edited && student?.id) setStudentId(student.id);
    }, [student?.id, edited]);

    useEffect(() => {
        void (async () => {
            try {
                const { data } = await axios.get<ScenarioInfo[]>(`${BACKEND}/dev/reflection/scenarios`);
                setScenarios(data ?? []);
            } catch {
                setError("The lab is only available while the API runs in Development.");
            }
        })();
    }, []);

    async function run(id: string): Promise<void> {
        setBusy(id);
        setError("");
        try {
            const { data } = await axios.post<ReflectionQueueItem>(`${BACKEND}/dev/reflection/run`, {
                studentId,
                scenario: id,
            });
            setItem(data);
        } catch (e) {
            setItem(null);
            setError(axios.isAxiosError(e) ? String(e.response?.data ?? e.message) : "Seeding failed.");
        } finally {
            setBusy("");
        }
    }

    async function clear(): Promise<void> {
        setBusy("clear");
        try {
            await axios.post(`${BACKEND}/dev/reflection/clear`, { studentId });
            setItem(null);
            setError("");
        } catch {
            setError("Could not clear the seeded rows.");
        } finally {
            setBusy("");
        }
    }

    return (
        <div className="devlab">
            <header className="devlab__head">
                <h1>Reflection lab</h1>
                <p>
                    Writes the records a scenario needs and opens the real reflection dialog on them. Each run
                    clears the previous one, so the numbers you see belong only to this scenario.
                </p>
                <div className="devlab__controls">
                    <label>
                        Student id
                        <input
                            type="number"
                            value={studentId}
                            onChange={(event) => {
                                setEdited(true);
                                setStudentId(Number(event.target.value));
                                sessionStorage.setItem("reflectionLabStudentId", event.target.value);
                            }}
                        />
                    </label>
                    <button type="button" onClick={clear} disabled={busy !== ""}>
                        {busy === "clear" ? "Clearing..." : "Clear seeded data"}
                    </button>
                </div>
                {error && <p className="devlab__error">{error}</p>}
            </header>

            <ul className="devlab__list">
                {scenarios.map((scenario) => (
                    <li key={scenario.id} className="devlab__row">
                        <div>
                            <strong>{scenario.title}</strong>
                            <span className={`devlab__tag devlab__tag--${scenario.itemType}`}>{scenario.itemType}</span>
                            <p>{scenario.what}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => run(scenario.id)}
                            disabled={busy !== "" || studentId <= 0}
                        >
                            {busy === scenario.id ? "Seeding..." : "Run"}
                        </button>
                    </li>
                ))}
            </ul>

            {item && (
                <ReflectionModal
                    studentId={studentId}
                    items={[item]}
                    buddyName="Pippin"
                    buddyEmoji="🐣"
                    // Nothing is awarded: a seeded scenario is a look at the wording, not a play-through.
                    onAwardInsight={() => undefined}
                    onClose={() => setItem(null)}
                />
            )}
        </div>
    );
}

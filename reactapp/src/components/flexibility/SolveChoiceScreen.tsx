import { ReactElement } from "react";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { getActiveBuddyId } from "@utils/wardrobeUtils.ts";
import { BUDDIES } from "@views/student/dashboard/ChooseBuddyModal.tsx";

interface Props {
    onChoose: (mode: "solo" | "pippin") => void;
}

export function SolveChoiceScreen({ onChoose }: Props): ReactElement {
    const { student } = useAuth();
    const studentId = student?.id ?? "guest";
    const activeBuddyId = getActiveBuddyId(studentId);
    const buddy = BUDDIES.find((b) => b.id === activeBuddyId) ?? BUDDIES[0];
    const buddyName = buddy.name;

    return (
        <div className="solve-choice">
            <h2 className="solve-choice__title">How would you like to tackle this exercise?</h2>
            <p className="solve-choice__subtitle">Choose your approach before you start.</p>

            <div className="solve-choice__cards">
                {/* Solo card */}
                <button className="solve-choice__card solve-choice__card--solo" onClick={() => onChoose("solo")}>
                    <span className="solve-choice__icon">🏆</span>
                    <h3>Solve on my own</h3>
                    <p>Challenge yourself independently!</p>
                    <div className="solve-choice__bonus">
                        <span className="solve-choice__bonus-badge">🪙 2× coins</span>
                        <span className="solve-choice__bonus-note">Double coin reward if you complete without help</span>
                    </div>
                    <span className="solve-choice__cta solve-choice__cta--solo">Let's go solo!</span>
                </button>

                <div className="solve-choice__divider">or</div>

                {/* Pippin card */}
                <button className="solve-choice__card solve-choice__card--pippin" onClick={() => onChoose("pippin")}>
                    <span className="solve-choice__icon">🤝</span>
                    <h3>Ask {buddyName} for help</h3>
                    <p>Get hints and guidance as you go.</p>
                    <div className="solve-choice__bonus solve-choice__bonus--normal">
                        <span className="solve-choice__bonus-badge">🪙 1× coins</span>
                        <span className="solve-choice__bonus-note">Normal coin reward</span>
                    </div>
                    <span className="solve-choice__cta solve-choice__cta--pippin">Bring in {buddyName}</span>
                </button>
            </div>
        </div>
    );
}

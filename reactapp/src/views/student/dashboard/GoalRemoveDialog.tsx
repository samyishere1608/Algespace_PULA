import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb, faTimes, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { TranslationNamespaces } from "@/i18n.ts";

/**
 * Asked only when a goal is being deleted without a single step taken towards it.
 *
 * WHY THIS EXISTS. Deleting a goal takes back the Choice XP it paid, which is what stops goals being
 * added and deleted in a loop for points. But most deletions are not that: a student who has worked
 * on a goal and then decides to spend their time differently is making a strategic choice, and taking
 * their points for it would punish exactly the reflection the app is trying to teach. So the award is
 * only taken back from a goal that was never touched — and even then the student is offered the
 * alternative first, because "you have not started this" is worth one gentle sentence rather than a
 * silent penalty.
 *
 * The cost is stated plainly rather than hidden. A student who chooses to delete is told what it
 * costs and gets to decide; that is the same respect the rest of the app gives their choices.
 */
export function GoalRemoveDialog(
    { goalLabel, onKeep, onDelete }: { goalLabel: string; onKeep: () => void; onDelete: () => void }
): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);

    return (
        <div className={"dash-modal-backdrop"} onClick={onKeep}>
            <div className={"dash-modal goal-remove"} onClick={(e) => e.stopPropagation()} role={"dialog"} aria-modal={"true"}>
                <div className={"dash-modal__header"}>
                    <h3>{t("goal-remove-title")}</h3>
                    <button className={"dash-modal__close"} onClick={onKeep} aria-label={t("dashboard-modal-close")}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* The goal's own name, so the question is about THIS goal and not goals in general. */}
                <p className={"goal-remove__subject"}>{goalLabel}</p>
                <p className={"goal-remove__body"}>{t("goal-remove-body")}</p>

                <div className={"goal-remove__actions"}>
                    <button className={"button primary-button goal-remove__keep"} onClick={onKeep}>
                        <FontAwesomeIcon icon={faLightbulb} />
                        {t("goal-remove-keep")}
                    </button>
                    <button className={"button goal-remove__delete"} onClick={onDelete}>
                        <FontAwesomeIcon icon={faTrashCan} />
                        {t("goal-remove-delete")}
                    </button>
                </div>
            </div>
        </div>
    );
}

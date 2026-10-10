import { ReactElement, ReactNode } from "react";
import "@styles/shared/buddy-conversation.scss";

/**
 * The companion, saying something.
 *
 * This is the app's one way of drawing a character talking to a student, and it exists because the
 * two places that most need to feel personal — the daily intention and the post-exercise reflection —
 * were each drawing their own version. One put the portrait in a header and the question below it,
 * the other put a second, smaller copy of the portrait inside the bubble. Both read as a panel of
 * text that happened to sit near a picture.
 *
 * What makes it read as SPEECH rather than as a card:
 *
 *  - The portrait and the bubble are one object, joined by a tail. Separate them and the student has
 *    to work out that the words belong to the face.
 *  - The name sits above the words. Without it this is a generic popup; with it, it is their
 *    companion checking in with them.
 *  - The portrait is big enough to read as a face. At 40px it is an avatar chip; at 72px it is
 *    somebody looking at you.
 *
 * Callers pass the words as children so the same block carries a question, a greeting, or the
 * companion's reply to an answer.
 */
interface Props {
    buddyName: string;
    buddyEmoji: string;
    /** The equipped outfit or chatface art. Falls back to the emoji when absent. */
    buddyImage?: string;
    /** Hide only where the surrounding copy already names who is talking. */
    speaker?: boolean;
    /**
     * `ask` is the companion putting something to the student and takes the emphasis. `reply` is
     * their response to an answer and is set a little quieter, so the question keeps the weight
     * even after several turns are on screen.
     */
    variant?: "ask" | "reply";
    children: ReactNode;
}

export function BuddySays({
    buddyName,
    buddyEmoji,
    buddyImage,
    speaker = true,
    variant = "ask",
    children,
}: Props): ReactElement {
    return (
        <div className={`buddy-says buddy-says--${variant}`}>
            <span className="buddy-says__portrait">
                {buddyImage
                    ? <img src={buddyImage} alt={buddyName} />
                    : <span className="buddy-says__emoji">{buddyEmoji}</span>}
            </span>
            <div className="buddy-says__bubble">
                {speaker && <span className="buddy-says__speaker">{buddyName}</span>}
                <div className="buddy-says__text">{children}</div>
            </div>
        </div>
    );
}

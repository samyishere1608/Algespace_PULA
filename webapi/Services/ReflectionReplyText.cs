using webapi.Models.Student;

namespace webapi.Services
{
    /// <summary>
    /// Everything the student reads from a reflection when the model is not the one writing it.
    ///
    /// WHY THIS EXISTS. The offline reply — which is not a rare branch: the provider is slow or
    /// unreachable often enough that the controller calls it "often" — was written entirely in English,
    /// whatever language the student was using. A Japanese child whose reply did not come back from the
    /// model was answered in English, and so was a German one. The rule-based sentences and the facts
    /// they were built from were both hardcoded, so there was nothing to switch on.
    ///
    /// WHY IT IS ONE FILE. The fact and the sentence around it have to agree, and the sentence has to
    /// agree with the badge. Three places building one reply is how a student ends up reading a verdict
    /// that contradicts the text beside it, so both halves live here together.
    ///
    /// The Japanese follows the same guide as the model prompt: plain form (常体), no です・ます, no
    /// あなた, no 「〜の証」-shaped calques, short sentences, and only the kanji taught by the end of
    /// primary school.
    /// </summary>
    public static class ReflectionReplyText
    {
        public static GoalSuggestionText.Lang Parse(string? language)
        {
            var code = (language ?? "en").Trim().ToLowerInvariant();
            if (code.StartsWith("ja")) return GoalSuggestionText.Lang.Ja;
            if (code.StartsWith("de")) return GoalSuggestionText.Lang.De;
            return GoalSuggestionText.Lang.En;
        }

        private static string T(GoalSuggestionText.Lang lang, string en, string de, string ja) => lang switch
        {
            GoalSuggestionText.Lang.De => de,
            GoalSuggestionText.Lang.Ja => ja,
            _ => en,
        };

        /// <summary>
        /// Glues the "why it matters" clause onto the fact.
        ///
        /// Japanese is written without a space after a full stop, and English and German are not — so the
        /// separator is part of the language rather than a detail of the string interpolation.
        /// </summary>
        private static string JoinWhy(GoalSuggestionText.Lang lang, string why)
        {
            if (string.IsNullOrWhiteSpace(why)) return "";
            return lang == GoalSuggestionText.Lang.Ja ? why : " " + why;
        }

        // ── The fact about this question ─────────────────────────────────────

        /// <summary>
        /// What the record says they did on the one thing this question asks about, said TO them.
        ///
        /// Deliberately built from the numbers and flags rather than translated from the English
        /// sentence: the English path composes long clauses ("at least one of the exercises went by
        /// with no hints") that do not survive being translated piece by piece. The same evidence goes
        /// in, so the two say the same thing; the phrasing is each language's own.
        ///
        /// Empty means the record holds nothing about this question, and every caller has a warm
        /// sentence for that case rather than a gap.
        /// </summary>
        public static string Fact(ReflectionEvidence evidence, ReflectionQuestion? question, string choice, GoalSuggestionText.Lang lang)
        {
            if (question is null || evidence.IsSession) return "";

            switch (question.Id)
            {
                case "q2-compared":
                    if (evidence.DidCompare)
                        return T(lang, "you worked the comparison through yourself",
                            "du hast den Vergleich selbst durchgezogen",
                            "2つのやり方を自分で比べて考えた");
                    return evidence.WasShownComparison
                        ? T(lang, "you went straight on without comparing the two methods",
                            "du bist weitergegangen, ohne die beiden Verfahren zu vergleichen",
                            "2つのやり方を比べずに先へ進んだ")
                        : "";
                case "q2-explained":
                    if (evidence.DidExplain)
                        return T(lang, "you explained your own reasoning there",
                            "du hast dein Vorgehen dort erklärt",
                            "自分の考えをそこで言葉にした");
                    return evidence.WasShownExplanation
                        ? T(lang, "you moved on without putting your reasoning into words",
                            "du bist weitergegangen, ohne dein Vorgehen in Worte zu fassen",
                            "考えを言葉にしないまま先へ進んだ")
                        : "";
                case "q1-step-sure":
                case "q1-step-fight":
                {
                    var chosen = choice.StartsWith("step-", StringComparison.Ordinal) ? choice[5..] : "";
                    if (question.Id == "q1-step-sure" && chosen.Length > 0 && evidence.CleanStepIds.Contains(chosen))
                        return T(lang, $"you got through {StepGloss(chosen, lang)} without a mistake",
                            $"du bist durch {StepGloss(chosen, lang)} gekommen, ohne einen Fehler",
                            $"{StepGloss(chosen, lang)}をミスなく進めた");

                    var clean = evidence.Steps.Where(step => evidence.CleanStepIds.Contains(step.Id)).ToList();
                    if (question.Id == "q1-step-sure" && clean.Count > 0)
                        return T(lang,
                            $"you got through {string.Join(" and ", clean.Select(step => StepGloss(step.Id, lang)))} without a mistake",
                            $"du bist durch {string.Join(" und ", clean.Select(step => StepGloss(step.Id, lang)))} gekommen, ohne einen Fehler",
                            $"{string.Join("と", clean.Select(step => StepGloss(step.Id, lang)))}をミスなく進めた");

                    var worst = evidence.Steps.OrderByDescending(step => step.Errors * 1000 + step.Hints).FirstOrDefault();
                    if (worst is null || (worst.Errors == 0 && worst.Hints == 0)) return "";
                    return T(lang, $"{StepGloss(worst.Id, lang)} is the part that cost you the most",
                        $"bei {StepGloss(worst.Id, lang)} war es am aufwendigsten",
                        $"いちばん手間がかかったのは{StepGloss(worst.Id, lang)}");
                }
                case "q1-exercise-went-well":
                {
                    var good = new List<string>();
                    if (evidence.Errors == 0)
                        good.Add(T(lang, "you finished it without a single mistake",
                            "du hast es ohne einen einzigen Fehler geschafft",
                            "ミスなしで終えられた"));
                    if (evidence.Hints == 0)
                        good.Add(T(lang, "you got through it with no hints",
                            "du hast es ohne einen einzigen Hinweis geschafft",
                            "ヒントなしで進めた"));
                    if (evidence.DidExplain)
                        good.Add(T(lang, "you explained your own reasoning",
                            "du hast dein eigenes Vorgehen erklärt",
                            "自分の考えを言葉にした"));
                    if (evidence.DidCompare)
                        good.Add(T(lang, "you compared the two methods",
                            "du hast die beiden Verfahren verglichen",
                            "2つのやり方を比べた"));
                    if (evidence.HasAllowedMethods && evidence.ChoseAllowedMethod)
                        good.Add(T(lang, "you picked a method this exercise allowed",
                            "du hast ein Verfahren gewählt, das diese Aufgabe zulässt",
                            "この課題で使える解き方を選べた"));

                    return good.Count switch
                    {
                        0 => CountLine(evidence.Errors, evidence.Hints, lang),
                        1 => good[0],
                        _ => string.Join(lang == GoalSuggestionText.Lang.Ja ? "、" : ", ", good.Take(good.Count - 1))
                             + (lang == GoalSuggestionText.Lang.Ja ? "、" : " and ") + good[^1],
                    };
                }
            }

            // Goal questions are answered against their own menu, so the fact is the option they took.
            if (question.ChipFacts.Count > 0)
            {
                if (!string.IsNullOrEmpty(choice) && question.ChipFacts.TryGetValue(choice, out var tapped))
                    return tapped;
                return question.ChipFacts.Values.FirstOrDefault() ?? "";
            }

            switch (question.TextKey)
            {
                case "reflection-q2-count-clean":
                    return T(lang, $"you got through {evidence.CleanRuns} of them without a single mistake",
                        $"du hast {evidence.CleanRuns} davon ohne einen einzigen Fehler geschafft",
                        $"そのうち{evidence.CleanRuns}問はミスなしで終えられた");
                case "reflection-q2-count-hintfree":
                    return T(lang, $"{evidence.HintFreeRuns} of them went by with no hints at all",
                        $"bei {evidence.HintFreeRuns} davon hast du keinen einzigen Hinweis gebraucht",
                        $"{evidence.HintFreeRuns}問はヒントなしで進められた");
                case "reflection-q2-count-solo":
                    return T(lang, $"you worked {evidence.SolvedOnOwnRuns} of them out before seeing the answer",
                        $"du hast {evidence.SolvedOnOwnRuns} davon selbst gelöst, bevor du die Antwort gesehen hast",
                        $"{evidence.SolvedOnOwnRuns}問は答えを見る前に自分で解けた");
            }

            // ANY OTHER EXERCISE QUESTION FALLS BACK TO THE COUNTS.
            //
            // Every one of them is ultimately about how this exercise went, and the counts are the part
            // of that which is always known — they are on the student's own dashboard. Without this, a
            // question with no dedicated branch ("did that go better than usual?") produced no fact at
            // all and the reply said nothing about the question it was answering. A goal is left alone:
            // it covers several exercises, and one count for all of them would be a made-up number.
            return evidence.IsGoal ? "" : CountLine(evidence.Errors, evidence.Hints, lang);
        }

        /// <summary>
        /// The counts, when the exercise has nothing good to name.
        ///
        /// Q1 asks what went well, and an exercise with mistakes and hints has no entry in that list —
        /// so the fact used to come back empty and the reply said nothing about the question at all.
        /// The numbers are still the answer to "how did it go", and they are the ones on the student's
        /// own dashboard, so they are what a question with no praise in it gets.
        /// </summary>
        private static string CountLine(int errors, int hints, GoalSuggestionText.Lang lang) => (errors, hints) switch
        {
            (0, 0) => T(lang, "you finished it with no mistakes and no hints",
                "du hast es ohne Fehler und ohne Hinweis geschafft",
                "ミスもヒントもなしで終えられた"),
            (0, _) => T(lang, $"you finished it with no mistakes and {hints} hint(s)",
                $"du hast es ohne Fehler und mit {hints} Hinweis(en) geschafft",
                $"ミスなしで終えられた。ヒントは{hints}回"),
            (_, 0) => T(lang, $"you finished it with {errors} mistake(s) and no hints",
                $"du hast es mit {errors} Fehler(n) und ohne Hinweis geschafft",
                $"ヒントなしで終えられた。ミスは{errors}回"),
            _ => T(lang, $"you made {errors} mistake(s) and used {hints} hint(s)",
                $"du hattest {errors} Fehler und {hints} Hinweis(e)",
                $"ミスが{errors}回、ヒントが{hints}回だった"),
        };

        /// <summary>The four parts of an exercise, in plain words a student would use.</summary>
        public static string StepGloss(string stepId, GoalSuggestionText.Lang lang) => stepId switch        {
            "choose" => T(lang, "the part where the method is chosen", "der Teil, in dem das Verfahren gewählt wird", "解き方を選ぶところ"),
            "setup" => T(lang, "the part where the method is set up", "der Teil, in dem das Verfahren vorbereitet wird", "解き方を当てはめるところ"),
            "solve" => T(lang, "the part where the solution is found", "der Teil, in dem die Lösung gefunden wird", "答えを求めるところ"),
            "explain" => T(lang, "the part where the reasoning is written out", "der Teil, in dem das Vorgehen aufgeschrieben wird", "考えを書くところ"),
            _ => T(lang, "that part", "dieser Teil", "その部分"),
        };

        // ── The sentences around the fact ────────────────────────────────────

        /// <summary>One short line saying what that thing is for.</summary>
        public static string Why(ReflectionQuestion question, GoalSuggestionText.Lang lang)
        {
            if (lang == GoalSuggestionText.Lang.En) return question.Meaning;

            return question.Id switch
            {
                "q2-explained" or "q1-step-fight" =>
                    T(lang, "", "Wer sein Vorgehen in Worte fasst, merkt sich den Weg und nicht nur die Zahl.", "考えを言葉にすると、やり方が身について、つぎにも使えるようになるよ。"),
                "q2-compared" =>
                    T(lang, "", "Zwei Verfahren zu vergleichen ist die Fähigkeit, die später die Aufgaben leichter macht.", "2つのやり方を比べると、どちらが合っているかを見きわめられるようになるよ。"),
                "q3-next-action" =>
                    T(lang, "", "Ein kleiner nächster Schritt ist leichter umzusetzen als ein großer Vorsatz.", "つぎにやることを1つ決めておくと、そのとおりに動きやすいよ。"),
                _ => T(lang, "", "Genau darum geht es: das eigene Vorgehen zu bemerken, nicht nur das Ergebnis.", "自分のやり方に気づくことが、いちばん大事なところだよ。"),
            };
        }

        /// <summary>The reply when their answer matches the record and the record supplied the fact.</summary>
        public static string Aligned(string fact, ReflectionQuestion question, GoalSuggestionText.Lang lang)
        {
            var why = Why(question, lang);
            if (string.IsNullOrWhiteSpace(fact))
                return T(lang, "That is how it went here.", "So war es hier.", "ここはそうだったね。") + JoinWhy(lang, why);

            var capitalised = char.ToUpperInvariant(fact[0]) + fact[1..];
            return T(lang, $"{capitalised}.", $"{capitalised}.", $"{fact}。") + JoinWhy(lang, why);
        }

        /// <summary>
        /// The reply when their answer does not match. Their words come back FIRST, then the fact.
        ///
        /// The order is the whole point: a reply that goes straight to the fact is answering something
        /// they never said, and they have no way to know it was a reply to them. Nothing here marks the
        /// difference as a fault — the badge already carries that, and a child who misread a chart still
        /// looked at their work.
        /// </summary>
        public static string Mismatch(string choiceLabel, string fact, ReflectionQuestion question, GoalSuggestionText.Lang lang)
        {
            var said = (choiceLabel ?? "").Trim();
            var why = Why(question, lang);

            if (string.IsNullOrWhiteSpace(fact))
                return T(lang, "Thanks for having a go at that.", "Danke, dass du dich daran versucht hast.", "答えてくれてありがとう。")
                     + JoinWhy(lang, why);

            if (string.IsNullOrWhiteSpace(said))
                return T(lang, $"Here is what the record says: {fact}.", $"Im Record steht: {fact}.", $"記録では、{fact}。")
                     + JoinWhy(lang, why);

            return T(lang,
                    $"You thought \"{said}\" — and here is what the record says: {fact}.",
                    $"Du dachtest \"{said}\" — im Record steht: {fact}.",
                    $"「{said}」と思ったんだね。記録では、{fact}。")
                 + JoinWhy(lang, why);
        }

        /// <summary>The help button's reply: the picture, said as something the companion noticed.</summary>
        public static string Pippin(string fact, ReflectionQuestion question, GoalSuggestionText.Lang lang)
        {
            if (string.IsNullOrWhiteSpace(fact))
                return T(lang,
                    "Happy to help with this one. I have nothing about that step to go on here, so the best I can say is to take the moment this question is about and give it a go on the next exercise.",
                    "Gern. Zu diesem Schritt habe ich hier nichts, also nimm dir beim nächsten Mal genau den Moment vor, um den es in dieser Frage geht.",
                    "この質問のところは、記録にのこっていないみたいだ。つぎの課題で、この部分をちょっと意識してみよう。");

            var why = Why(question, lang);
            return T(lang,
                    $"Here is what I noticed about this one: {fact}.",
                    $"Das habe ich hier gesehen: {fact}.",
                    $"この課題で見えたのは、{fact}ということだよ。")
                 + JoinWhy(lang, why);
        }

        /// <summary>A written answer, judged and unjudged. Never quotes them back.</summary>
        public static string Written(bool confirms, int questionNumber, GoalSuggestionText.Lang lang)
        {
            if (confirms)
                return T(lang,
                    "Thank you for putting that into your own words. What you noticed is right there in your own numbers, and naming it is the part that makes a session add up to something.",
                    "Danke, dass du das in eigenen Worten gesagt hast. Was du bemerkt hast, steht genau in deinen Zahlen, und es zu benennen ist der Teil, der aus einer Einheit etwas macht.",
                    "自分の言葉で書けたね。気づいたことは、自分の数字のなかにあるよ。言葉にすると、そこがちゃんと残るんだ。");

            return questionNumber == 1
                ? T(lang,
                    "Thank you for putting that into your own words. Stopping to write it down is the part that makes a session add up to something.",
                    "Danke, dass du das in eigenen Worten gesagt hast. Kurz innezuhalten und es aufzuschreiben ist der Teil, der aus einer Einheit etwas macht.",
                    "自分の言葉で書けたね。立ち止まって書くことが、つぎにつながるんだよ。")
                : T(lang,
                    "Thank you for writing that down. That is a useful thing to have said out loud, and it is the kind of note worth keeping.",
                    "Danke, dass du das aufgeschrieben hast. Es auszusprechen ist nützlich, und so eine Notiz lohnt sich zu behalten.",
                    "書いてくれてありがとう。口に出して言ってみると、次のときに思い出しやすいよ。");
        }

        /// <summary>The two end-of-session questions, which are ungraded.</summary>
        public static string Session(int questionNumber, GoalSuggestionText.Lang lang) => questionNumber == 1
            ? T(lang,
                "Thanks for taking a moment over today. However it went, stopping to look back at it is what turns a session into progress.",
                "Danke, dass du dir heute einen Moment genommen hast. Wie es auch lief — zurückzuschauen macht aus einer Einheit Fortschritt.",
                "今日をふり返ってみてくれてありがとう。うまくいった日も、そうでない日も、見返すことがつぎにつながるよ。")
            : T(lang,
                "Thanks for choosing something to work on. That is exactly what the next session is for.",
                "Danke, dass du dir etwas vorgenommen hast. Genau dafür ist die nächste Einheit da.",
                "つぎにやることを決められたね。それが次の時間のいちばんの収穫だよ。");

        /// <summary>A commitment about the next exercise — the answer to Q3.</summary>
        public static string Promise(string label, GoalSuggestionText.Lang lang) => string.IsNullOrWhiteSpace(label)
            ? T(lang, "Good, you have named something to work on next time.",
                "Gut, du hast etwas für das nächste Mal benannt.",
                "つぎにやることが決まったね。")
            : T(lang, $"Good, you have picked \"{label}\" for next time.",
                $"Gut, du hast \"{label}\" für das nächste Mal gewählt.",
                $"「{label}」でいこう。さきに決めておくと、そのとおりに動きやすいよ。");

        public static string PromiseNextStep(string label, GoalSuggestionText.Lang lang) => string.IsNullOrWhiteSpace(label)
            ? T(lang, "Take the thing you just named and try it in your next exercise.",
                "Nimm dir das, was du gerade benannt hast, in der nächsten Aufgabe vor.",
                "いま決めたことを、つぎの課題でやってみよう。")
            : T(lang, $"Next time: {label}.",
                $"Nächstes Mal: {label}.",
                $"次は「{label}」をやってみよう。");

        /// <summary>Nothing in the record about this question — no fact to state.</summary>
        public static string NoFact(GoalSuggestionText.Lang lang) => T(lang,
            "Thanks for writing that down. Looking back at your own work like this is what makes the next exercise easier to plan.",
            "Danke, dass du das aufgeschrieben hast. So auf die eigene Arbeit zurückzuschauen macht die nächste Aufgabe leichter planbar.",
            "書いてくれてありがとう。ふり返ると、つぎの課題の計画が立てやすいよ。");
    }
}

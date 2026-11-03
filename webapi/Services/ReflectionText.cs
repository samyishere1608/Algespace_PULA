namespace webapi.Services
{
    /// <summary>
    /// Student-facing wording for the reflection features, in the student's own language.
    ///
    /// The AI paths get their sentences from the model, so they only need an instruction. The
    /// rule-based paths assemble their own sentences, and those are read by the student — without this
    /// a Japanese student was shown English coaching inside an otherwise Japanese screen. Same
    /// reasoning as <see cref="GoalSuggestionText"/> for the goal picker.
    ///
    /// The Japanese was machine-written, then rewritten to the native style guide in
    /// `BuildReflectionPrompt` (常体, no あなた, grade-6 kanji, short sentences). It still has not been
    /// read by a native speaker, so it wants the same review the rest of the Japanese content does.
    /// </summary>
    public static class ReflectionText
    {
        // ── End-session analysis, rule-based fallback ─────────────────────────

        /// <summary>Strengths when at least one goal was completed today.</summary>
        public static string StrengthsGoals(GoalSuggestionText.Lang lang, int goals) => lang switch
        {
            GoalSuggestionText.Lang.De =>
                $"Du hast heute {goals} Ziel(e) durchgehalten. Ein Ziel zu setzen und es dann zu erreichen — genau das bringt dich voran.",
            GoalSuggestionText.Lang.Ja =>
                $"今日は{goals}つの目標をやりとげたね。目標を立てて、それを達成する。これが本当の前進につながるんだ。",
            _ =>
                $"You followed through on {goals} goal(s) today. Setting a goal and then meeting it is the habit that actually moves progress forward."
        };

        /// <summary>Strengths when they practised but completed no goal.</summary>
        public static string StrengthsPractised(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De =>
                "Du hast heute geübt und dabei kein Ziel abgeschlossen. Ein Ziel macht aus Üben etwas, das du abschließen kannst.",
            GoalSuggestionText.Lang.Ja =>
                "今日は練習できたね。でも目標の達成には、まだとどかなかった。目標を決めておくと、練習が「やりきった」に変わるよ。",
            _ =>
                "You practised today, but did not complete a goal. A goal turns practice into something you can finish."
        };

        /// <summary>Strengths when nothing at all was logged today.</summary>
        public static string StrengthsNothing(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De => "Heute ist noch nichts eingetragen — es ist noch Zeit für eine Einheit.",
            GoalSuggestionText.Lang.Ja => "今日はまだ記録がないね。まだ時間はあるよ。",
            _ => "Nothing logged yet today — there is still time for a session."
        };

        /// <summary>Area to grow when no goal was completed.</summary>
        public static string ImprovementNoGoal(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De =>
                "Setz dir nächstes Mal ein konkretes Ziel, bevor du anfängst — dann zahlt dieselbe Arbeit auf etwas ein, das du abschließen kannst.",
            GoalSuggestionText.Lang.Ja =>
                "次は始める前に、具体的な目標を1つ立ててみよう。同じ努力が「やりきった」につながるよ。",
            _ =>
                "Set one specific goal before you start next time — the same effort then counts towards something you can finish."
        };

        /// <summary>Area to grow when at least one goal was completed.</summary>
        public static string ImprovementGoals(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De =>
                "Deine Ziele drehten sich ums Dranbleiben. Ergänze beim nächsten Mal eins dazu, bei dem du dein Vorgehen erklärst — begründen zu können, warum ein Verfahren funktioniert, ist der nächste Schritt.",
            GoalSuggestionText.Lang.Ja =>
                "今回はやりきることが目標だったね。次は「考え方を言葉で説明する」目標をたしてみよう。なぜその方法で解けるのかを説明できるのが、つぎのステップだよ。",
            _ =>
                "Your goals were about following through. Next time, add one about explaining your reasoning — being able to say why a method works is the next step up."
        };

        /// <summary>The three concrete next steps. Fixed wording, same order for every student.</summary>
        public static List<string> ActionSteps(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De => new List<string>
            {
                "Löse eine Aufgabe mit irgendeinem Verfahren, um anzufangen.",
                "Schreib vor dem Start ein Ziel auf, damit du am Ende weißt, ob du es erreicht hast.",
                "Frag dich nach jeder Aufgabe: Könnte ich erklären, warum dieses Verfahren funktioniert?"
            },
            GoalSuggestionText.Lang.Ja => new List<string>
            {
                "まずはどの方法でもいいから、問題を1問解いてみよう。",
                "始める前に目標を1つ書いておくと、終わったときに達成できたかがわかるよ。",
                "各問題のあとに「なぜその方法で解けるのか説明できるかな？」と自分にきいてみよう。"
            },
            _ => new List<string>
            {
                "Do one exercise on any method to get started.",
                "Write down one goal before you begin, so you can tell at the end whether you met it.",
                "After each exercise, ask yourself: could I explain why that method worked?"
            }
        };

        // ── Self-reflection on stats, when the model is not available ─────────

        /// <summary>No API key configured — the feature is off rather than broken.</summary>
        public static string ReflectionNoApiKey(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De =>
                "Selbstreflexion ist eine starke Gewohnheit! Gerade kann ich deine Gedanken nicht mit deinen Werten vergleichen — schau auf dein Dashboard: Passen die Zahlen zu deinem Gefühl?",
            GoalSuggestionText.Lang.Ja =>
                "ふり返るのは、とてもいい習慣だよ。いまはきみの考えと記録をくらべられないけど、ダッシュボードを見てみよう。数字と感覚は合ってるかな？",
            _ =>
                "Self-reflection is a powerful habit! Right now I can't compare your thoughts to your stats, but take a look at your dashboard — do the numbers match how you feel?"
        };

        /// <summary>The model was configured but the call did not come back.</summary>
        public static string ReflectionUnreachable(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De =>
                "Ich konnte meinen Denkpartner gerade nicht erreichen. Lass dich davon nicht aufhalten — schau auf dein Dashboard und vergleiche die Zahlen mit deinem Gefühl.",
            GoalSuggestionText.Lang.Ja =>
                "いま考えるパートナーにつながらなかったよ。でもだいじょうぶ。ダッシュボードを見て、数字と自分の感覚をくらべてみよう。",
            _ =>
                "I couldn't reach my thinking partner just now. Don't let that stop you — look at your dashboard and see whether the numbers match how you feel."
        };

        /// <summary>The call failed outright.</summary>
        public static string ReflectionFailed(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De =>
                "Ich konnte deine Reflexion gerade nicht auswerten. Bleib dran — deine Gedanken mit deinen tatsächlichen Werten zu vergleichen, bringt dich weiter.",
            GoalSuggestionText.Lang.Ja =>
                "いまふり返りを分析できなかったよ。そのまま続けていこう。自分の考えと実際の記録をくらべることは、大きな成長につながるんだ。",
            _ =>
                "I couldn't analyse your reflection right now. Keep at it — comparing your thoughts with your actual stats is a great way to grow."
        };

        /// <summary>
        /// Instruction appended to a prompt, naming the language the prose must come back in.
        ///
        /// Deliberately separate from <see cref="GoalSuggestionText.LangInstruction"/>: that one names
        /// the plan title and the reasons, which do not exist here.
        /// </summary>
        public static string LangInstruction(GoalSuggestionText.Lang lang) => lang switch
        {
            GoalSuggestionText.Lang.De => "Write all student-facing prose in German.",
            GoalSuggestionText.Lang.Ja => "Write all student-facing prose in Japanese.",
            _ => "Write all student-facing prose in English."
        };
    }
}

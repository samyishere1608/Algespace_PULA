using webapi.Models.Anchors;

namespace webapi.Services
{
    /// <summary>
    /// Student-facing wording for goal suggestions, in the student's own language.
    ///
    /// The AI path gets its sentences from the model, so it needs only an instruction. The rule-based
    /// fallback assembles its own sentences, and those are read by the student in the goal picker —
    /// without this a German student was shown English prose inside an otherwise German screen. Same
    /// reasoning as <see cref="OffTopicDetector.RetryMessage"/> for the reflection flow.
    ///
    /// The raw values handed in (method names, exercise-type names, the three decision labels) are the
    /// English strings the tracker records, so they are translated here rather than passed through.
    /// </summary>
    public static class GoalSuggestionText
    {
        public enum Lang
        {
            En,
            De,
            Ja
        }

        /// <summary>Maps a language tag such as "de-DE" onto a supported language, defaulting to English.</summary>
        public static Lang Resolve(string? language)
        {
            var tag = language?.Trim().ToLowerInvariant() ?? string.Empty;

            if (tag.StartsWith("de", StringComparison.Ordinal)) return Lang.De;
            if (tag.StartsWith("ja", StringComparison.Ordinal)) return Lang.Ja;
            return Lang.En;
        }

        /// <summary>
        /// The instruction appended to the suggestion prompt.
        ///
        /// Deliberately covers the reasons as well as the plan: the picker shows each reason next to
        /// its goal, so a translated plan with English reasons would look half-finished.
        /// </summary>
        public static string LangInstruction(string? language) => Resolve(language) switch
        {
            Lang.De => "Language (very important): write the plan title, the narrative and EVERY reason in German.",
            Lang.Ja => "Language (very important): write the plan title, the narrative and EVERY reason in Japanese.",
            _ => "Language (very important): write the plan title, the narrative and EVERY reason in English."
        };

        /// <summary>Display name for a method or exercise-type value. Unknown values pass through.</summary>
        public static string DisplayName(string value, Lang lang) => (value, lang) switch
        {
            ("Suitability", Lang.De) => "Eignung",
            ("Suitability", Lang.Ja) => "適切性",
            ("Efficiency", Lang.De) => "Effizienz",
            ("Efficiency", Lang.Ja) => "効率",
            ("Matching", Lang.De) => "Zuordnung",
            ("Matching", Lang.Ja) => "マッチング",
            ("Elimination", Lang.Ja) => "加減法",
            ("Substitution", Lang.Ja) => "代入法",
            ("Equalization", Lang.De) => "Gleichsetzung",
            ("Equalization", Lang.Ja) => "等置法",
            _ => value
        };

        public static string NoDataTitle(Lang lang) => lang switch
        {
            Lang.De => "Noch nicht genug Daten",
            Lang.Ja => "データがまだ足りません",
            _ => "Not Enough Data Yet"
        };

        public static string NoDataNarrative(Lang lang) => lang switch
        {
            Lang.De => "Ich habe noch nicht genug Daten für persönliche Vorschläge. "
                     + "Mach zuerst ein paar Aufgaben — welchen Typ du möchtest!",
            Lang.Ja => "個別の提案をするにはまだデータが足りません。"
                     + "まずは数問解いてみましょう — タイプは何でも大丈夫です！",
            _ => "I don't have enough data yet to make personalized suggestions. "
               + "Complete a few exercises first — any type you like!"
        };

        public static string Title(bool avoided, Lang lang) => (avoided, lang) switch
        {
            (true, Lang.De) => "Trau dich an das, was du überspringst",
            (true, Lang.Ja) => "避けていることに挑戦",
            (true, _) => "Try the Thing You Skip",
            (false, Lang.De) => "Bringe Abwechslung rein",
            (false, Lang.Ja) => "練習のバランスを取る",
            (false, _) => "Balance Your Practice"
        };

        public static string Narrative(bool avoided, int exercises, string leastType, Lang lang)
        {
            var type = DisplayName(leastType, lang);

            return (avoided, lang) switch
            {
                (true, Lang.De) => "Eine Sache lässt du konsequent aus — und das lohnt einen Blick. "
                                 + $"Diese Ziele setzen dort an und runden dein Üben ab: bisher {exercises} Aufgaben, "
                                 + $"am seltensten {type}.",
                (true, Lang.Ja) => "いつも見送っていることが一つあります。そこが第一の提案です。"
                                 + $"そこから始めて、練習全体を整えましょう — これまで{exercises}問、"
                                 + $"最も少ないのは{type}です。",
                (true, _) => "You consistently pass on one thing, and that is worth a look. These goals start there, "
                           + $"then round out how you practise — {exercises} exercises in so far, with the least time "
                           + $"spent on {type}.",
                (false, Lang.De) => "Du lässt dich auf alles ein, was dir begegnet — diese Ziele erweitern dein Üben, "
                                  + $"statt eine Lücke zu schließen. {type} ist bisher dein seltenster Typ, bei {exercises} Aufgaben.",
                (false, Lang.Ja) => "出されたものにきちんと取り組めています。そこで、穴を埋めるのではなく"
                                  + $"練習の幅を広げる目標にしました。{exercises}問の中で最も少ないのは{type}です。",
                (false, _) => "You engage with whatever is put in front of you, so these goals widen what you practise "
                            + $"rather than fix a gap. {type} is your least-used type so far, out of {exercises} exercises."
            };
        }

        /// <summary>
        /// Reason for the goal built around something the student keeps declining.
        ///
        /// Written per element rather than by slotting a label into one sentence: the three labels are
        /// noun phrases that read badly inside a single template in German and Japanese.
        /// </summary>
        public static string DeclinedReason(string element, int declined, int opportunities, Lang lang) => (element, lang) switch
        {
            (AnchorElement.SolveOnOwn, Lang.De) => $"Du hast {declined} von {opportunities} Malen darauf verzichtet, "
                                                        + "selbst zu rechnen. Fünf Versuche reichen, um zu sehen, was passiert.",
            (AnchorElement.SolveOnOwn, Lang.Ja) => $"直近{opportunities}回のうち{declined}回、自分で解くことを見送りました。"
                                                        + "5回試せば何かが見えてきます。",
            (AnchorElement.SolveOnOwn, _) => $"You've turned down working out the solution yourself {declined} of the last "
                                                  + $"{opportunities} times. Five tries is enough to find out what happens.",

            (AnchorElement.SelfExplanation, Lang.De) => $"Du hast {declined} von {opportunities} Malen darauf verzichtet, "
                                                             + "dein Vorgehen zu begründen. Fünf Versuche reichen, um zu sehen, was passiert.",
            (AnchorElement.SelfExplanation, Lang.Ja) => $"直近{opportunities}回のうち{declined}回、考えを説明することを見送りました。"
                                                             + "5回試せば何かが見えてきます。",
            (AnchorElement.SelfExplanation, _) => $"You've skipped explaining your reasoning {declined} of the last "
                                                       + $"{opportunities} times. Five tries is enough to find out what happens.",

            (AnchorElement.MethodComparison, Lang.De) => $"Du hast {declined} von {opportunities} Malen darauf verzichtet, "
                                                              + "Verfahren zu vergleichen. Fünf Versuche reichen, um zu sehen, was passiert.",
            (AnchorElement.MethodComparison, Lang.Ja) => $"直近{opportunities}回のうち{declined}回、解法の比較を見送りました。"
                                                              + "5回試せば何かが見えてきます。",
            _ => $"You've passed on comparing methods {declined} of the last {opportunities} times. "
               + "Five tries is enough to find out what happens."
        };

        public static string LeastPractisedReason(int count, int total, string typeValue, Lang lang)
        {
            var type = DisplayName(typeValue, lang);

            return lang switch
            {
                Lang.De when total == 0 => $"Fang mit {type} an — ein guter Einstieg.",
                Lang.De => $"{count} von {total} Aufgaben waren {type} — der seltenste der drei Typen.",
                Lang.Ja when total == 0 => $"{type}から始めてみましょう — 良いスタートです。",
                Lang.Ja => $"{total}問中{count}問が{type}でした — 3タイプの中で最も少ないです。",
                _ when total == 0 => $"Start with {type} — a good place to begin.",
                _ => $"{count} of your {total} exercises were {type} — the fewest of the three types."
            };
        }

        public static string HintsReason(double average, Lang lang) => lang switch
        {
            Lang.De => $"Du nimmst etwa {average} Hinweise pro Aufgabe. Höchstens einen zu brauchen ist ein Schritt, kein Sprung.",
            Lang.Ja => $"1問あたり約{average}回ヒントを使っています。1回以下を目指すのは無理のない一歩です。",
            _ => $"You take about {average} hints per exercise. Keeping to one or fewer is a step, not a leap."
        };

        public static string ErrorsReason(double average, Lang lang) => lang switch
        {
            Lang.De => $"Etwa {average} Fehler pro Aufgabe. Bei drei Aufgaben höchstens einen zu haben, ist ein faires Ziel.",
            Lang.Ja => $"1問あたり約{average}個のミスがあります。3問で1個以下なら無理のない目標です。",
            _ => $"About {average} errors per exercise. Staying at one or fewer across three is a fair target."
        };

        public static string MethodReason(string methodValue, int used, bool neverUsed, Lang lang)
        {
            var method = DisplayName(methodValue, lang);

            return (neverUsed, lang) switch
            {
                (true, Lang.De) => $"Probier {method} ein paar Mal aus — ein Verfahren, das du noch nicht genutzt hast.",
                (true, Lang.Ja) => $"{method}を何回か試してみましょう — まだ使っていない解法です。",
                (true, _) => $"Try {method} a few times — a method you have not used yet.",
                (false, Lang.De) => $"Du hast {method} bisher {used} Mal genutzt — am seltensten von den dreien.",
                (false, Lang.Ja) => $"{method}は今まで{used}回で、3つの中で最も少ないです。",
                (false, _) => $"You've used {method} {used} times so far — the fewest of the three."
            };
        }
    }
}

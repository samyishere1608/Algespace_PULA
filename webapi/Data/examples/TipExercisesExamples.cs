using webapi.Models.Flexibility;
using webapi.Models.Math;

namespace webapi.Data.Examples
{
    public class TipExercisesExamples
    {
        public static List<ExtendedTipExercise> GetExamples()
        {
            ExtendedTipExercise equalization1 = new()
            {
                Id = 1,
                Ordering = 1,
                Method = Method.Equalization,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(3), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(7), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-8) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(3), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(8), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-7) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.FirstMultiple,
                SecondEquationIsIsolatedIn = IsolatedIn.FirstMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(-5) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(-1) },
                QuestionDE = "Wusstest du, dass man das Gleichsetzungsverfahren auch anwenden kann, wenn beide Gleichungen im System nach demselben Vielfachen einer Variable gelöst sind? Möchtest du eine solche Aufgabe ausprobieren?",
                QuestionEN = "Did you know that you can also use the equation method if both equations in the system are solved for the same multiple of a variable? Would you like to try out such a task?",
                AgentMessageForTaskDE = "In dieser Aufgabe lernst du eine zusätzliche Strategie kennen, die dir auch bei anderen Aufgaben helfen kann.",
                AgentMessageForTaskEN = "In this task, you will learn an additional strategy that can also help you with other tasks.",
                AgentMessageForFirstSolutionDE = "Wenn du von Hand rechnest, wirst du unabhängiger von technischen Hilfsmitteln und kannst dich auf deine eigenen Fähigkeiten verlassen.",
                AgentMessageForFirstSolutionEN = "If you calculate by hand, you become less dependent on technical aids and can rely on your own skills.",
                AgentMessageForSecondSolutionDE = "Wenn du regelmäßig von Hand rechnest, erweiterst und verbesserst du deine mathematischen Fertigkeiten kontinuierlich.",
                AgentMessageForSecondSolutionEN = "If you regularly calculate by hand, you will continuously expand and improve your maths skills.",
            };

            ExtendedTipExercise substitution1 = new()
            {
                Id = 2,
                Ordering = 2,
                Method = Method.Substitution,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X, IsUnion = true },
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(18) }],
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(-2) },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y },
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.FirstMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(5) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(4) },
                QuestionDE = "Wusstest du, dass man auch den zu einem Vielfachen einer Variablen gehörenden Term in die andere Gleichung einsetzen kann, wenn in dieser Gleichung dasselbe Vielfache der Variablen vorkommt? Möchtest du ein solches Beispiel zum Einsetzungsverfahren ausprobieren?",
                QuestionEN = "Did you know that you can also substitute the term belonging to a multiple of a variable into the other equation if the same multiple of the variable occurs in this equation? Would you like to try out an example of this substitution method?",
                AgentMessageForTaskDE = "In dieser Aufgabe lernst du, wie man das Einsetzungsverfahren noch effizienter anwenden kann. Damit bist du auch für schwierigere Aufgaben gut vorbereitet.",
                AgentMessageForTaskEN = "In this task, you will learn how to use the substitution method even more efficiently. This will also prepare you well for more difficult tasks.",
                AgentMessageForFirstSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForFirstSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation.",
                AgentMessageForSecondSolutionDE = "Wenn du einfache Gleichungen von Hand lösen kannst, bist du besser vorbereitet, auch komplexe Probleme anzugehen.",
                AgentMessageForSecondSolutionEN = "If you can solve simple equations by hand, you will be better prepared to tackle complex problems.",
            };


            return [equalization1, substitution1];
        }
    }
}
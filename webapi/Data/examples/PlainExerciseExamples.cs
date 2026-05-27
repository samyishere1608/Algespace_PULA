using webapi.Models.Flexibility;
using webapi.Models.Math;

namespace webapi.Data.Examples
{
    public static class PlainExerciseExamples
    {
        public static List<ExtendedPlainExercise> GetExamples()
        {
            ExtendedPlainExercise exercise1 = new()
            {
                Id = 1,
                Ordering = 1,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(-1), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-4) }
                    ],
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(4) }
                    ],
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.First,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(0) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(-4) },
                AgentMessageForFirstSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForFirstSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation.",
                AgentMessageForSecondSolutionDE = "Wenn du einfache Gleichungen von Hand lösen kannst, bist du besser vorbereitet, auch komplexe Probleme anzugehen.",
                AgentMessageForSecondSolutionEN = "If you can solve simple equations by hand, you will be better prepared to tackle complex problems."
            };

            ExtendedPlainExercise exercise2 = new()
            {
                Id = 2,
                Ordering = 2,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(8) }
                    ],
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(12) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(11) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                AgentMessageForFirstSolutionDE = "Durch das Lösen von Gleichungen von Hand wirst du unabhängiger von Technologie.",
                AgentMessageForFirstSolutionEN = "Solving equations by hand makes you less dependent on technology.",
                AgentMessageForSecondSolutionDE = "Computer machen manchmal Fehler oder werden falsch bedient. Wenn du regelmäßig von Hand rechnest, kannst du solche Fehler leicht erkennen und korrigieren.",
                AgentMessageForSecondSolutionEN = "Computers sometimes make mistakes or are operated incorrectly. If you regularly calculate by hand, you can easily recognise and correct such errors."
            };

            ExtendedPlainExercise exercise3 = new()
            {
                Id = 3,
                Ordering = 3,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.X }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(5) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(1) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this."
            };

            ExtendedPlainExercise exercise4 = new()
            {
                Id = 4,
                Ordering = 4,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-6) }
                    ],
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(7) }
                    ],
                },
                FirstEquationIsIsolatedIn = IsolatedIn.Second,
                SecondEquationIsIsolatedIn = IsolatedIn.Second,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(-13) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(-45) },
                AgentMessageForFirstSolutionDE = "Wenn du von Hand rechnest, verstehst du die einzelnen Schritte besser und kannst Fehler schneller erkennen und korrigieren.",
                AgentMessageForFirstSolutionEN = "If you calculate by hand, you understand the individual steps better and can recognise and correct errors more quickly.",
                AgentMessageForSecondSolutionDE = "Durch das Rechnen von Hand verstehst du besser, wie mathematische Konzepte und Regeln zusammenhängen.",
                AgentMessageForSecondSolutionEN = "By calculating by hand, you will better understand how mathematical concepts and rules are related."
            };

            ExtendedPlainExercise exercise5 = new()
            {
                Id = 5,
                Ordering = 5,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1) },
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y }
                    ],
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-4), Variable = Identifier.X }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(22) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(-3) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(2) },
                AgentMessageForFirstSolutionDE = "Verschiedene Rechnungen von Hand auszuprobieren macht dich flexibel und anpassungsfähig bei der Lösung von Problemen.",
                AgentMessageForFirstSolutionEN = "Trying out different calculations by hand makes you flexible and adaptable when solving problems.",
                AgentMessageForSecondSolutionDE = "Wenn du von Hand rechnest, wirst du unabhängiger von technischen Hilfsmitteln und kannst dich auf deine eigenen Fähigkeiten verlassen.",
                AgentMessageForSecondSolutionEN = "If you calculate by hand, you become less dependent on technical aids and can rely on your own skills."
            };

            ExtendedPlainExercise exercise6 = new()
            {
                Id = 6,
                Ordering = 6,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(5) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(7), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(11) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(1) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, erweiterst und verbesserst du deine mathematischen Fertigkeiten kontinuierlich",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will continuously expand and improve your maths skills.",
                AgentMessageForSecondSolutionDE = "Viele alltägliche Probleme erfordern grundlegende mathematische Kenntnisse, die du durch manuelles Rechnen vertiefst.",
                AgentMessageForSecondSolutionEN = "Many everyday problems require basic mathematical knowledge, which you will deepen through manual calculation."
            };

            ExtendedPlainExercise exercise7 = new()
            {
                Id = 7,
                Ordering = 7,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(4) }
                    ],
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(5) }
                    ],
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.First,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient("13/3") },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient("-1/6") },
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, lernst du, genauer zu arbeiten und auf Details zu achten.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will learn to work more accurately and pay attention to details.",
                AgentMessageForSecondSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForSecondSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation."
            };

            ExtendedPlainExercise exercise8 = new()
            {
                Id = 8,
                Ordering = 8,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient("-2/75") }
                    ],
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient("1/3") }
                    ],
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient("1/15") },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient("7/75") },
                AgentMessageForFirstSolutionDE = "Wenn du einfache Gleichungen von Hand lösen kannst, bist du besser vorbereitet, auch komplexe Probleme anzugehen.",
                AgentMessageForFirstSolutionEN = "If you can solve simple equations by hand, you will be better prepared to tackle complex problems.",
                AgentMessageForSecondSolutionDE = "Durch das Lösen von Gleichungen von Hand wirst du unabhängiger von Technologie.",
                AgentMessageForSecondSolutionEN = "Solving equations by hand makes you less dependent on technology."
            };

            ExtendedPlainExercise exercise9 = new()
            {
                Id = 9,
                Ordering = 9,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(3) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(9) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(-1) },
                AgentMessageForFirstSolutionDE = "Computer machen manchmal Fehler oder werden falsch bedient. Wenn du regelmäßig von Hand rechnest, kannst du solche Fehler leicht erkennen und korrigieren.",
                AgentMessageForFirstSolutionEN = "Computers sometimes make mistakes or are operated incorrectly. If you regularly calculate by hand, you can easily recognise and correct such errors.",
                AgentMessageForSecondSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben",
                AgentMessageForSecondSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks."
            };

            ExtendedPlainExercise exercise10 = new()
            {
                Id = 10,
                Ordering = 10,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(8), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(5) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(-6) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient("-3/2") },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                AgentMessageForFirstSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForFirstSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this.",
                AgentMessageForSecondSolutionDE = "Wenn du von Hand rechnest, verstehst du die einzelnen Schritte besser und kannst Fehler schneller erkennen und korrigieren.",
                AgentMessageForSecondSolutionEN = "If you calculate by hand, you understand the individual steps better and can recognise and correct errors more quickly."
            };

            return [exercise1, exercise2, exercise3, exercise4, exercise5, exercise6, exercise7, exercise8, exercise9, exercise10];
        }
    }
}
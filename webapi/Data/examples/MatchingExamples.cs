
using webapi.Models.Flexibility;
using webapi.Models.Math;

namespace webapi.Data.Examples
{
    public class MatchingExamples
    {
        public static List<ExtendedMatchingExercise> GetExamples()
        {
            ExtendedMatchingExercise equalization1 = new()
            {
                Id = 1,
                Ordering = 1,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient("1/2"), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(2) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3) },
                        new() { Coefficient = new Coefficient("-3/2"), Variable = Identifier.X }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.Second,
                SecondEquationIsIsolatedIn = IsolatedIn.Second,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient("1/2") },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient("9/4") },
                Method = Method.Equalization,
                AlternativeSystems = [
                    new() {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(2) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [ new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(1), Variable = Identifier.Y },
                                new() { Coefficient = new Coefficient("1/2") }
                            ],
                        },
                    },
                    new() {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(10) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(5) }]
                        },
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Equalization,
                    IsSingleChoice = false,
                    Options = new List<ExtendedOption> {
                        new(){
                            TextDE = "Das ausgewählte System muss nur einmal umgeformt werden.",
                            TextEN = "The selected system only needs to be transformed once.",
                            ReasonDE = "Das System muss nicht umgeformt werden, um das Verfahren anwenden zu können.",
                            ReasonEN = "The system does not need to be remodelled in order to use the method.",
                            IsSolution = false
                        },
                        new(){
                            TextDE = "Die beiden anderen Systeme müssten zunächst umgeformt werden, um das Verfahren anwenden zu können.",
                            TextEN = "The other two systems would first have to be transformed in order to be able to use the method.",
                            IsSolution = true
                        },
                        new(){
                            TextDE = "Das Verfahren könnte auch direkt auf die anderen beiden Systeme angewendet werden, allerdings sind diese komplizierter.",
                            TextEN = "The method could also be applied directly to the other two systems, but these are more complicated.",
                            ReasonDE = "Das Verfahren kann nicht direkt auf die anderen Systeme angewendet werden.",
                            ReasonEN = "The method cannot be applied directly to the other systems.",
                            IsSolution = false
                        },
                        new(){
                            TextDE = "Beide Gleichungen sind bereits nach y aufgelöst. Somit kann das Verfahren direkt angewendet werden.",
                            TextEN = "Both equations are already solved for y. The method can therefore be used directly.",
                            IsSolution = true
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Beim Erklären überlegst du dir die besten Lösungswege, was deine Problemlösungsfähigkeiten stärkt.",
                AgentMessageForSelfExplanationEN = "When explaining, you think about the best solutions, which strengthens your problem-solving skills.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, erweiterst und verbesserst du deine mathematischen Fertigkeiten kontinuierlich.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will continuously expand and improve your maths skills.",
                AgentMessageForSecondSolutionDE = "Viele alltägliche Probleme erfordern grundlegende mathematische Kenntnisse, die du durch manuelles Rechnen vertiefst.",
                AgentMessageForSecondSolutionEN = "Many everyday problems require basic mathematical knowledge, which you will deepen through manual calculation.",
            };

            ExtendedMatchingExercise elimination1 = new()
            {
                Id = 2,
                Ordering = 2,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(7), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(10), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(3) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(3) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(-1) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                Method = Method.Elimination,
                AlternativeSystems = [
                    new() {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient("1/3"), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(1) }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient("1/8"), Variable = Identifier.Y }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient("1/2"), Variable = Identifier.Y },
                                new() { Coefficient = new Coefficient(-1) }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient("1/6"), Variable = Identifier.X }]
                        },
                    },
                    new() {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient("1/2"), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(6), Variable = Identifier.Y },
                                new() { Coefficient = new Coefficient("-2/5") }
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
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Elimination,
                    IsSingleChoice = false,
                    Options = new List<ExtendedOption> {
                        new(){
                            TextDE = "Egal, wie man addiert oder subtrahiert, man kann in den anderen beiden Systemen ohne eine Umformung mit dem Additionsverfahren keine Variable eliminieren.",
                            TextEN = "No matter how you add or subtract, you cannot eliminate a variable in the other two systems without a transformation using the addition method.",
                            IsSolution = true
                        },
                        new(){
                            TextDE = "Multipliziert man die zweite Gleichung mit dem Faktor 2, kann man die Variable y durch Subtrahieren der Gleichungen eliminieren.",
                            TextEN = "If you multiply the second equation by a factor of 2, you can eliminate the variable y by subtracting the equations.",
                            IsSolution = true
                        },
                        new(){
                            TextDE = "Das Verfahren könnte auch direkt auf die anderen beiden Systeme angewendet werden, allerdings sind diese komplizierter.",
                            TextEN = "The method could also be applied directly to the other two systems, but these are more complicated.",
                            ReasonDE = "Das Verfahren kann nicht direkt auf die anderen Systeme angewendet werden.",
                            ReasonEN = "The method cannot be applied directly to the other systems.",
                            IsSolution = false
                        },
                        new(){
                            TextDE = "Das gewählte System kann als einziges mit dem Additionsverfahren gelöst werden.",
                            TextEN = "The selected system is the only one that can be solved using the addition method.",
                            ReasonDE = "Die anderen Systeme können ebenfalls mit dem Verfahren gelöst werden, müssen aber zunächst umgeformt werden.",
                            ReasonEN = "The other systems can also be solved using the method, but must first be transformed.",
                            IsSolution = false
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Wenn du deine Lösungswege erklärst, erkennst du mögliche Fehler leichter und kannst sie korrigieren.",
                AgentMessageForSelfExplanationEN = "If you explain your solutions, you will recognise possible mistakes more easily and can correct them.",
                AgentMessageForFirstSolutionDE = "Computer machen manchmal Fehler oder werden falsch bedient. Wenn du regelmäßig von Hand rechnest, kannst du solche Fehler leicht erkennen und korrigieren.",
                AgentMessageForFirstSolutionEN = "Computers sometimes make mistakes or are operated incorrectly. If you regularly calculate by hand, you can easily recognise and correct such errors.",
                AgentMessageForSecondSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben.",
                AgentMessageForSecondSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks.",
            };

            ExtendedMatchingExercise substitution1 = new()
            {
                Id = 3,
                Ordering = 3,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3) },
                        new() { Coefficient = new Coefficient("5/2"), Variable = Identifier.X }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient("9/2") },
                        new() { Coefficient = new Coefficient("-3/2"), Variable = Identifier.Y }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.Second,
                SecondEquationIsIsolatedIn = IsolatedIn.First,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(0) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                Method = Method.Substitution,
                AlternativeSystems = [
                    new() {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(6) },
                                new() { Coefficient = new Coefficient(5), Variable = Identifier.X }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(9) },
                                new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                            ]
                        },
                    },
                    new() {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-5), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(13) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(-13) }]
                        },
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Substitution,
                    IsSingleChoice = false,
                    Options = new List<ExtendedOption> {
                        new(){
                            TextDE = "Das Einsetzungsverfahren kann auch direkt auf eines der beiden anderen Systeme angewendet werden, allerdings ist das System schwieriger zu lösen.",
                            TextEN = "The insertion method can also be applied directly to one of the other two systems, but the system is more difficult to solve.",
                            IsSolution = false
                        },
                        new(){
                            TextDE = "Das Einsetzungsverfahren kann auf das gewählte System direkt angewendet werden, indem man 9/2-(3/2)y in die erste Gleichung für x einsetzt.",
                            TextEN = "The substitution method can be applied directly to the selected system by substituting 9/2-(3/2)y into the first equation for x.",
                            IsSolution = true
                        },
                        new(){
                            TextDE = "Das Einsetzungsverfahren kann immer direkt angewendet werden.",
                            TextEN = "The insertion procedure can always be used directly.",
                            ReasonDE = "Das Verfahren kann nur dann angewendet werden, wenn mindestens eine der Gleichungen im System nach x oder y gelöst ist.",
                            ReasonEN = "The method can only be used if at least one of the equations in the system is solved for x or y.",
                            IsSolution = false
                        },
                        new(){
                            TextDE = "Das Einsetzungsverfahren kann auf das gewählte System direkt angewendet werden, indem man 3+(5/2)x in die zweite Gleichung für y einsetzt.",
                            TextEN = "The substitution method can be applied directly to the selected system by substituting 3+(5/2)x into the second equation for y.",
                            IsSolution = true
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Indem du Lösungen erklärst, verstehst du die Konzepte viel besser und merkst, wie alles zusammenhängt.",
                AgentMessageForSelfExplanationEN = "By explaining solutions, you understand the concepts much better and realise how everything is connected.",
                AgentMessageForFirstSolutionDE = "Durch das Rechnen von Hand verstehst du besser, wie mathematische Konzepte und Regeln zusammenhängen",
                AgentMessageForFirstSolutionEN = "By calculating by hand, you will better understand how mathematical concepts and rules are related.",
                AgentMessageForSecondSolutionDE = "Verschiedene Rechnungen von Hand auszuprobieren macht dich flexibel und anpassungsfähig bei der Lösung von Problemen.",
                AgentMessageForSecondSolutionEN = "Trying out different calculations by hand makes you flexible and adaptable when solving problems.",
            };

            ExtendedMatchingExercise equalization2 = new()
            {
                Id = 4,
                Ordering = 4,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(7) },
                        new() { Coefficient = new Coefficient(-1), Variable = Identifier.X }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(5) }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                SecondEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(1) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                Method = Method.Equalization,
                AlternativeSystems = [
                    new() {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(5) },
                                new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(4), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(11) },
                                new() { Coefficient = new Coefficient(-7), Variable = Identifier.Y }
                            ]
                        },
                    },
                    new() {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.Y },
                                new() { Coefficient = new Coefficient(4) }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(4) }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }]
                        },
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Equalization,
                    IsSingleChoice = true,
                    Options = new List<ExtendedOption> {
                        new(){
                            TextDE = "Das ausgewählte System muss durch den Faktor 2 geteilt werden, dann kann das Gleichsetzungsverfahren angewendet werden.",
                            TextEN = "The selected system must be divided by a factor of 2, then the equalization method can be applied.",
                            ReasonDE = "Das System muss nicht umgeformt werden, um das Verfahren anwenden zu können.",
                            ReasonEN = "The system does not need to be remodelled in order to use the method.",
                            IsSolution = false
                        },
                        new(){
                            TextDE = "Teilt man die anderen beiden Systeme durch den Faktor 2, hätte auch hier das Gleichsetzungsverfahren direkt angewendet werden können.",
                            TextEN = "If the other two systems are divided by a factor of 2, the equating method could also have been applied directly here.",
                            ReasonDE = "Es sind mehrere Umformungen notwendig.",
                            ReasonEN = "Several transformations are necessary.",
                            IsSolution = false
                        },
                        new(){
                            TextDE = "Die Terme 7-x und x+5 können gleichgesetzt werden.",
                            TextEN = "The terms 7-x and x+5 can be equated.",
                            IsSolution = true
                        },
                        new(){
                            TextDE = "Alle System sind direkt mit dem Gleichsetzungsverfahren lösbar.",
                            TextEN = "All systems can be solved directly using the equalization method.",
                            ReasonDE = "Die anderen beiden Systeme müssten zunächst umgeformt werden.",
                            ReasonEN = "The other two systems would first have to be remodelled.",
                            IsSolution = false
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Wenn du deine Lösungen erklärst, siehst du sofort, wo du noch Unsicherheiten hast und was du noch üben musst.",
                AgentMessageForSelfExplanationEN = "When you explain your solutions, you can immediately see where you still have uncertainties and what you still need to practise.",
                AgentMessageForFirstSolutionDE = "Verschiedene Rechnungen von Hand auszuprobieren macht dich flexibel und anpassungsfähig bei der Lösung von Problemen.",
                AgentMessageForFirstSolutionEN = "Trying out different calculations by hand makes you flexible and adaptable when solving problems.",
                AgentMessageForSecondSolutionDE = "Wenn du von Hand rechnest, wirst du unabhängiger von technischen Hilfsmitteln und kannst dich auf deine eigenen Fähigkeiten verlassen.",
                AgentMessageForSecondSolutionEN = "If you calculate by hand, you become less dependent on technical aids and can rely on your own skills.",
            };

            // Exercise 5 — Method: Substitution (x fully isolated in first equation)
            // System: x = 2y + 1,  3x − 5y = 8   →  x = 11,  y = 5
            ExtendedMatchingExercise substitution2 = new()
            {
                Id = 5,
                Ordering = 5,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(1) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(8) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(11) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(5) },
                Method = Method.Substitution,
                AlternativeSystems =
                [
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(7), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(20) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(2) }]
                        }
                    },
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-6) }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-3) }
                            ]
                        }
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Substitution,
                    IsSingleChoice = true,
                    Options = new List<ExtendedOption>
                    {
                        new()
                        {
                            TextDE = "Das Einsetzungsverfahren kann auf alle drei Systeme ohne Umformung angewendet werden.",
                            TextEN = "The substitution method can be applied to all three systems without transformation.",
                            ReasonDE = "Nur beim gewählten System ist x bereits isoliert.",
                            ReasonEN = "Only in the selected system is x already isolated.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Der Term 2y+1 kann in der zweiten Gleichung direkt für x eingesetzt werden.",
                            TextEN = "The term 2y+1 can be substituted directly for x in the second equation.",
                            IsSolution = true
                        },
                        new()
                        {
                            TextDE = "Die zweite Gleichung muss zunächst nach x aufgelöst werden, bevor das Einsetzungsverfahren angewendet werden kann.",
                            TextEN = "The second equation must first be solved for x before substitution can be applied.",
                            ReasonDE = "Das Einsetzungsverfahren kann direkt angewendet werden, da x in der ersten Gleichung bereits isoliert ist.",
                            ReasonEN = "Substitution can be applied directly because x is already isolated in the first equation.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Beide Gleichungen müssen zunächst in die Normalform gebracht werden.",
                            TextEN = "Both equations must first be brought into standard form.",
                            ReasonDE = "Da x bereits isoliert ist, sind keine zusätzlichen Umformungen notwendig.",
                            ReasonEN = "Since x is already isolated, no additional transformations are necessary.",
                            IsSolution = false
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Das Erklären hilft dir, Informationen länger zu behalten.",
                AgentMessageForSelfExplanationEN = "Explaining helps you to retain information for longer.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this."
            };

            // Exercise 6 — Method: Elimination (opposite x-coefficients: direct addition)
            // System: 4x + 5y = 23,  −4x + 3y = 1   →  x = 2,  y = 3
            ExtendedMatchingExercise elimination2 = new()
            {
                Id = 6,
                Ordering = 6,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(23) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(-4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                Method = Method.Elimination,
                AlternativeSystems =
                [
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-4) }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(15) }]
                        }
                    },
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                                new() { Coefficient = new Coefficient(3) }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(-1), Variable = Identifier.Y },
                                new() { Coefficient = new Coefficient(9) }
                            ]
                        }
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Elimination,
                    IsSingleChoice = true,
                    Options = new List<ExtendedOption>
                    {
                        new()
                        {
                            TextDE = "Die x-Koeffizienten sind entgegengesetzt gleich, daher entfällt x durch Addieren beider Gleichungen.",
                            TextEN = "The x-coefficients are equal in magnitude but opposite in sign, so x is eliminated by adding both equations.",
                            IsSolution = true
                        },
                        new()
                        {
                            TextDE = "Durch Subtrahieren der ersten von der zweiten Gleichung entfällt x.",
                            TextEN = "Subtracting the first equation from the second eliminates x.",
                            ReasonDE = "Subtrahieren ergibt −8x−2y=−22; x wird nicht eliminiert.",
                            ReasonEN = "Subtracting gives −8x−2y=−22; x is not eliminated.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Die y-Koeffizienten sind entgegengesetzt gleich, daher entfällt y durch Addieren beider Gleichungen.",
                            TextEN = "The y-coefficients are equal in magnitude but opposite in sign, so y is eliminated by adding both equations.",
                            ReasonDE = "Die y-Koeffizienten sind 5 und 3, nicht entgegengesetzt gleich.",
                            ReasonEN = "The y-coefficients are 5 and 3, not equal in magnitude with opposite signs.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Beide Gleichungen müssen zunächst umgeformt werden, bevor das Eliminationsverfahren angewendet werden kann.",
                            TextEN = "Both equations must first be transformed before elimination can be applied.",
                            ReasonDE = "Die x-Koeffizienten sind bereits entgegengesetzt, daher ist keine Umformung notwendig.",
                            ReasonEN = "The x-coefficients are already opposite, so no transformation is needed.",
                            IsSolution = false
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Wenn du deine Lösungen erklärst, siehst du sofort, wo du noch Unsicherheiten hast.",
                AgentMessageForSelfExplanationEN = "When you explain your solutions, you can immediately see where you still have uncertainties.",
                AgentMessageForFirstSolutionDE = "Durch das Rechnen von Hand verstehst du besser, wie mathematische Konzepte zusammenhängen.",
                AgentMessageForFirstSolutionEN = "By calculating by hand, you will better understand how mathematical concepts are related.",
                AgentMessageForSecondSolutionDE = "Verschiedene Rechnungen von Hand auszuprobieren macht dich flexibel und anpassungsfähig.",
                AgentMessageForSecondSolutionEN = "Trying out different calculations by hand makes you flexible and adaptable when solving problems."
            };

            // Exercise 7 — Method: Equalization (both equations solved for y)
            // System: y = 4x − 11,  y = −2x + 7   →  x = 3,  y = 1
            ExtendedMatchingExercise equalization3 = new()
            {
                Id = 7,
                Ordering = 7,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-11) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(7) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.Second,
                SecondEquationIsIsolatedIn = IsolatedIn.Second,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(3) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                Method = Method.Equalization,
                AlternativeSystems =
                [
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(5) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-1) }
                            ]
                        }
                    },
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(6), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(20) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(1) }]
                        }
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Equalization,
                    IsSingleChoice = true,
                    Options = new List<ExtendedOption>
                    {
                        new()
                        {
                            TextDE = "Beide Gleichungen sind bereits nach y aufgelöst, daher können die Ausdrücke direkt gleichgesetzt werden.",
                            TextEN = "Both equations are already solved for y, so the expressions can be equated directly.",
                            IsSolution = true
                        },
                        new()
                        {
                            TextDE = "Durch Subtrahieren der beiden Ausdrücke für y erhält man die Lösung.",
                            TextEN = "Subtracting the two expressions for y gives the solution.",
                            ReasonDE = "Man setzt die Ausdrücke gleich, man subtrahiert sie nicht.",
                            ReasonEN = "The expressions are equated, not subtracted.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Beide Gleichungen müssen zunächst nach x aufgelöst werden, bevor das Gleichsetzungsverfahren angewendet werden kann.",
                            TextEN = "Both equations must first be solved for x before equalization can be applied.",
                            ReasonDE = "Das Gleichsetzungsverfahren kann direkt angewendet werden, da beide Gleichungen bereits nach y aufgelöst sind.",
                            ReasonEN = "Equalization can be applied directly because both equations are already solved for y.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Das Gleichsetzungsverfahren erfordert, dass beide Gleichungen nach derselben Variablen ohne Koeffizient aufgelöst sind.",
                            TextEN = "Equalization requires both equations to be solved for the same variable without a coefficient.",
                            ReasonDE = "Tatsächlich sind beide Gleichungen nach y aufgelöst, daher kann das Verfahren direkt angewendet werden.",
                            ReasonEN = "Both equations are indeed solved for y, so the method can be applied directly.",
                            IsSolution = false
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Beim Erklären überlegst du dir die besten Lösungswege, was deine Problemlösungsfähigkeiten stärkt.",
                AgentMessageForSelfExplanationEN = "When explaining, you think about the best solutions, which strengthens your problem-solving skills.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, erweiterst und verbesserst du deine mathematischen Fertigkeiten.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will continuously expand and improve your maths skills.",
                AgentMessageForSecondSolutionDE = "Viele alltägliche Probleme erfordern grundlegende mathematische Kenntnisse, die du durch manuelles Rechnen vertiefst.",
                AgentMessageForSecondSolutionEN = "Many everyday problems require basic mathematical knowledge, which you will deepen through manual calculation."
            };

            // Exercise 8 — Method: Substitution (2x isolated as a block in second equation)
            // System: 2x + 3y = 16,  2x = y + 8   →  x = 5,  y = 2
            ExtendedMatchingExercise substitution3 = new()
            {
                Id = 8,
                Ordering = 8,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(16) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(8) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.FirstMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(5) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(2) },
                Method = Method.Substitution,
                AlternativeSystems =
                [
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-1) }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(5) }
                            ]
                        }
                    },
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(16) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-4), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(4) }]
                        }
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Substitution,
                    IsSingleChoice = true,
                    Options = new List<ExtendedOption>
                    {
                        new()
                        {
                            TextDE = "Der Term 2x kann in der ersten Gleichung durch y+8 ersetzt werden.",
                            TextEN = "The term 2x can be replaced with y+8 in the first equation.",
                            IsSolution = true
                        },
                        new()
                        {
                            TextDE = "Die zweite Gleichung muss zunächst nach x aufgelöst werden, bevor das Einsetzungsverfahren angewendet werden kann.",
                            TextEN = "The second equation must first be solved for x before substitution can be applied.",
                            ReasonDE = "Der Ausdruck 2x kann direkt eingesetzt werden, ohne die Gleichung nach x aufzulösen.",
                            ReasonEN = "The expression 2x can be substituted directly without solving for x.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Die erste Gleichung muss zunächst nach x aufgelöst werden, um sie dann einzusetzen.",
                            TextEN = "The first equation must first be solved for x before it can be substituted.",
                            ReasonDE = "Da 2x bereits in der zweiten Gleichung isoliert ist, kann dieser Term direkt in die erste Gleichung eingesetzt werden.",
                            ReasonEN = "Since 2x is already isolated in the second equation, this term can be substituted directly into the first.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Beide Gleichungen müssen zunächst in die Normalform gebracht werden.",
                            TextEN = "Both equations must first be brought into standard form.",
                            ReasonDE = "Das Einsetzungsverfahren kann direkt angewendet werden, ohne dass zusätzliche Umformungen notwendig sind.",
                            ReasonEN = "Substitution can be applied directly without the need for additional transformations.",
                            IsSolution = false
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Indem du Lösungen erklärst, verstehst du die Konzepte viel besser und merkst, wie alles zusammenhängt.",
                AgentMessageForSelfExplanationEN = "By explaining solutions, you understand the concepts much better and realise how everything is connected.",
                AgentMessageForFirstSolutionDE = "Durch das Rechnen von Hand verstehst du besser, wie mathematische Konzepte und Regeln zusammenhängen.",
                AgentMessageForFirstSolutionEN = "By calculating by hand, you will better understand how mathematical concepts and rules are related.",
                AgentMessageForSecondSolutionDE = "Verschiedene Rechnungen von Hand auszuprobieren macht dich flexibel und anpassungsfähig.",
                AgentMessageForSecondSolutionEN = "Trying out different calculations by hand makes you flexible and adaptable when solving problems."
            };

            // Exercise 9 — Method: Elimination (multiply one equation to cancel x)
            // System: 3x − y = 3,  6x + 2y = 18   →  x = 2,  y = 3
            ExtendedMatchingExercise elimination3 = new()
            {
                Id = 9,
                Ordering = 9,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-1), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(3) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(6), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(18) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                Method = Method.Elimination,
                AlternativeSystems =
                [
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(1), Variable = Identifier.Y },
                                new() { Coefficient = new Coefficient(1) }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(5), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(11) }]
                        }
                    },
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-3) }
                            ]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-1) }
                            ]
                        }
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Elimination,
                    IsSingleChoice = false,
                    Options = new List<ExtendedOption>
                    {
                        new()
                        {
                            TextDE = "Multipliziert man die erste Gleichung mit 2 und addiert die zweite Gleichung, entfällt die Variable y.",
                            TextEN = "Multiplying the first equation by 2 and adding the second equation eliminates y.",
                            IsSolution = true
                        },
                        new()
                        {
                            TextDE = "Durch direktes Addieren beider Gleichungen entfällt eine Variable.",
                            TextEN = "Adding both equations directly eliminates a variable.",
                            ReasonDE = "Direktes Addieren ergibt 9x+y=21; es entfällt keine Variable.",
                            ReasonEN = "Adding directly gives 9x+y=21; no variable is eliminated.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Multipliziert man die erste Gleichung mit 2 und subtrahiert die zweite Gleichung, entfällt die Variable x.",
                            TextEN = "Multiplying the first equation by 2 and subtracting the second equation eliminates x.",
                            IsSolution = true
                        },
                        new()
                        {
                            TextDE = "Durch Subtrahieren der zweiten Gleichung von der ersten entfällt x direkt.",
                            TextEN = "Subtracting the second equation from the first eliminates x directly.",
                            ReasonDE = "Das Subtrahieren ergibt −3x−3y=−15; x wird nicht eliminiert.",
                            ReasonEN = "Subtracting gives −3x−3y=−15; x is not eliminated.",
                            IsSolution = false
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Indem du verschiedene Wege erklärst, merkst du, dass es oft mehrere Lösungen für ein Problem gibt.",
                AgentMessageForSelfExplanationEN = "By explaining different ways, you realise that there are often several solutions to a problem.",
                AgentMessageForFirstSolutionDE = "Durch das Rechnen von Hand verstehst du besser, wie mathematische Konzepte und Regeln zusammenhängen.",
                AgentMessageForFirstSolutionEN = "By calculating by hand, you will better understand how mathematical concepts and rules are related.",
                AgentMessageForSecondSolutionDE = "Wenn du von Hand rechnest, wirst du unabhängiger von technischen Hilfsmitteln.",
                AgentMessageForSecondSolutionEN = "If you calculate by hand, you become less dependent on technical aids."
            };

            // Exercise 10 — Method: Equalization (both equations solved for 2y)
            // System: 2y = x + 2,  2y = 3x − 6   →  x = 4,  y = 3
            ExtendedMatchingExercise equalization4 = new()
            {
                Id = 10,
                Ordering = 10,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(2) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-6) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                SecondEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                Method = Method.Equalization,
                AlternativeSystems =
                [
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(5), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(14) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                            RightTerms =
                            [
                                new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-5) }
                            ]
                        }
                    },
                    new()
                    {
                        FirstEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(7), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(27) }]
                        },
                        SecondEquation = new LinearEquation
                        {
                            LeftTerms =
                            [
                                new() { Coefficient = new Coefficient(5), Variable = Identifier.X },
                                new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                            ],
                            RightTerms = [new() { Coefficient = new Coefficient(9) }]
                        }
                    }
                ],
                SelfExplanationTask = new ExtendedSelfExplanation()
                {
                    Method = Method.Equalization,
                    IsSingleChoice = true,
                    Options = new List<ExtendedOption>
                    {
                        new()
                        {
                            TextDE = "Beide Ausdrücke für 2y können direkt gleichgesetzt werden, da beide Gleichungen nach 2y aufgelöst sind.",
                            TextEN = "Both expressions for 2y can be equated directly, since both equations are solved for 2y.",
                            IsSolution = true
                        },
                        new()
                        {
                            TextDE = "Eine der Gleichungen muss zunächst durch 2 dividiert werden, damit das Gleichsetzungsverfahren angewendet werden kann.",
                            TextEN = "One of the equations must first be divided by 2 for equalization to be applicable.",
                            ReasonDE = "Das Gleichsetzungsverfahren kann direkt auf 2y angewendet werden, ohne die Gleichungen zunächst durch 2 zu dividieren.",
                            ReasonEN = "Equalization can be applied directly to 2y without dividing the equations by 2 first.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Durch Einsetzen von 2y aus der zweiten Gleichung in die erste erhält man die Lösung.",
                            TextEN = "Substituting 2y from the second equation into the first gives the solution.",
                            ReasonDE = "Das beschreibt das Einsetzungsverfahren, nicht das Gleichsetzungsverfahren.",
                            ReasonEN = "That describes substitution, not equalization.",
                            IsSolution = false
                        },
                        new()
                        {
                            TextDE = "Das Gleichsetzungsverfahren kann nur angewendet werden, wenn beide Gleichungen nach derselben Variablen ohne Koeffizient aufgelöst sind.",
                            TextEN = "Equalization can only be applied when both equations are solved for the same variable without a coefficient.",
                            ReasonDE = "Das Gleichsetzungsverfahren funktioniert auch, wenn beide Gleichungen nach einem Vielfachen derselben Variablen aufgelöst sind.",
                            ReasonEN = "Equalization also works when both equations are solved for a multiple of the same variable.",
                            IsSolution = false
                        }
                    }
                },
                AgentMessageForSelfExplanationDE = "Wenn du deine Lösungen erklärst, siehst du sofort, wo du noch Unsicherheiten hast.",
                AgentMessageForSelfExplanationEN = "When you explain your solutions, you can immediately see where you still have uncertainties.",
                AgentMessageForFirstSolutionDE = "Wenn du von Hand rechnest, wirst du unabhängiger von technischen Hilfsmitteln und kannst dich auf deine eigenen Fähigkeiten verlassen.",
                AgentMessageForFirstSolutionEN = "If you calculate by hand, you become less dependent on technical aids and can rely on your own skills.",
                AgentMessageForSecondSolutionDE = "Wenn du regelmäßig von Hand rechnest, lernst du, genauer zu arbeiten und auf Details zu achten.",
                AgentMessageForSecondSolutionEN = "If you regularly calculate by hand, you will learn to work more accurately and pay attention to details."
            };

            return [equalization1, elimination1, substitution1, equalization2, substitution2, elimination2, equalization3, substitution3, elimination3, equalization4];
        }
    }
}

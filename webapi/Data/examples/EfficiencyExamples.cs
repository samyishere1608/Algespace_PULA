using webapi.Models.Flexibility;
using webapi.Models.Math;

namespace webapi.Data.Examples
{
    public class EfficiencyExamples
    {
        public static List<ExtendedEfficiencyExercise> GetExamples()
        {
            ExtendedEfficiencyExercise substitution1 = new()
            {
                Id = 1,
                Ordering = 1,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(5) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(2) },
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X }
                    ],
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.Second,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(1) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                EfficientMethods = [Method.Substitution],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Substitution,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new(){
                                TextDE = "Die erste Gleichung kann in die zweite Gleichung eingesetzt werden.",
                                TextEN = "The first equation can be inserted into the second equation.",
                                ReasonDE = "Die erste Gleichung ist weder nach x noch nach y aufgelöst.",
                                ReasonEN = "The first equation is neither solved for x nor for y.",
                                IsSolution = false
                            },
                            new(){
                                TextDE = "Der Term 2+x kann für die Variable y in die erste Gleichung eingesetzt werden.",
                                TextEN = "The term 2+x can be used for the variable y in the first equation.",
                                IsSolution = true
                            },
                            new(){
                                TextDE = "y kann in die erste Gleichung für die Variable x eingesetzt werden.",
                                TextEN = "y can be inserted into the first equation for the variable x.",
                                ReasonDE = "Höchstens y-2 kann in die erste Gleichung für die Variable x eingesetzt werden.",
                                ReasonEN = "At most y-2 can be substituted into the first equation for the variable x.",
                                IsSolution = false
                            },
                            new(){
                                TextDE = "Die erste Gleichung muss zunächst nach y aufgelöst werden. Das Ergebnis kann dann in die zweite Gleichung eingesetzt werden.",
                                TextEN = "The first equation must first be solved for y. The result can then be used in the second equation.",
                                ReasonDE = "Das Einsetzungsverfahren kann direkt angewendet werden, ohne dass es zusätzliche Transformationen braucht.",
                                ReasonEN = "The insertion procedure can be used directly without the need for additional transformations.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Das Erklären hilft dir, Informationen länger zu behalten. Du merkst dir besser, was du verstehst und was du noch lernen musst.",
                AgentMessageForSelfExplanationEN = "Explaining helps you to retain information for longer. You memorise better what you understand and what you still need to learn.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this."
            };

            ExtendedEfficiencyExercise elimination1 = new()
            {
                Id = 2,
                Ordering = 2,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(-2) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(-1) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(-2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                EfficientMethods = [Method.Elimination],
                SelfExplanationTasks = [
                                new()
                    {
                        Method = Method.Elimination,
                        IsSingleChoice = false,
                        Options = new List<ExtendedOption> {
                            new(){
                                TextDE = "Durch Subtrahieren der ersten Gleichung von der zweiten Gleichung kann die Variable x eliminiert werden.",
                                TextEN = "The variable x can be eliminated by subtracting the first equation from the second equation.",
                                IsSolution = true
                            },
                            new(){
                                TextDE = "Durch Subtrahieren der ersten Gleichung von der zweiten Gleichung kann die Variable y eliminiert werden.",
                                TextEN = "The variable y can be eliminated by subtracting the first equation from the second equation.",
                                ReasonDE = "Subtrahiert man die erste von der zweiten Gleichung, bleibt 1y übrig.",
                                ReasonEN = "If you subtract the first equation from the second, you are left with 1y.",
                                IsSolution = false
                            },
                            new(){
                                TextDE = "Durch Subtrahieren der zweiten Gleichung von der ersten Gleichung kann die Variable x eliminiert werden.",
                                TextEN = "The variable x can be eliminated by subtracting the second equation from the first equation.",
                                IsSolution = true
                            },
                            new(){
                                TextDE = "Durch Addieren beider Gleichungen fällt die Variable x weg.",
                                TextEN = "Adding both equations eliminates the variable x.",
                                ReasonDE = "Durch Addieren erhält man eine Gleichung, die 6x enthält.",
                                ReasonEN = "Adding gives an equation containing 6x.",
                                IsSolution = false
                            }
                        }
                    }
                            ],
                AgentMessageForSelfExplanationDE = "Das Erklären hilft dir, Verbindungen zwischen verschiedenen Themen zu erkennen und ein tieferes Verständnis zu entwickeln.",
                AgentMessageForSelfExplanationEN = "Explaining helps you to recognise connections between different topics and develop a deeper understanding.",
                AgentMessageForFirstSolutionDE = "Computer machen manchmal Fehler oder werden falsch bedient. Wenn du regelmäßig von Hand rechnest, kannst du solche Fehler leicht erkennen und korrigieren.",
                AgentMessageForFirstSolutionEN = "Computers sometimes make mistakes or are operated incorrectly. If you regularly calculate by hand, you can easily recognise and correct such errors.",
                AgentMessageForSecondSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben.",
                AgentMessageForSecondSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks."
            };

            ExtendedEfficiencyExercise elimination2 = new()
            {
                Id = 3,
                Ordering = 3,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(-7), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(6), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(-9) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(17) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(3) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(2) },
                EfficientMethods = [Method.Elimination],
                SelfExplanationTasks = [
                                new()
                    {
                        Method = Method.Elimination,
                        IsSingleChoice = false,
                        Options = new List<ExtendedOption> {
                            new(){
                                TextDE = "Multipliziert man die erste Gleichung mit dem Faktor 2 und die zweite Gleichung mit dem Faktor 3 und subtrahiert eine Gleichung von der anderen, so entfällt die Variable y.",
                                TextEN = "If you multiply the first equation by a factor of 2 and the second equation by a factor of 3 and subtract one equation from the other, the variable y is omitted.",
                                IsSolution = true
                            },
                            new(){
                                TextDE = "Durch Subtrahieren der ersten Gleichung von der zweiten Gleichung kann die Variable y eliminiert werden.",
                                TextEN = "The variable y can be eliminated by subtracting the first equation from the second equation.",
                                ReasonDE = "Subtrahiert man die erste von der zweiten Gleichung, bleibt 2y übrig.",
                                ReasonEN = "Subtracting the first from the second equation leaves 2y.",
                                IsSolution = false
                            },
                            new(){
                                TextDE = "Durch Addieren beider Gleichungen entfällt die Variable x.",
                                TextEN = "Adding both equations eliminates the variable x.",
                                ReasonDE = "Addiert man beide Gleichungen, bleibt -4x stehen.",
                                ReasonEN = "If you add both equations together, you get -4x.",
                                IsSolution = false
                            },
                            new(){
                                TextDE = "Multipliziert man die erste Gleichung mit dem Faktor 3 und die zweite Gleichung mit dem Faktor 7 und addiert beide Gleichungen, so entfällt die Variable x.",
                                TextEN = "If you multiply the first equation by a factor of 3 and the second equation by a factor of 7 and add both equations together, the variable x is omitted.",
                                IsSolution = true
                            }
                        }
                    }
                            ],
                AgentMessageForSelfExplanationDE = "Wenn du deine Lösungen erklärst, siehst du sofort, wo du noch Unsicherheiten hast und was du noch üben musst.",
                AgentMessageForSelfExplanationEN = "When you explain your solutions, you can immediately see where you still have uncertainties and what you still need to practise.",
                AgentMessageForFirstSolutionDE = "Durch das Lösen von Gleichungen von Hand wirst du unabhängiger von Technologie.",
                AgentMessageForFirstSolutionEN = "Solving equations by hand makes you less dependent on technology.",
                AgentMessageForSecondSolutionDE = "Computer machen manchmal Fehler oder werden falsch bedient. Wenn du regelmäßig von Hand rechnest, kannst du solche Fehler leicht erkennen und korrigieren.",
                AgentMessageForSecondSolutionEN = "Computers sometimes make mistakes or are operated incorrectly. If you regularly calculate by hand, you can easily recognise and correct such errors."
            };

            ExtendedEfficiencyExercise substitution2 = new()
            {
                Id = 4,
                Ordering = 4,
                TransformationRequired = false,
                UseWithTip = true,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y, IsUnion = true }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(8) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-8) }
                    ],
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(-2) },
                EfficientMethods = [Method.Substitution],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Substitution,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new(){
                                TextDE = "Die erste Gleichung kann in die zweite Gleichung eingesetzt werden.",
                                TextEN = "The first equation can be inserted into the second equation.",
                                ReasonDE = "Die erste Gleichung ist weder nach x noch nach y aufgelöst.",
                                ReasonEN = "The first equation is neither solved for x nor for y.",
                                IsSolution = false
                            },
                            new(){
                                TextDE = "Der Term x-8 kann für die Variable y in die erste Gleichung eingesetzt werden.",
                                TextEN = "The term x-8 can be used for the variable y in the first equation.",
                                ReasonDE = "Betrachte die zweite Gleichung genau. x-8 ist nicht das selbe wie y.",
                                ReasonEN = "Look carefully at the second equation. x-8 is not the same as y.",
                                IsSolution = false
                            },
                            new(){
                                TextDE = "Der Term 2y kann in der ersten Gleichung durch x-8 ersetzt werden.",
                                TextEN = "The term 2y can be replaced with x-8 in the first equation.",
                                IsSolution = true
                            },
                            new(){
                                TextDE = "Die zweite Gleichung muss zunächst nach y gelöst werden. Das Ergebnis kann dann in die erste Gleichung eingesetzt werden.",
                                TextEN = "The second equation must first be solved for y. The result can then be inserted into the first equation.",
                                ReasonDE = "Das Einsetzungsverfahren kann direkt angewendet werden, ohne dass es zusätzliche Transformationen braucht.",
                                ReasonEN = "The insertion procedure can be used directly without the need for additional transformations.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Indem du verschiedene Wege erklärst, merkst du, dass es oft mehrere Lösungen für ein Problem gibt.",
                AgentMessageForSelfExplanationEN = "By explaining different ways, you realise that there are often several solutions to a problem.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, lernst du, genauer zu arbeiten und auf Details zu achten.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will learn to work more accurately and pay attention to details.",
                AgentMessageForSecondSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForSecondSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation."
            };

            // Exercise 5 — Substitution most efficient (y fully isolated in second equation)
            // System: 2x + 3y = 13,  y = x + 1   →  x = 2,  y = 3
            ExtendedEfficiencyExercise substitution3 = new()
            {
                Id = 5,
                Ordering = 5,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(13) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(1) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.Second,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                EfficientMethods = [Method.Substitution],
                SelfExplanationTasks =
                [
                    new()
                    {
                        Method = Method.Substitution,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption>
                        {
                            new()
                            {
                                TextDE = "Die erste Gleichung kann direkt in die zweite eingesetzt werden.",
                                TextEN = "The first equation can be inserted directly into the second.",
                                ReasonDE = "Die erste Gleichung ist weder nach x noch nach y aufgelöst.",
                                ReasonEN = "The first equation is neither solved for x nor for y.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Der Term x+1 kann in der ersten Gleichung für y eingesetzt werden.",
                                TextEN = "The term x+1 can be substituted for y in the first equation.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Die zweite Gleichung muss zunächst nach x aufgelöst werden, bevor das Einsetzungsverfahren angewendet werden kann.",
                                TextEN = "The second equation must first be solved for x before substitution can be applied.",
                                ReasonDE = "Das Einsetzungsverfahren kann direkt angewendet werden, da y bereits isoliert ist.",
                                ReasonEN = "Substitution can be applied directly because y is already isolated.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Die erste Gleichung muss zunächst nach y aufgelöst werden, um sie in die zweite einzusetzen.",
                                TextEN = "The first equation must first be solved for y to substitute it into the second.",
                                ReasonDE = "Die zweite Gleichung ist bereits nach y aufgelöst; dieser Term kann direkt eingesetzt werden.",
                                ReasonEN = "The second equation is already solved for y; that expression can be used directly.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Das Erklären hilft dir, Informationen länger zu behalten.",
                AgentMessageForSelfExplanationEN = "Explaining helps you to retain information for longer.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this."
            };

            // Exercise 6 — Elimination most efficient (opposite y-coefficients: direct addition)
            // System: 7x + 4y = 29,  3x − 4y = 1   →  x = 3,  y = 2
            ExtendedEfficiencyExercise elimination3 = new()
            {
                Id = 6,
                Ordering = 6,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(7), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(29) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-4), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(3) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(2) },
                EfficientMethods = [Method.Elimination],
                SelfExplanationTasks =
                [
                    new()
                    {
                        Method = Method.Elimination,
                        IsSingleChoice = false,
                        Options = new List<ExtendedOption>
                        {
                            new()
                            {
                                TextDE = "Durch Addieren beider Gleichungen entfällt die Variable y, da die y-Koeffizienten entgegengesetzt sind.",
                                TextEN = "Adding both equations eliminates y, because the y-coefficients have opposite signs.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Durch Subtrahieren der zweiten Gleichung von der ersten entfällt y.",
                                TextEN = "Subtracting the second equation from the first eliminates y.",
                                ReasonDE = "Durch Subtrahieren würde 4y−(−4y)=8y entstehen, y wird nicht eliminiert.",
                                ReasonEN = "Subtracting gives 4y−(−4y)=8y, so y is not eliminated.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Die y-Koeffizienten sind entgegengesetzt gleich, daher kann das Additionsverfahren direkt angewendet werden.",
                                TextEN = "The y-coefficients are equal in magnitude but opposite in sign, so elimination by addition can be applied directly.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Beide Gleichungen müssen zunächst umgeformt werden, bevor das Eliminationsverfahren angewendet werden kann.",
                                TextEN = "Both equations must first be transformed before elimination can be applied.",
                                ReasonDE = "Die Koeffizienten von y sind bereits entgegengesetzt, daher ist keine Umformung notwendig.",
                                ReasonEN = "The y-coefficients are already opposite, so no transformation is needed.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Wenn du deine Lösungen erklärst, siehst du sofort, wo du noch Unsicherheiten hast.",
                AgentMessageForSelfExplanationEN = "When you explain your solutions, you can immediately see where you still have uncertainties.",
                AgentMessageForFirstSolutionDE = "Durch das Lösen von Gleichungen von Hand wirst du unabhängiger von Technologie.",
                AgentMessageForFirstSolutionEN = "Solving equations by hand makes you less dependent on technology.",
                AgentMessageForSecondSolutionDE = "Computer machen manchmal Fehler. Wenn du regelmäßig von Hand rechnest, kannst du solche Fehler leicht erkennen.",
                AgentMessageForSecondSolutionEN = "Computers sometimes make mistakes. If you regularly calculate by hand, you can easily recognise and correct such errors."
            };

            // Exercise 7 — Elimination most efficient (multiply first equation by 2 to cancel y)
            // System: 3x + 5y = 17,  6x − 10y = 14   →  x = 4,  y = 1
            ExtendedEfficiencyExercise elimination4 = new()
            {
                Id = 7,
                Ordering = 7,
                TransformationRequired = true,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(17) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(6), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-10), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(14) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                EfficientMethods = [Method.Elimination],
                SelfExplanationTasks =
                [
                    new()
                    {
                        Method = Method.Elimination,
                        IsSingleChoice = false,
                        Options = new List<ExtendedOption>
                        {
                            new()
                            {
                                TextDE = "Multipliziert man die erste Gleichung mit dem Faktor 2 und addiert die zweite Gleichung, entfällt die Variable y.",
                                TextEN = "Multiplying the first equation by 2 and adding the second equation eliminates y.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Durch direktes Addieren beider Gleichungen entfällt eine Variable.",
                                TextEN = "Adding both equations directly eliminates a variable.",
                                ReasonDE = "Direktes Addieren ergibt 9x−5y=31; es entfällt keine Variable.",
                                ReasonEN = "Adding directly gives 9x−5y=31; no variable is eliminated.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Multipliziert man die erste Gleichung mit dem Faktor 2 und subtrahiert die zweite Gleichung, entfällt die Variable x.",
                                TextEN = "Multiplying the first equation by 2 and subtracting the second equation eliminates x.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Durch Subtrahieren der ersten von der zweiten Gleichung entfällt y direkt.",
                                TextEN = "Subtracting the first from the second equation eliminates y directly.",
                                ReasonDE = "Das Subtrahieren ergibt 3x−15y=−3; y wird nicht eliminiert.",
                                ReasonEN = "Subtracting gives 3x−15y=−3; y is not eliminated.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Erklärungen helfen dir, dein Wissen zu festigen und Lücken zu erkennen.",
                AgentMessageForSelfExplanationEN = "Explanations help you to consolidate your knowledge and identify gaps.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, erweiterst und verbesserst du deine mathematischen Fertigkeiten.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will continuously expand and improve your maths skills.",
                AgentMessageForSecondSolutionDE = "Viele alltägliche Probleme erfordern grundlegende mathematische Kenntnisse, die du durch manuelles Rechnen vertiefst.",
                AgentMessageForSecondSolutionEN = "Many everyday problems require basic mathematical knowledge, which you will deepen through manual calculation."
            };

            // Exercise 8 — Substitution most efficient (x fully isolated in first equation)
            // System: x = y + 3,  4x − 2y = 14   →  x = 4,  y = 1
            ExtendedEfficiencyExercise substitution4 = new()
            {
                Id = 8,
                Ordering = 8,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(3) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(14) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                EfficientMethods = [Method.Substitution],
                SelfExplanationTasks =
                [
                    new()
                    {
                        Method = Method.Substitution,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption>
                        {
                            new()
                            {
                                TextDE = "Der Term y+3 kann in der zweiten Gleichung direkt für x eingesetzt werden.",
                                TextEN = "The term y+3 can be substituted directly for x in the second equation.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Die zweite Gleichung muss zunächst nach x aufgelöst werden, bevor das Einsetzungsverfahren angewendet werden kann.",
                                TextEN = "The second equation must first be solved for x before substitution can be applied.",
                                ReasonDE = "Das Einsetzungsverfahren kann direkt angewendet werden, da x bereits in der ersten Gleichung isoliert ist.",
                                ReasonEN = "Substitution can be applied directly because x is already isolated in the first equation.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "x kann für den Term y+3 in die zweite Gleichung eingesetzt werden.",
                                TextEN = "x can be substituted for the term y+3 into the second equation.",
                                ReasonDE = "Die Richtung der Substitution ist falsch; y+3 wird für x eingesetzt, nicht umgekehrt.",
                                ReasonEN = "The direction of substitution is wrong; y+3 is substituted for x, not the other way around.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Beide Gleichungen müssen zunächst umgeformt werden, damit das Einsetzungsverfahren angewendet werden kann.",
                                TextEN = "Both equations must first be rearranged for substitution to be applicable.",
                                ReasonDE = "Da x bereits in der ersten Gleichung isoliert ist, sind keine zusätzlichen Umformungen notwendig.",
                                ReasonEN = "Since x is already isolated in the first equation, no additional transformations are necessary.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Indem du Lösungen erklärst, verstehst du die Konzepte viel besser.",
                AgentMessageForSelfExplanationEN = "By explaining solutions, you understand the concepts much better.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, lernst du, genauer zu arbeiten und auf Details zu achten.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will learn to work more accurately and pay attention to details.",
                AgentMessageForSecondSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForSecondSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation."
            };

            // Exercise 9 — Elimination most efficient (multiply both equations to cancel x)
            // System: 5x + 6y = 28,  10x − 3y = 11   →  x = 2,  y = 3
            ExtendedEfficiencyExercise elimination5 = new()
            {
                Id = 9,
                Ordering = 9,
                TransformationRequired = true,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(6), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(28) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(10), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(11) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                EfficientMethods = [Method.Elimination],
                SelfExplanationTasks =
                [
                    new()
                    {
                        Method = Method.Elimination,
                        IsSingleChoice = false,
                        Options = new List<ExtendedOption>
                        {
                            new()
                            {
                                TextDE = "Multipliziert man die erste Gleichung mit 2 und subtrahiert die zweite Gleichung, entfällt die Variable x.",
                                TextEN = "Multiplying the first equation by 2 and subtracting the second equation eliminates x.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Durch direktes Addieren beider Gleichungen entfällt eine Variable.",
                                TextEN = "Adding both equations directly eliminates a variable.",
                                ReasonDE = "Direktes Addieren ergibt 15x+3y=39; es entfällt keine Variable.",
                                ReasonEN = "Adding directly gives 15x+3y=39; no variable is eliminated.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Multipliziert man die zweite Gleichung mit 2 und addiert die erste Gleichung, entfällt die Variable y.",
                                TextEN = "Multiplying the second equation by 2 and adding the first equation eliminates y.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Durch Subtrahieren der ersten Gleichung von der zweiten entfällt x direkt.",
                                TextEN = "Subtracting the first equation from the second eliminates x directly.",
                                ReasonDE = "Das Subtrahieren ergibt 5x−9y=−17; x wird nicht eliminiert.",
                                ReasonEN = "Subtracting gives 5x−9y=−17; x is not eliminated.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Wenn du deine Lösungen erklärst, siehst du sofort, wo du noch Unsicherheiten hast.",
                AgentMessageForSelfExplanationEN = "When you explain your solutions, you can immediately see where you still have uncertainties.",
                AgentMessageForFirstSolutionDE = "Durch das Lösen von Gleichungen von Hand wirst du unabhängiger von Technologie.",
                AgentMessageForFirstSolutionEN = "Solving equations by hand makes you less dependent on technology.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this."
            };

            // Exercise 10 — Substitution most efficient (2y isolated as a block in second equation)
            // System: 4x − 2y = 6,  2y = 2x + 2   →  x = 4,  y = 5
            ExtendedEfficiencyExercise substitution5 = new()
            {
                Id = 10,
                Ordering = 10,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(6) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(2) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(5) },
                EfficientMethods = [Method.Substitution],
                SelfExplanationTasks =
                [
                    new()
                    {
                        Method = Method.Substitution,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption>
                        {
                            new()
                            {
                                TextDE = "Der Term 2y kann in der ersten Gleichung durch 2x+2 ersetzt werden.",
                                TextEN = "The term 2y can be replaced with 2x+2 in the first equation.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Die erste Gleichung kann direkt in die zweite Gleichung eingesetzt werden.",
                                TextEN = "The first equation can be inserted directly into the second equation.",
                                ReasonDE = "Die erste Gleichung ist weder nach x noch nach y aufgelöst.",
                                ReasonEN = "The first equation is neither solved for x nor for y.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Die zweite Gleichung muss zunächst nach y aufgelöst werden, bevor das Einsetzungsverfahren angewendet werden kann.",
                                TextEN = "The second equation must first be solved for y before substitution can be applied.",
                                ReasonDE = "Der Term 2y kann direkt in die erste Gleichung eingesetzt werden, ohne die zweite Gleichung erst nach y aufzulösen.",
                                ReasonEN = "The term 2y can be substituted directly into the first equation without first solving the second for y.",
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
                    }
                ],
                AgentMessageForSelfExplanationDE = "Indem du verschiedene Wege erklärst, merkst du, dass es oft mehrere Lösungen für ein Problem gibt.",
                AgentMessageForSelfExplanationEN = "By explaining different ways, you realise that there are often several solutions to a problem.",
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, lernst du, genauer zu arbeiten und auf Details zu achten.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will learn to work more accurately and pay attention to details.",
                AgentMessageForSecondSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForSecondSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation."
            };

            ExtendedEfficiencyExercise substitution6 = new()
            {
                Id = 11,
                Ordering = 11,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(25) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-2) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.Second,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(3) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(4) },
                EfficientMethods = [Method.Substitution],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Substitution,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new()
                            {
                                TextDE = "Die zweite Gleichung ist bereits nach y aufgelöst, also kann der Term 2x-2 direkt in die erste Gleichung eingesetzt werden.",
                                TextEN = "The second equation is already solved for y, so the term 2x-2 can be substituted directly into the first equation.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Beide Gleichungen müssen zunächst in die Normalform gebracht werden.",
                                TextEN = "Both equations must first be brought into standard form.",
                                ReasonDE = "Die zweite Gleichung ist bereits nach y aufgelöst; eine Umformung ist nicht nötig.",
                                ReasonEN = "The second equation is already solved for y; no transformation is needed.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Die erste Gleichung muss zunächst nach x aufgelöst werden, bevor man einsetzen kann.",
                                TextEN = "The first equation must first be solved for x before substituting.",
                                ReasonDE = "Die zweite Gleichung ist bereits nach y aufgelöst und kann so eingesetzt werden, wie sie dasteht.",
                                ReasonEN = "The second equation is already solved for y and can be substituted exactly as it stands.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Das Gleichsetzungsverfahren ist hier am direktesten, weil y schon freigestellt ist.",
                                TextEN = "The equalization method is the most direct here because y is already on its own.",
                                ReasonDE = "Die erste Gleichung ist nicht nach y aufgelöst, sie müsste erst umgeformt werden.",
                                ReasonEN = "The first equation is not solved for y and would have to be rearranged.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Erkennst du, dass eine Variable schon freigestellt ist, sparst du dir eine ganze Umformung.",
                AgentMessageForSelfExplanationEN = "Recognising that a variable is already on its own saves you a whole rearrangement.",
                AgentMessageForFirstSolutionDE = "Gleichungen geschickt umzustellen ist oft der halbe Weg zum Ziel.",
                AgentMessageForFirstSolutionEN = "Rearranging an equation cleverly is often half the way to the answer.",
                AgentMessageForSecondSolutionDE = "In Prüfungen musst du oft verschiedene Ansätze kennen. Der Vergleich bereitet dich darauf vor.",
                AgentMessageForSecondSolutionEN = "In exams you often need to know different approaches. Comparing them prepares you."
            };

            ExtendedEfficiencyExercise elimination6 = new()
            {
                Id = 12,
                Ordering = 12,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(25) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(-5), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(10) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(5) },
                EfficientMethods = [Method.Elimination],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Elimination,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new()
                            {
                                TextDE = "Addiert man beide Gleichungen, fällt x weg, weil 5 und -5 sich aufheben.",
                                TextEN = "Adding both equations removes x, because 5 and -5 cancel each other out.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Die zweite Gleichung muss zunächst nach x aufgelöst werden, bevor man einsetzen kann.",
                                TextEN = "The second equation must first be solved for x before substituting.",
                                ReasonDE = "Das Additionsverfahren ist ohne jede Umformung anwendbar.",
                                ReasonEN = "The addition method can be applied without any transformation.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Beide Gleichungen sind bereits nach y aufgelöst und können gleichgesetzt werden.",
                                TextEN = "Both equations are already solved for y and can be equated.",
                                ReasonDE = "In der ersten steht 3y, in der zweiten 4y; keine ist nach y aufgelöst.",
                                ReasonEN = "The first has 3y and the second 4y; neither is solved for y.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Die erste Gleichung muss mit 2 multipliziert werden, um y zu entfernen.",
                                TextEN = "The first equation must be multiplied by 2 to remove y.",
                                ReasonDE = "Addieren entfernt bereits x; eine Multiplikation ist nicht nötig.",
                                ReasonEN = "Adding already removes x; no multiplication is needed.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Gleiche Koeffizienten mit verschiedenem Vorzeichen sind das klarste Signal für das Additionsverfahren.",
                AgentMessageForSelfExplanationEN = "Equal coefficients with opposite signs are the clearest signal for the addition method.",
                AgentMessageForFirstSolutionDE = "Erkennst du das Muster, brauchst du keinen einzigen Zwischenschritt.",
                AgentMessageForFirstSolutionEN = "Once you spot the pattern you need not a single intermediate step.",
                AgentMessageForSecondSolutionDE = "Manuelles Rechnen macht dich schneller und sicherer im Erkennen solcher Muster.",
                AgentMessageForSecondSolutionEN = "Working by hand makes you faster and surer at spotting patterns like this."
            };

            ExtendedEfficiencyExercise equalization1 = new()
            {
                Id = 13,
                Ordering = 13,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-10) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(-1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(6) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.Second,
                SecondEquationIsIsolatedIn = IsolatedIn.Second,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(2) },
                EfficientMethods = [Method.Equalization],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Equalization,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new()
                            {
                                TextDE = "Beide Gleichungen sind bereits nach y aufgelöst, also können die Terme direkt gleichgesetzt werden.",
                                TextEN = "Both equations are already solved for y, so the terms can be equated directly.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Die zweite Gleichung muss zunächst nach y aufgelöst werden.",
                                TextEN = "The second equation must first be solved for y.",
                                ReasonDE = "Die zweite Gleichung ist bereits nach y aufgelöst.",
                                ReasonEN = "The second equation is already solved for y.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Das Subtrahieren der ersten von der zweiten Gleichung entfernt y.",
                                TextEN = "Subtracting the first equation from the second removes y.",
                                ReasonDE = "Beim Subtrahieren bleibt -4x + 16 stehen; y fällt zwar weg, dafür war aber keine Umformung nötig.",
                                ReasonEN = "Subtracting leaves -4x + 16; y does drop out, but no transformation was needed for that.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Die erste Gleichung muss zunächst nach x aufgelöst werden, bevor das Verfahren angewendet werden kann.",
                                TextEN = "The first equation must first be solved for x before the method can be applied.",
                                ReasonDE = "Sie ist nach y aufgelöst, und genau das braucht das Gleichsetzen.",
                                ReasonEN = "It is solved for y, which is exactly what equating needs.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Stehen beide Gleichungen schon nach derselben Variablen da, ist Gleichsetzen der kürzeste Weg.",
                AgentMessageForSelfExplanationEN = "When both equations already stand solved for the same variable, equating them is the shortest route.",
                AgentMessageForFirstSolutionDE = "Ein Blick auf die Form spart dir oft mehrere Rechenschritte.",
                AgentMessageForFirstSolutionEN = "A glance at the shape often saves you several steps of working.",
                AgentMessageForSecondSolutionDE = "Verschiedene Wege zu kennen macht dich beim Lösen von Aufgaben flexibler.",
                AgentMessageForSecondSolutionEN = "Knowing several routes makes you more flexible at solving problems."
            };

            ExtendedEfficiencyExercise elimination7 = new()
            {
                Id = 14,
                Ordering = 14,
                TransformationRequired = true,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(17) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(6), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(0) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(1) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(3) },
                EfficientMethods = [Method.Elimination],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Elimination,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new()
                            {
                                TextDE = "Multipliziert man die erste Gleichung mit 3, steht in beiden 6x; durch Subtrahieren wird x entfernt.",
                                TextEN = "Multiplying the first equation by 3 gives 6x in both; subtracting removes x.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Das Einsetzungsverfahren geht hier ohne jede Umformung.",
                                TextEN = "The substitution method works here without any transformation.",
                                ReasonDE = "Keine der beiden Gleichungen ist nach einer Variablen aufgelöst.",
                                ReasonEN = "Neither equation is solved for a variable.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Addiert man beide Gleichungen, fällt y weg.",
                                TextEN = "Adding both equations removes y.",
                                ReasonDE = "Addiert erhält man 8x + 3y = 17; keine Variable fällt weg.",
                                ReasonEN = "Adding gives 8x + 3y = 17; no variable drops out.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Eine einzige Multiplikation genügt nicht, es müssen beide Gleichungen multipliziert werden.",
                                TextEN = "A single multiplication is not enough; both equations must be multiplied.",
                                ReasonDE = "Multipliziert man nur die erste Gleichung mit 3, sind die Koeffizienten von x bereits gleich.",
                                ReasonEN = "Multiplying only the first equation by 3 already lines up the coefficients of x.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Eine einzige Multiplikation macht aus zwei Gleichungen ein direkt lösbares Additionsverfahren.",
                AgentMessageForSelfExplanationEN = "A single multiplication turns the two equations into an addition step you can solve directly.",
                AgentMessageForFirstSolutionDE = "Erst schauen, welcher Faktor die Koeffizienten angleicht, dann rechnen.",
                AgentMessageForFirstSolutionEN = "First see which factor lines the coefficients up, then calculate.",
                AgentMessageForSecondSolutionDE = "Wer die Struktur erkennt, spart Zeit und vermeidet Flüchtigkeitsfehler.",
                AgentMessageForSecondSolutionEN = "Seeing the structure saves time and avoids careless mistakes."
            };

            ExtendedEfficiencyExercise substitution7 = new()
            {
                Id = 15,
                Ordering = 15,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-1) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(19) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(5) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(2) },
                EfficientMethods = [Method.Substitution],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Substitution,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new()
                            {
                                TextDE = "Der Term x-1 steht bereits für 2y und passt deshalb direkt auf die 2y in der zweiten Gleichung.",
                                TextEN = "The term x-1 already stands for 2y and therefore matches the 2y in the second equation directly.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Die erste Gleichung muss erst nach y aufgelöst werden, weil dort 2y steht.",
                                TextEN = "The first equation must first be solved for y because it contains 2y.",
                                ReasonDE = "Der Term x-1 steht für 2y und passt genau auf die 2y in der zweiten Gleichung.",
                                ReasonEN = "The term x-1 stands for 2y and matches the 2y in the second equation exactly.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Durch Addieren der beiden Gleichungen lässt sich y direkt entfernen.",
                                TextEN = "Adding the two equations removes y directly.",
                                ReasonDE = "In beiden Gleichungen steht 2y; addiert bleibt 4y stehen.",
                                ReasonEN = "Both equations contain 2y; adding leaves 4y in place.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Beide Gleichungen sind nach x aufgelöst und können gleichgesetzt werden.",
                                TextEN = "Both equations are solved for x and can be equated.",
                                ReasonDE = "Nur die erste Gleichung stellt einen Term für sich allein; die zweite ist das nicht.",
                                ReasonEN = "Only the first equation isolates a term; the second does not.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Steht auf beiden Seiten dasselbe Vielfache einer Variablen, kannst du den ganzen Term austauschen.",
                AgentMessageForSelfExplanationEN = "When the same multiple of a variable appears on both sides, you can swap the whole term.",
                AgentMessageForFirstSolutionDE = "Auch ein Koeffizient ungleich 1 ist kein Hindernis, wenn der passende Term schon dasteht.",
                AgentMessageForFirstSolutionEN = "A coefficient other than 1 is no obstacle when the matching term is already there.",
                AgentMessageForSecondSolutionDE = "Genau hinzuschauen lohnt sich: oft passt der Term, ohne dass du umformen musst.",
                AgentMessageForSecondSolutionEN = "It pays to look closely: often the term fits without any rearrangement."
            };

            ExtendedEfficiencyExercise elimination8 = new()
            {
                Id = 16,
                Ordering = 16,
                TransformationRequired = true,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(18) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(19) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(3) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(2) },
                EfficientMethods = [Method.Elimination],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Elimination,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new()
                            {
                                TextDE = "Multipliziert man die erste mit 3 und die zweite mit 4, steht in beiden 12x; Subtrahieren entfernt x.",
                                TextEN = "Multiplying the first by 3 and the second by 4 gives 12x in both; subtracting removes x.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Addiert man beide Gleichungen, fällt eine Variable weg.",
                                TextEN = "Adding both equations removes one variable.",
                                ReasonDE = "Addiert erhält man 7x + 8y = 37; keine Variable fällt weg.",
                                ReasonEN = "Adding gives 7x + 8y = 37; no variable drops out.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Das Einsetzungsverfahren ist hier ohne Umformung anwendbar.",
                                TextEN = "The substitution method can be applied here without any transformation.",
                                ReasonDE = "Keine Gleichung ist nach einer Variablen aufgelöst.",
                                ReasonEN = "No equation is solved for a variable.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Eine einzige Multiplikation genügt, um die Koeffizienten anzugleichen.",
                                TextEN = "A single multiplication is enough to line up the coefficients.",
                                ReasonDE = "Die Koeffizienten sind 4 und 3 sowie 3 und 5; es braucht zwei Multiplikationen.",
                                ReasonEN = "The coefficients are 4 and 3, and 3 and 5; two multiplications are needed.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Zwei Multiplikationen sind kein Umweg, sondern der schnellste Weg zu einer Gleichung mit einer Variablen.",
                AgentMessageForSelfExplanationEN = "Two multiplications are not a detour, they are the fastest way to an equation with one variable.",
                AgentMessageForFirstSolutionDE = "Systematisch den kleinsten gemeinsamen Faktor suchen, dann geht es zügig.",
                AgentMessageForFirstSolutionEN = "Look systematically for the smallest common factor and it goes quickly.",
                AgentMessageForSecondSolutionDE = "Solche Aufgaben schulen den Blick für Strukturen, die in Prüfungen Zeit sparen.",
                AgentMessageForSecondSolutionEN = "Tasks like this train your eye for structure, which saves time in exams."
            };

            ExtendedEfficiencyExercise substitution8 = new()
            {
                Id = 17,
                Ordering = 17,
                TransformationRequired = false,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3) },
                        new() { Coefficient = new Coefficient(-1), Variable = Identifier.Y }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(8) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(-1) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(4) },
                EfficientMethods = [Method.Substitution],
                SelfExplanationTasks = [
                    new()
                    {
                        Method = Method.Substitution,
                        IsSingleChoice = true,
                        Options = new List<ExtendedOption> {
                            new()
                            {
                                TextDE = "Die erste Gleichung ist bereits nach x aufgelöst, also kann der Term 3-y direkt in die zweite Gleichung eingesetzt werden.",
                                TextEN = "The first equation is already solved for x, so the term 3-y can be substituted directly into the second equation.",
                                IsSolution = true
                            },
                            new()
                            {
                                TextDE = "Die erste Gleichung muss zuerst nach y aufgelöst werden.",
                                TextEN = "The first equation must first be solved for y.",
                                ReasonDE = "Sie ist nach x aufgelöst, und genau das braucht das Einsetzen.",
                                ReasonEN = "It is solved for x, which is exactly what substituting needs.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Subtrahiert man die zweite von der ersten Gleichung, fällt eine Variable weg.",
                                TextEN = "Subtracting the second equation from the first removes a variable.",
                                ReasonDE = "Subtrahiert erhält man -3x - 2y = -5; keine Variable fällt weg.",
                                ReasonEN = "Subtracting gives -3x - 2y = -5; no variable drops out.",
                                IsSolution = false
                            },
                            new()
                            {
                                TextDE = "Ein negatives Ergebnis kann bei dieser Aufgabe nicht herauskommen.",
                                TextEN = "A negative result cannot come out of this task.",
                                ReasonDE = "Setzt man ein, erhält man y = 4 und x = -1; ein negatives Ergebnis ist also möglich.",
                                ReasonEN = "Substituting gives y = 4 and x = -1, so a negative result is possible.",
                                IsSolution = false
                            }
                        }
                    }
                ],
                AgentMessageForSelfExplanationDE = "Ein negatives Ergebnis ist kein Fehler. Es zeigt nur, wo der Punkt auf der Zahlengeraden liegt.",
                AgentMessageForSelfExplanationEN = "A negative result is not a mistake. It only shows where the point sits on the number line.",
                AgentMessageForFirstSolutionDE = "Ein freigestellter Term ist immer eine Einladung zum Einsetzen, auch mit Minus.",
                AgentMessageForFirstSolutionEN = "A term on its own is always an invitation to substitute, minus sign or not.",
                AgentMessageForSecondSolutionDE = "Wer mit negativen Zahlen sicher umgeht, lässt sich davon nicht aus dem Konzept bringen.",
                AgentMessageForSecondSolutionEN = "Being confident with negative numbers keeps you from losing your thread."
            };

            return [substitution1, elimination1, elimination2, substitution2, substitution3, elimination3, elimination4, substitution4, elimination5, substitution5, substitution6, elimination6, equalization1, elimination7, substitution7, elimination8, substitution8];
        }
    }
}

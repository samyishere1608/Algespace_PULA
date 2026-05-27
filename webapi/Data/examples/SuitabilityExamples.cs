using webapi.Models.Flexibility;
using webapi.Models.Math;

namespace webapi.Data.Examples
{
    public class SuitabilityExamples
    {
        public static List<ExtendedSuitabilityExercise> GetExamples()
        {
            ExtendedSuitabilityExercise equalization1 = new()
            {
                Id = 1,
                Ordering = 1,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-10) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(-4), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(32) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.First,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(7) },
                SuitableMethods = [Method.Equalization, Method.Substitution],
                ComparisonMethods = [new() {
                    Method = Method.Elimination,
                    Steps = [
                        new(){},
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat die erste Gleichung von der zweiten Gleichung subtrahiert, um x zu eliminieren und y zu bestimmen.",
                            DescriptionEN = "Your classmate has subtracted the first equation from the second equation to eliminate x and determine y.",
                            Equations = [
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(0) }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-4), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(32) },
                                        new() { Coefficient = new Coefficient(-1), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(-10), Parenthesis = Parenthesis.RightSmall}
                                    ],
                                },
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(0) }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-4), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(32) },
                                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(10) }
                                    ],
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(7) }]
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Um x zu berechnen, hat dein*e Mitschüler*in die Lösung für y in die erste Gleichung des LGS eingesetzt.",
                            DescriptionEN = "To calculate x, your classmate has substituted the solution for y into the first equation of the LSE.",
                            Equations = [
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(-10) }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(2) },
                                        new() { Coefficient = new Coefficient(7), IsMultiplication = true },
                                        new() { Coefficient = new Coefficient(-10) }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(4) }]
                                }
                            ]
                        },
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this.",
                AgentMessageForComparisonDE = "In Prüfungen musst du oft verschiedene Ansätze kennen. Der Vergleich verschiedener Methoden bereitet dich optimal darauf vor.",
                AgentMessageForComparisonEN = "In exams, you often need to know different approaches. Comparing different methods prepares you optimally for this.",
                AgentMessageForResolvingDE = "Verschiedene Methoden auszuprobieren zeigt dir, dass es oft mehrere Wege gibt, ein Problem zu lösen.",
                AgentMessageForResolvingEN = "Trying out different methods shows you that there are often several ways to solve a problem."
            };


            ExtendedSuitabilityExercise elimination1 = new()
            {
                Id = 2,
                Ordering = 2,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(-2) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(7) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(1) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(-1) },
                SuitableMethods = [Method.Elimination],
                ComparisonMethods = [new() {
                    Method = Method.Equalization,
                    Steps = [
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat zuerst beide Gleichungen nach x aufgelöst.",
                            DescriptionEN = "Your classmate first solved both equations for x.",
                            Equations = [
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-2) },
                                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                                    ],
                                },
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("7/4") },
                                        new() { Coefficient = new Coefficient("3/4"), Variable = Identifier.Y }
                                    ],
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Durch Gleichsetzen dieser Gleichungen hat dein*e Mitschüler*in y berechnet.",
                            DescriptionEN = "By equating these equations, your classmate has calculated y.",
                            Equations = [
                                new() {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-2) },
                                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                                    ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("7/4") },
                                        new() { Coefficient = new Coefficient("3/4"), Variable = Identifier.Y }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(-1) }]
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat y in die erste umgeformte Gleichung eingesetzt, um x zu bestimmen.",
                            DescriptionEN = "Your classmate has substituted y into the first transformed equation to determine x.",
                            Equations = [
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-2) },
                                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                                    ],
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-2) },
                                        new() { Coefficient = new Coefficient(-3), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient(-1), Parenthesis = Parenthesis.RightSmall }
                                    ],
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                                }
                            ]
                        },
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Verschiedene Rechnungen von Hand auszuprobieren macht dich flexibel und anpassungsfähig bei der Lösung von Problemen.",
                AgentMessageForFirstSolutionEN = "Trying out different calculations by hand makes you flexible and adaptable when solving problems.",
                AgentMessageForSecondSolutionDE = "Wenn du von Hand rechnest, wirst du unabhängiger von technischen Hilfsmitteln und kannst dich auf deine eigenen Fähigkeiten verlassen.",
                AgentMessageForSecondSolutionEN = "If you calculate by hand, you become less dependent on technical aids and can rely on your own skills.",
                AgentMessageForComparisonDE = "Jede Methode hat ihre Vor- und Nachteile. Durch den Vergleich lernst du, wann welche Methode am besten eingesetzt wird.",
                AgentMessageForComparisonEN = "Each method has its advantages and disadvantages. By comparing them, you will learn which method is best used when.",
                AgentMessageForResolvingDE = "Eine alternative Methode kann schneller und effizienter sein. Durch das Üben verschiedener Ansätze findest du die Methode, die am besten zu dir passt.",
                AgentMessageForResolvingEN = "An alternative method can be faster and more efficient. By practising different approaches, you will find the method that suits you best."
            };

            ExtendedSuitabilityExercise substitution1 = new()
            {
                Id = 3,
                Ordering = 3,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(2) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(6), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.X }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(-34) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.Second,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(-2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(-4) },
                SuitableMethods = [Method.Substitution],
                ComparisonMethods = [new() {
                    Method = Method.Equalization,
                    Steps = [
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat die zweite Gleichung ebenfalls nach y aufgelöst.",
                            DescriptionEN = "Your classmate has also solved the second equation for y.",
                            Equations = [
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("-17/3") },
                                        new() { Coefficient = new Coefficient("5/6"), Variable = Identifier.X }
                                    ],
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Durch Gleichsetzen dieser Gleichungen konnte dein*e Mitschüler*in x berechnen.",
                            DescriptionEN = "By equating these equations, your classmate was able to calculate x.",
                            Equations = [
                                new() {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(2) }
                                    ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("-17/3") },
                                        new() { Coefficient = new Coefficient("5/6"), Variable = Identifier.X }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(-2) }]
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat x in die erste Gleichung eingesetzt, um y zu bestimmen.",
                            DescriptionEN = "Your classmate has substituted x into the first equation to determine y.",
                            Equations = [
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(2) }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient(-2), Parenthesis = Parenthesis.RightSmall },
                                        new() { Coefficient = new Coefficient(2) }
                                    ],
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(-4) }]
                                }
                            ]
                        },
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, lernst du, genauer zu arbeiten und auf Details zu achten.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will learn to work more accurately and pay attention to details.",
                AgentMessageForSecondSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForSecondSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation.",
                AgentMessageForComparisonDE = "Durch den Vergleich lernst du, welche Methoden schneller oder einfacher sind. Das hilft dir, effizienter zu arbeiten und deine Zeit besser zu nutzen.",
                AgentMessageForComparisonEN = "By comparing them, you will learn which methods are faster or easier. This helps you to work more efficiently and make better use of your time.",
                AgentMessageForResolvingDE = "Durch das Ausprobieren einer anderen Methode entdeckst du neue Wege, das Problem zu lösen. Dadurch findest heraus, welche Methode am schnellsten oder einfachsten ist, was dir hilft, effizienter zu arbeiten.",
                AgentMessageForResolvingEN = "By trying out a different method, you discover new ways to solve the problem. This will help you to find out which method is quickest or easiest, which will help you to work more efficiently."
            };

            ExtendedSuitabilityExercise equalization2 = new()
            {
                Id = 4,
                Ordering = 4,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient("-3/4"), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(5) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-6) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.First,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(4) },
                SuitableMethods = [Method.Substitution, Method.Equalization],
                ComparisonMethods = [
                    new() {
                        Method = Method.Substitution,
                        Steps = [
                            new(){},
                            new() {
                                DescriptionDE = "Dein*e Mitschüler*in hat den Term in der zweiten Gleichung in die erste Gleichung eingesetzt, um y zu berechnen.",
                                DescriptionEN = "Your classmate has substituted the term in the second equation into the first equation to calculate y.",
                                Equations = [
                                    new() {
                                        LeftTerms =
                                        [
                                            new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                                            new() { Coefficient = new Coefficient(-6) }
                                        ],
                                        RightTerms =
                                        [
                                            new() { Coefficient = new Coefficient("-3/4"), Variable = Identifier.Y },
                                            new() { Coefficient = new Coefficient(5) }
                                        ]
                                    },
                                    new() {
                                        LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                        RightTerms = [new() { Coefficient = new Coefficient(4) }]
                                    }
                                ]
                            },
                            new() {
                                DescriptionDE = "Dein*e Mitschüler*in hat y in die zweite Gleichung eingesetzt, um x zu bestimmen.",
                                DescriptionEN = "Your classmate has substituted y into the second equation to determine x.",
                                Equations = [
                                    new() {
                                        LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                        RightTerms =
                                        [
                                            new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                                            new() { Coefficient = new Coefficient(-6) }
                                        ]
                                    },
                                    new() {
                                        LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                        RightTerms =
                                        [
                                            new() { Coefficient = new Coefficient(2) },
                                            new() { Coefficient = new Coefficient(4), IsMultiplication = true },
                                            new() { Coefficient = new Coefficient(-6) }
                                        ],
                                    },
                                    new() {
                                        LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                        RightTerms = [new() { Coefficient = new Coefficient(2) }]
                                    }
                                ]
                            },
                        ]
                    },
                    new() {
                        Method = Method.Equalization,
                        Steps = [
                            new(){},
                            new() {
                                DescriptionDE = "Dein*e Mitschüler*in hat beide Ausdrücke gleichgesetzt, um y zu berechnen.",
                                DescriptionEN = "Your classmate has equated both expressions to calculate y.",
                                Equations = [
                                    new() {
                                        LeftTerms =
                                        [
                                            new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y },
                                            new() { Coefficient = new Coefficient(-6) }
                                        ],
                                        RightTerms =
                                        [
                                            new() { Coefficient = new Coefficient("-3/4"), Variable = Identifier.Y },
                                            new() { Coefficient = new Coefficient(5) }
                                        ]
                                    },
                                    new() {
                                        LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                        RightTerms = [new() { Coefficient = new Coefficient(4) }]
                                    }
                                ]
                            },
                            new() {
                                DescriptionDE = "Dein*e Mitschüler*in hat y in die zweite Gleichung eingesetzt, um x zu bestimmen.",
                                DescriptionEN = "Your classmate has substituted y into the second equation to determine x.",
                                Equations = [
                                    new() {
                                        LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                        RightTerms =
                                        [
                                            new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                                            new() { Coefficient = new Coefficient(-6) }
                                        ]
                                    },
                                    new() {
                                        LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                        RightTerms =
                                        [
                                            new() { Coefficient = new Coefficient(2) },
                                            new() { Coefficient = new Coefficient(4), IsMultiplication = true },
                                            new() { Coefficient = new Coefficient(-6) }
                                        ],
                                    },
                                    new() {
                                        LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                        RightTerms = [new() { Coefficient = new Coefficient(2) }]
                                    }
                                ]
                            },
                        ]
                    }
                ],
                AgentMessageForFirstSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForFirstSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this.",
                AgentMessageForSecondSolutionDE = "Wenn du von Hand rechnest, verstehst du die einzelnen Schritte besser und kannst Fehler schneller erkennen und korrigieren.",
                AgentMessageForSecondSolutionEN = "If you calculate by hand, you understand the individual steps better and can recognise and correct errors more quickly.",
                AgentMessageForComparisonDE = "Der Vergleich zeigt dir, wie unterschiedliche Ansätze zum selben Ergebnis führen können. Das erweitert dein Verständnis und zeigt dir neue Sichtweisen.",
                AgentMessageForComparisonEN = "The comparison shows you how different approaches can lead to the same result. This broadens your understanding and shows you new perspectives.",
                AgentMessageForResolvingDE = "Wenn du verschiedene Methoden beherrschst, kannst du flexibel auf unterschiedliche Probleme reagieren.",
                AgentMessageForResolvingEN = "If you master different methods, you can react flexibly to different problems."
            };

            ExtendedSuitabilityExercise elimination2 = new()
            {
                Id = 5,
                Ordering = 5,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(9), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(-4) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient("1/2") },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient("-1/3") },
                SuitableMethods = [Method.Elimination],
                ComparisonMethods = [new() {
                    Method = Method.Equalization,
                    Steps = [
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat zunächst beide Gleichungen nach x aufgelöst.",
                            DescriptionEN = "Your classmate first solved both equations for x.",
                            Equations = [
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("1/4") },
                                        new() { Coefficient = new Coefficient("-3/4"), Variable = Identifier.Y }
                                    ],
                                },
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(2) },
                                        new() { Coefficient = new Coefficient("9/2"), Variable = Identifier.Y }
                                    ],
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Durch Gleichsetzen dieser Gleichungen hat dein*e Mitschüler*in y berechnet.",
                            DescriptionEN = "By equating these equations, your classmate has calculated y.",
                            Equations = [
                                new() {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient("1/4") },
                                        new() { Coefficient = new Coefficient("-3/4"), Variable = Identifier.Y }
                                    ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(2) },
                                        new() { Coefficient = new Coefficient("9/2"), Variable = Identifier.Y }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient("-1/3") }]
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat y in die zweite umgeformte Gleichung eingesetzt, um x zu bestimmen.",
                            DescriptionEN = "Your classmate has substituted y into the second transformed equation to determine x.",
                            Equations = [
                                new() {
                                    LeftTerms =[new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(2) },
                                        new() { Coefficient = new Coefficient("9/2"), Variable = Identifier.Y }
                                    ],
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(2) },
                                        new() { Coefficient = new Coefficient("9/2"), Parenthesis = Parenthesis.LeftLarge },
                                        new() { Coefficient = new Coefficient("-1/3"), Parenthesis = Parenthesis.RightLarge }
                                    ],
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient("1/2") }]
                                }
                            ]
                        },
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForFirstSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation.",
                AgentMessageForSecondSolutionDE = "Wenn du einfache Gleichungen von Hand lösen kannst, bist du besser vorbereitet, auch komplexe Probleme anzugehen.",
                AgentMessageForSecondSolutionEN = "If you can solve simple equations by hand, you will be better prepared to tackle complex problems.",
                AgentMessageForComparisonDE = "Der Vergleich verschiedener Methoden vertieft dein Verständnis der mathematischen Konzepte und wie sie zusammenhängen.",
                AgentMessageForComparisonEN = "Comparing different methods deepens your understanding of mathematical concepts and how they are related.",
                AgentMessageForResolvingDE = "Wenn du mehrere Methoden kennst, bist du flexibler und kannst je nach Problemstellung die beste Methode wählen.",
                AgentMessageForResolvingEN = "If you know several methods, you are more flexible and can choose the best method depending on the problem."
            };

            ExtendedSuitabilityExercise substitution2 = new()
            {
                Id = 6,
                Ordering = 6,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-6), Variable = Identifier.X }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(4) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-2) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.Second,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient("10/3") },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(8) },
                SuitableMethods = [Method.Substitution],
                ComparisonMethods = [new() {
                    Method = Method.Elimination,
                    Steps = [
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat zuerst die zweite Gleichung mit dem Faktor 3 multipliziert.",
                            DescriptionEN = "Your classmate first multiplied the second equation by a factor of 3.",
                            Equations = [
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(9), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(-6) }
                                    ]
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Dann hat dein*e Mitschüler*in die erste von der zweiten Gleichung subtrahiert, um x zu bestimmen.",
                            DescriptionEN = "Then, your classmate subtracted the first equation from the second to determine x.",
                            Equations = [
                                new() {
                                    LeftTerms = [ new() { Coefficient = new Coefficient(6), Variable = Identifier.X } ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(9), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(-10) }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient("10/3") }]
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat x in die zweite Gleichung eingesetzt, um y zu berechnen.",
                            DescriptionEN = "Your classmate has substituted x into the second equation to calculate y.",
                            Equations = [
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(-2) }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3) },
                                        new() { Coefficient = new Coefficient("10/3"), IsMultiplication = true },
                                        new() { Coefficient = new Coefficient(-2) }
                                    ],
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(8) }]
                                }
                            ]
                        },
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this.",
                AgentMessageForComparisonDE = "Verschiedene Methoden zu vergleichen, hilft dir, mögliche Fehler zu erkennen und zu korrigieren. Du siehst, ob und wo du bei einer Methode falsch liegst.",
                AgentMessageForComparisonEN = "Comparing different methods helps you to recognise and correct possible errors. You can see if and where you are wrong with a method.",
                AgentMessageForResolvingDE = "Wenn du verschiedene Methoden beherrschst, bist du besser auf komplexere Probleme vorbereitet. Du kannst dann die Methode wählen, die am besten zum jeweiligen Problem passt.",
                AgentMessageForResolvingEN = "If you have mastered different methods, you will be better prepared for more complex problems. You can then choose the method that best suits the problem at hand."
            };

            ExtendedSuitabilityExercise elimination3 = new()
            {
                Id = 7,
                Ordering = 7,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3) },
                        new() { Coefficient = new Coefficient(-5), Variable = Identifier.Y }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(9) },
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.First,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(-1) },
                SuitableMethods = [Method.Elimination],
                ComparisonMethods = [new() {
                    Method = Method.Substitution,
                    Steps = [
                        new(){},
                        new() {
                            DescriptionDE = "Dein*e Mitschüler*in hat die zweite in die erste Gleichung eingesetzt, um y zu berechnen.",
                            DescriptionEN = "Your classmate has substituted the second equation into the first equation to calculate y.",
                            Equations = [
                                new() {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(2), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient(9) },
                                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y, Parenthesis = Parenthesis.RightSmall }
                                    ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3) },
                                        new() { Coefficient = new Coefficient(-5), Variable = Identifier.Y }
                                    ],
                                },
                                new() {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(18) },
                                        new() { Coefficient = new Coefficient(10), Variable = Identifier.Y }
                                    ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3) },
                                        new() { Coefficient = new Coefficient(-5), Variable = Identifier.Y }
                                    ],
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(-1) }]
                                }
                            ]
                        },
                        new() {
                            DescriptionDE = "Durch Einsetzen von y in die zweite Gleichung, konnte dein*e Mitschüler*in x bestimmen.",
                            DescriptionEN = "By substituting y into the second equation, your classmate was able to determine x.",
                            Equations = [
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(9) },
                                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(9) },
                                        new() { Coefficient = new Coefficient(5), Variable = Identifier.Y, Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient(-1), Parenthesis = Parenthesis.RightSmall },
                                    ]
                                },
                                new() {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(4) }]
                                }
                            ]
                        }
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, lernst du, genauer zu arbeiten und auf Details zu achten. ",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will learn to work more accurately and pay attention to details.",
                AgentMessageForSecondSolutionDE = "Rechner und Computer sind nicht immer verfügbar. Wenn du von Hand rechnen kannst, bist du in jeder Situation gut vorbereitet.",
                AgentMessageForSecondSolutionEN = "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation.",
                AgentMessageForComparisonDE = "Wenn du mehrere Methoden kennst und vergleichen kannst, bist du flexibler und kannst je nach Problemstellung die beste Methode wählen.",
                AgentMessageForComparisonEN = "If you know and can compare several methods, you are more flexible and can choose the best method depending on the problem.",
                AgentMessageForResolvingDE = "Wenn du eine andere Methode ausprobierst, fallen dir vielleicht Fehler auf, die du zuvor übersehen hast. Das hilft dir, präziser zu arbeiten und deine Fähigkeiten zu verbessern.",
                AgentMessageForResolvingEN = "If you try out a different method, you may notice mistakes that you previously overlooked. This will help you to work more precisely and improve your skills."
            };

            // Exercise 8 — Equalization/Substitution most suitable (both equations solved for x)
            // System: x = 3y − 11,  x = −2y + 14   →  y = 5,  x = 4
            ExtendedSuitabilityExercise equalization3 = new()
            {
                Id = 8,
                Ordering = 8,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(-11) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y },
                        new() { Coefficient = new Coefficient(14) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.First,
                SecondEquationIsIsolatedIn = IsolatedIn.First,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(5) },
                SuitableMethods = [Method.Equalization, Method.Substitution],
                ComparisonMethods = [new()
                {
                    Method = Method.Elimination,
                    Steps = [
                        new() {},
                        new()
                        {
                            DescriptionDE = "Dein*e Mitschüler*in hat zunächst beide Gleichungen in die Normalform umgeschrieben.",
                            DescriptionEN = "Your classmate first rewrote both equations in standard form.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(-11) }]
                                },
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(14) }]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Subtrahieren der ersten von der zweiten Gleichung hat dein*e Mitschüler*in x eliminiert und y bestimmt.",
                            DescriptionEN = "By subtracting the first equation from the second, your classmate eliminated x and determined y.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(-1), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y, Parenthesis = Parenthesis.RightSmall }
                                    ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(14) },
                                        new() { Coefficient = new Coefficient(11) }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(5), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(25) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(5) }]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Einsetzen von y = 5 in die erste Gleichung hat dein*e Mitschüler*in x berechnet.",
                            DescriptionEN = "By substituting y = 5 into the first equation, your classmate calculated x.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3) },
                                        new() { Coefficient = new Coefficient(5), IsMultiplication = true },
                                        new() { Coefficient = new Coefficient(-11) }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(15) },
                                        new() { Coefficient = new Coefficient(-11) }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(4) }]
                                }
                            ]
                        }
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this.",
                AgentMessageForComparisonDE = "In Prüfungen musst du oft verschiedene Ansätze kennen. Der Vergleich verschiedener Methoden bereitet dich optimal darauf vor.",
                AgentMessageForComparisonEN = "In exams, you often need to know different approaches. Comparing different methods prepares you optimally for this.",
                AgentMessageForResolvingDE = "Verschiedene Methoden auszuprobieren zeigt dir, dass es oft mehrere Wege gibt, ein Problem zu lösen.",
                AgentMessageForResolvingEN = "Trying out different methods shows you that there are often several ways to solve a problem."
            };

            // Exercise 9 — Elimination most suitable (opposite y-coefficients: direct addition)
            // System: 4x + 3y = 11,  2x − 3y = 1   →  x = 2,  y = 1
            ExtendedSuitabilityExercise elimination4 = new()
            {
                Id = 9,
                Ordering = 9,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(11) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-3), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                SuitableMethods = [Method.Elimination],
                ComparisonMethods = [new()
                {
                    Method = Method.Substitution,
                    Steps = [
                        new() {},
                        new()
                        {
                            DescriptionDE = "Dein*e Mitschüler*in hat die zweite Gleichung nach x aufgelöst.",
                            DescriptionEN = "Your classmate solved the second equation for x.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(1) },
                                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("1/2") },
                                        new() { Coefficient = new Coefficient("3/2"), Variable = Identifier.Y }
                                    ]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Dein*e Mitschüler*in hat den Ausdruck für x in die erste Gleichung eingesetzt und y bestimmt.",
                            DescriptionEN = "Your classmate substituted the expression for x into the first equation and determined y.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(4), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient("1/2") },
                                        new() { Coefficient = new Coefficient("3/2"), Variable = Identifier.Y, Parenthesis = Parenthesis.RightSmall },
                                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(11) }]
                                },
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(2) },
                                        new() { Coefficient = new Coefficient(6), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(3), Variable = Identifier.Y }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(11) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(9), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(9) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Einsetzen von y = 1 in den Ausdruck für x hat dein*e Mitschüler*in x berechnet.",
                            DescriptionEN = "By substituting y = 1 into the expression for x, your classmate calculated x.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("1/2") },
                                        new() { Coefficient = new Coefficient("3/2") }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(2) }]
                                }
                            ]
                        }
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Durch das Lösen von Gleichungen von Hand wirst du unabhängiger von Technologie.",
                AgentMessageForFirstSolutionEN = "Solving equations by hand makes you less dependent on technology.",
                AgentMessageForSecondSolutionDE = "Computer machen manchmal Fehler oder werden falsch bedient. Wenn du regelmäßig von Hand rechnest, kannst du solche Fehler leicht erkennen.",
                AgentMessageForSecondSolutionEN = "Computers sometimes make mistakes. If you regularly calculate by hand, you can easily recognise and correct such errors.",
                AgentMessageForComparisonDE = "Das Vergleichen von Methoden schärft dein Urteilsvermögen für die effizienteste Vorgehensweise.",
                AgentMessageForComparisonEN = "Comparing methods sharpens your judgement for the most efficient approach.",
                AgentMessageForResolvingDE = "Wenn du eine Aufgabe auf mehrere Weisen lösst, vertiefst du dein Verständnis der Zusammenhänge.",
                AgentMessageForResolvingEN = "Solving a problem in several ways deepens your understanding of the connections."
            };

            // Exercise 10 — Substitution most suitable (2y isolated in second equation)
            // System: 5x − 2y = 13,  2y = 3x − 7   →  x = 3,  y = 1
            ExtendedSuitabilityExercise substitution3 = new()
            {
                Id = 10,
                Ordering = 10,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-2), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(13) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-7) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(3) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                SuitableMethods = [Method.Substitution],
                ComparisonMethods = [new()
                {
                    Method = Method.Equalization,
                    Steps = [
                        new() {},
                        new()
                        {
                            DescriptionDE = "Dein*e Mitschüler*in hat zunächst beide Gleichungen nach y aufgelöst.",
                            DescriptionEN = "Your classmate first solved both equations for y.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("5/2"), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient("-13/2") }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("3/2"), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient("-7/2") }
                                    ]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Gleichsetzen beider Ausdrücke für y hat dein*e Mitschüler*in x berechnet.",
                            DescriptionEN = "By equating both expressions for y, your classmate calculated x.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient("5/2"), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient("-13/2") }
                                    ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("3/2"), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient("-7/2") }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(3) }]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Einsetzen von x = 3 in die zweite Gleichung hat dein*e Mitschüler*in y bestimmt.",
                            DescriptionEN = "By substituting x = 3 into the second equation, your classmate determined y.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(3) },
                                        new() { Coefficient = new Coefficient(3), IsMultiplication = true },
                                        new() { Coefficient = new Coefficient(-7) }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(2) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                                }
                            ]
                        }
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Wenn du von Hand rechnest, lernst du, genauer zu arbeiten und auf Details zu achten.",
                AgentMessageForFirstSolutionEN = "If you calculate by hand, you learn to work more precisely and pay attention to details.",
                AgentMessageForSecondSolutionDE = "Regelmäßiges Üben verschiedener Methoden bereitet dich optimal auf Prüfungen vor.",
                AgentMessageForSecondSolutionEN = "Regularly practising different methods prepares you optimally for exams.",
                AgentMessageForComparisonDE = "Das Kennen mehrerer Methoden macht dich flexibler und anpassungsfähiger.",
                AgentMessageForComparisonEN = "Knowing several methods makes you more flexible and adaptable.",
                AgentMessageForResolvingDE = "Verschiedene Methoden auszuprobieren zeigt dir, dass es oft mehrere Wege gibt, ein Problem zu lösen.",
                AgentMessageForResolvingEN = "Trying out different methods shows you that there are often several ways to solve a problem."
            };

            // Exercise 11 — Elimination most suitable (multiply first equation by 2 to cancel y)
            // System: 3x + 4y = 10,  6x − 8y = 4   →  x = 2,  y = 1
            ExtendedSuitabilityExercise elimination5 = new()
            {
                Id = 11,
                Ordering = 11,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(3), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(10) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(6), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-8), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(4) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(2) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(1) },
                SuitableMethods = [Method.Elimination],
                ComparisonMethods = [new()
                {
                    Method = Method.Substitution,
                    Steps = [
                        new() {},
                        new()
                        {
                            DescriptionDE = "Dein*e Mitschüler*in hat die erste Gleichung nach x aufgelöst.",
                            DescriptionEN = "Your classmate solved the first equation for x.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(3), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(10) },
                                        new() { Coefficient = new Coefficient(-4), Variable = Identifier.Y }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("10/3") },
                                        new() { Coefficient = new Coefficient("-4/3"), Variable = Identifier.Y }
                                    ]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Einsetzen des Ausdrucks für x in die zweite Gleichung hat dein*e Mitschüler*in y bestimmt.",
                            DescriptionEN = "By substituting the expression for x into the second equation, your classmate determined y.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(6), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient("10/3") },
                                        new() { Coefficient = new Coefficient("-4/3"), Variable = Identifier.Y, Parenthesis = Parenthesis.RightSmall },
                                        new() { Coefficient = new Coefficient(-8), Variable = Identifier.Y }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(4) }]
                                },
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(20) },
                                        new() { Coefficient = new Coefficient(-8), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(-8), Variable = Identifier.Y }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(4) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(-16), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(-16) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(1) }]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Einsetzen von y = 1 hat dein*e Mitschüler*in x berechnet.",
                            DescriptionEN = "By substituting y = 1, your classmate calculated x.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("10/3") },
                                        new() { Coefficient = new Coefficient("-4/3") }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(2) }]
                                }
                            ]
                        }
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, erweiterst und verbesserst du deine mathematischen Fertigkeiten.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will continuously expand and improve your maths skills.",
                AgentMessageForSecondSolutionDE = "Viele alltägliche Probleme erfordern grundlegende mathematische Kenntnisse, die du durch manuelles Rechnen vertiefst.",
                AgentMessageForSecondSolutionEN = "Many everyday problems require basic mathematical knowledge, which you will deepen through manual calculation.",
                AgentMessageForComparisonDE = "Das Vergleichen von Methoden zeigt dir, welche Vorgehensweise für bestimmte Aufgaben am geeignetsten ist.",
                AgentMessageForComparisonEN = "Comparing methods shows you which approach is most suitable for certain tasks.",
                AgentMessageForResolvingDE = "Wenn du eine andere Methode ausprobierst, fallen dir vielleicht Fehler auf, die du zuvor übersehen hast.",
                AgentMessageForResolvingEN = "If you try out a different method, you may notice mistakes that you previously overlooked."
            };

            // Exercise 12 — Equalization/Substitution most suitable (both equations solved for 2y)
            // System: 2y = 5x − 4,  2y = −x + 20   →  x = 4,  y = 8
            ExtendedSuitabilityExercise equalization4 = new()
            {
                Id = 12,
                Ordering = 12,
                FirstEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(5), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(-4) }
                    ]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                    RightTerms =
                    [
                        new() { Coefficient = new Coefficient(-1), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(20) }
                    ]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                SecondEquationIsIsolatedIn = IsolatedIn.SecondMultiple,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(4) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(8) },
                SuitableMethods = [Method.Equalization, Method.Substitution],
                ComparisonMethods = [new()
                {
                    Method = Method.Elimination,
                    Steps = [
                        new() {},
                        new()
                        {
                            DescriptionDE = "Dein*e Mitschüler*in hat beide Gleichungen in die Normalform umgeschrieben.",
                            DescriptionEN = "Your classmate rewrote both equations in standard form.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-5), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(-4) }]
                                },
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(20) }]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Subtrahieren der zweiten Gleichung von der ersten hat dein*e Mitschüler*in y eliminiert und x bestimmt.",
                            DescriptionEN = "By subtracting the second equation from the first, your classmate eliminated y and determined x.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-5), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y },
                                        new() { Coefficient = new Coefficient(-1), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient(1), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y, Parenthesis = Parenthesis.RightSmall }
                                    ],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(-4) },
                                        new() { Coefficient = new Coefficient(-20) }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(-6), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(-24) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(4) }]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Einsetzen von x = 4 in die erste Gleichung hat dein*e Mitschüler*in y bestimmt.",
                            DescriptionEN = "By substituting x = 4 into the first equation, your classmate determined y.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(5) },
                                        new() { Coefficient = new Coefficient(4), IsMultiplication = true },
                                        new() { Coefficient = new Coefficient(-4) }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(16) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(8) }]
                                }
                            ]
                        }
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Durch das Rechnen von Hand verstehst du besser, wie mathematische Konzepte und Regeln zusammenhängen.",
                AgentMessageForFirstSolutionEN = "By calculating by hand, you will better understand how mathematical concepts and rules are related.",
                AgentMessageForSecondSolutionDE = "Verschiedene Rechnungen von Hand auszuprobieren macht dich flexibel und anpassungsfähig.",
                AgentMessageForSecondSolutionEN = "Trying out different calculations by hand makes you flexible and adaptable when solving problems.",
                AgentMessageForComparisonDE = "In Prüfungen musst du oft verschiedene Ansätze kennen. Der Vergleich verschiedener Methoden bereitet dich optimal darauf vor.",
                AgentMessageForComparisonEN = "In exams, you often need to know different approaches. Comparing different methods prepares you optimally for this.",
                AgentMessageForResolvingDE = "Wenn du eine andere Methode ausprobierst, siehst du sofort, welche Methode für dieses System am effizientesten ist.",
                AgentMessageForResolvingEN = "If you try a different method, you can immediately see which method is most efficient for this system."
            };

            // Exercise 13 — Elimination most suitable (multiply second equation by 2 to cancel y)
            // System: 6x + 4y = 26,  9x + 2y = 31   →  x = 3,  y = 2
            ExtendedSuitabilityExercise elimination6 = new()
            {
                Id = 13,
                Ordering = 13,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(6), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(4), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(26) }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Coefficient = new Coefficient(9), Variable = Identifier.X },
                        new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }
                    ],
                    RightTerms = [new() { Coefficient = new Coefficient(31) }]
                },
                FirstEquationIsIsolatedIn = IsolatedIn.None,
                SecondEquationIsIsolatedIn = IsolatedIn.None,
                FirstVariable = new() { Name = Identifier.X, Value = new Coefficient(3) },
                SecondVariable = new() { Name = Identifier.Y, Value = new Coefficient(2) },
                SuitableMethods = [Method.Elimination],
                ComparisonMethods = [new()
                {
                    Method = Method.Substitution,
                    Steps = [
                        new() {},
                        new()
                        {
                            DescriptionDE = "Dein*e Mitschüler*in hat die zweite Gleichung nach y aufgelöst.",
                            DescriptionEN = "Your classmate solved the second equation for y.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(2), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient(31) },
                                        new() { Coefficient = new Coefficient(-9), Variable = Identifier.X }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("31/2") },
                                        new() { Coefficient = new Coefficient("-9/2"), Variable = Identifier.X }
                                    ]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Dein*e Mitschüler*in hat den Ausdruck für y in die erste Gleichung eingesetzt und x bestimmt.",
                            DescriptionEN = "Your classmate substituted the expression for y into the first equation and determined x.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(6), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(4), Parenthesis = Parenthesis.LeftSmall },
                                        new() { Coefficient = new Coefficient("31/2") },
                                        new() { Coefficient = new Coefficient("-9/2"), Variable = Identifier.X, Parenthesis = Parenthesis.RightSmall }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(26) }]
                                },
                                new()
                                {
                                    LeftTerms =
                                    [
                                        new() { Coefficient = new Coefficient(6), Variable = Identifier.X },
                                        new() { Coefficient = new Coefficient(62) },
                                        new() { Coefficient = new Coefficient(-18), Variable = Identifier.X }
                                    ],
                                    RightTerms = [new() { Coefficient = new Coefficient(26) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(-12), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(-36) }]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.X }],
                                    RightTerms = [new() { Coefficient = new Coefficient(3) }]
                                }
                            ]
                        },
                        new()
                        {
                            DescriptionDE = "Durch Einsetzen von x = 3 hat dein*e Mitschüler*in y berechnet.",
                            DescriptionEN = "By substituting x = 3, your classmate calculated y.",
                            Equations =
                            [
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("31/2") },
                                        new() { Coefficient = new Coefficient("-9/2") },
                                        new() { Coefficient = new Coefficient(3), IsMultiplication = true }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms =
                                    [
                                        new() { Coefficient = new Coefficient("31/2") },
                                        new() { Coefficient = new Coefficient("-27/2") }
                                    ]
                                },
                                new()
                                {
                                    LeftTerms = [new() { Coefficient = new Coefficient(1), Variable = Identifier.Y }],
                                    RightTerms = [new() { Coefficient = new Coefficient(2) }]
                                }
                            ]
                        }
                    ]
                }],
                AgentMessageForFirstSolutionDE = "Wenn du regelmäßig von Hand rechnest, wirst du schneller und effizienter im Lösen von Aufgaben.",
                AgentMessageForFirstSolutionEN = "If you regularly calculate by hand, you will become faster and more efficient at solving tasks.",
                AgentMessageForSecondSolutionDE = "In vielen Prüfungen ist manuelles Rechnen erforderlich. Regelmäßiges Üben bereitet dich optimal darauf vor.",
                AgentMessageForSecondSolutionEN = "Manual calculations are required in many exams. Regular practice prepares you optimally for this.",
                AgentMessageForComparisonDE = "Das Kennen mehrerer Methoden macht dich flexibler und anpassungsfähiger.",
                AgentMessageForComparisonEN = "Knowing several methods makes you more flexible and adaptable.",
                AgentMessageForResolvingDE = "Verschiedene Methoden auszuprobieren zeigt dir, dass es oft mehrere Wege gibt, ein Problem zu lösen.",
                AgentMessageForResolvingEN = "Trying out different methods shows you that there are often several ways to solve a problem."
            };

            return [equalization1, elimination1, substitution1, equalization2, elimination2, substitution2, elimination3, equalization3, elimination4, substitution3, elimination5, equalization4, elimination6];
        }
    }
}

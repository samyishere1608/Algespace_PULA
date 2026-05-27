using webapi.Models.Math;
using webapi.Models.Substitution.ConceptualKnowledge;

namespace webapi.Data.Examples
{
    public static class SubstitutionExamples
    {
        public static List<SubstitutionExercise> GetExamples()
        {
            SubstitutionExercise exercise1 = new()
            {
                Ordering = 1,
                Level = 1,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Coconut }],
                        RightTerms = [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Banana },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Coin }
                        ]
                    },
                    IsIsolated = true
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Coconut },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Banana }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Coin }]
                    },
                    IsIsolated = false
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.Coconut,
                    Solution = 2,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.Banana,
                    Solution = 1
                }
            };



            SubstitutionExercise exercise2 = new()
            {
                Ordering = 2,
                Level = 1,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.RedCup },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Pear }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(12), Variable = Items.Coin }]
                    },
                    IsIsolated = false
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.RedCup }],
                        RightTerms =
                            [
                                new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pear },
                                new() { Operator = Operator.Plus, Coefficient = new Coefficient(6), Variable = Items.Coin }
                            ]
                    },
                    IsIsolated = true
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.RedCup,
                    Solution = 8,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.Pear,
                    Solution = 2
                }
            };


            SubstitutionExercise exercise3 = new()
            {
                Ordering = 3,
                Level = 2,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Papaya }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(5), Variable = Items.Apple },
                            new() { Operator = Operator.Minus, Coefficient = new Coefficient(2), Variable = Items.Coin }
                        ]
                    },
                    IsIsolated = true
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(12), Variable = Items.Coin }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Papaya },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Apple }
                        ]
                    },
                    IsIsolated = false
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.Papaya,
                    Solution = 8,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.Apple,
                    Solution = 2
                }
            };

            SubstitutionExercise exercise4 = new()
            {
                Ordering = 4,
                Level = 2,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                         [
                             new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.BluePlate },
                             new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Coin }
                         ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Sugar }]
                    },
                    IsIsolated = true
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                         [
                             new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.BluePlate },
                             new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Sugar }
                         ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(18), Variable = Items.Coin }]
                    },
                    IsIsolated = false
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.Sugar,
                    Solution = 9,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.BluePlate,
                    Solution = 3
                }
            };

            SubstitutionExercise exercise5 = new()
            {
                Ordering = 5,
                Level = 3,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Teapot }],
                        RightTerms =
                        [
                             new() { Operator = null, Coefficient = new Coefficient(4), Variable = Items.Lime },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Coin }
                        ]
                    },
                    IsIsolated = true
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                            [
                                new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Teapot },
                                new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Lime }
                            ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(15), Variable = Items.Coin }]
                    },
                    IsIsolated = false
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.Teapot,
                    Solution = 7,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.Lime,
                    Solution = 1
                }
            };

            SubstitutionExercise exercise6 = new()
            {
                Ordering = 6,
                Level = 3,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Melon },
                            new() { Operator = Operator.Minus, Coefficient = new Coefficient(1), Variable = Items.Coin }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Chili }]

                    },
                    IsIsolated = true
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                            [
                                new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Melon },
                                new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Chili }
                            ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(18), Variable = Items.Coin }]
                    },
                    IsIsolated = false
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.Chili,
                    Solution = 5,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.Melon,
                    Solution = 3
                }
            };

            SubstitutionExercise exercise7 = new()
            {
                Ordering = 7,
                Level = 4,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Pineapple }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(4), Variable = Items.Carrot },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Coin }
                        ]
                    },
                    IsIsolated = true
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                            [
                                new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Carrot },
                                new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Pineapple }
                            ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(11), Variable = Items.Coin }]
                    },
                    IsIsolated = false
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.Pineapple,
                    Solution = 4,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.Carrot,
                    Solution = 1
                }
            };

            SubstitutionExercise exercise8 = new()
            {
                Ordering = 8,
                Level = 4,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Aubergine },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Coin }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(5), Variable = Items.Lemon }]

                    },
                    IsIsolated = true
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Aubergine },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(5), Variable = Items.Lemon }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(16), Variable = Items.Coin }]
                    },
                    IsIsolated = false
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.Lemon,
                    Solution = 2,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.Aubergine,
                    Solution = 3
                }
            };

            SubstitutionExercise exercise9 = new()
            {
                Ordering = 9,
                Level = 5,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.RedPlate }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Papaya },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Coin }
                        ]
                    },
                    IsIsolated = true
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(4), Variable = Items.RedPlate },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Papaya }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(28), Variable = Items.Coin }]
                    },
                    IsIsolated = false
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.RedPlate,
                    Solution = 6,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.Papaya,
                    Solution = 4
                }
            };

            SubstitutionExercise exercise10 = new()
            {
                Ordering = 10,
                Level = 5,
                FirstEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.BlueCup },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(6), Variable = Items.Melon }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(23), Variable = Items.Coin }]

                    },
                    IsIsolated = false
                },
                SecondEquation = new SubstitutionEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Melon }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.BlueCup },
                            new() { Operator = Operator.Minus, Coefficient = new Coefficient(1), Variable = Items.Coin }
                        ]
                    },
                    IsIsolated = true
                },
                IsolatedVariable = new SubstitutionVariable
                {
                    Name = Items.Melon,
                    Solution = 3,
                },
                SecondVariable = new SubstitutionVariable
                {
                    Name = Items.BlueCup,
                    Solution = 5
                }
            };

            return [exercise1, exercise2, exercise3, exercise4, exercise5, exercise6, exercise7, exercise8, exercise9, exercise10];
        }
    }
}

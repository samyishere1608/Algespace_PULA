using webapi.Models.Elimination;
using webapi.Models.Math;

namespace webapi.Data.Examples
{
    public static class EliminationExamples
    {
        public static List<EliminationExercise> GetExamples()
        {
            EliminationExercise exercise1 = new()
            {
                Ordering = 1,
                Level = 1,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Sweets },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Card }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(4), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Sweets },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Card }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Sweets,
                    Solution = new Coefficient(1),
                    OptimalEquation = OptimalEquation.Second
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Card,
                    Solution = new Coefficient(2),
                    OptimalEquation = OptimalEquation.Second
                },
            };

            EliminationExercise exercise2 = new()
            {
                Ordering = 2,
                Level = 1,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Shell },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Coconut }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(15), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Shell },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Coconut }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(17), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Shell,
                    Solution = new Coefficient(3),
                    OptimalEquation = OptimalEquation.Both
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Coconut,
                    Solution = new Coefficient(2),
                    OptimalEquation = OptimalEquation.Both
                },
            };

            EliminationExercise exercise3 = new()
            {
                Ordering = 3,
                Level = 2,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pearl },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Bracelet }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(4), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(4), Variable = Items.Pearl },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Bracelet }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(10), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Pearl,
                    Solution = new Coefficient(1),
                    OptimalEquation = OptimalEquation.First
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Bracelet,
                    Solution = new Coefficient(3),
                    OptimalEquation = OptimalEquation.First
                },
            };

            EliminationExercise exercise4 = new()
            {
                Ordering = 4,
                Level = 2,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Shirt },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Mug }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(23), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Shirt },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(5), Variable = Items.Mug }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(75), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Shirt,
                    Solution = new Coefficient(20),
                    OptimalEquation = OptimalEquation.First
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Mug,
                    Solution = new Coefficient(3),
                    OptimalEquation = OptimalEquation.First
                },
            };

            EliminationExercise exercise5 = new()
            {
                Ordering = 5,
                Level = 3,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Bikini },
                        new() { Operator = Operator.Minus, Coefficient = new Coefficient(1), Variable = Items.Flipflop }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(5), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Bikini },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Flipflop }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(9), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Bikini,
                    Solution = new Coefficient(7),
                    OptimalEquation = OptimalEquation.Second
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Flipflop,
                    Solution = new Coefficient(2),
                    OptimalEquation = OptimalEquation.Both
                },
            };

            EliminationExercise exercise6 = new()
            {
                Ordering = 6,
                Level = 3,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Pearl },
                        new() { Operator = Operator.Minus, Coefficient = new Coefficient(1), Variable = Items.Shell }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Pearl },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Shell }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(18), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Pearl,
                    Solution = new Coefficient(4),
                    OptimalEquation = OptimalEquation.Both
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Shell,
                    Solution = new Coefficient(5),
                    OptimalEquation = OptimalEquation.First
                },
            };

            EliminationExercise exercise7 = new()
            {
                Ordering = 7,
                Level = 4,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Shorts },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Glasses }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(20), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Shorts },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Glasses }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(17), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Shorts,
                    Solution = new Coefficient(6.5),
                    OptimalEquation = OptimalEquation.Both
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Glasses,
                    Solution = new Coefficient(3.5),
                    OptimalEquation = OptimalEquation.Second
                },
            };

            EliminationExercise exercise8 = new()
            {
                Ordering = 8,
                Level = 4,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                   [
                       new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Mug },
                       new() { Operator = Operator.Minus, Coefficient = new Coefficient(4), Variable = Items.Bracelet }
                   ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(-6), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                   [
                       new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Mug },
                       new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Bracelet }
                   ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(13), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Mug,
                    Solution = new Coefficient(2),
                    OptimalEquation = OptimalEquation.Second
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Bracelet,
                    Solution = new Coefficient(3),
                    OptimalEquation = OptimalEquation.Second
                },
            };

            EliminationExercise exercise9 = new()
            {
                Ordering = 9,
                Level = 5,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
                   [
                       new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Shirt },
                       new() { Operator = Operator.Plus, Coefficient = new Coefficient(5), Variable = Items.Glasses }
                   ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(22.5), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
                   [
                       new() { Operator = null, Coefficient = new Coefficient(4), Variable = Items.Shirt },
                       new() { Operator = Operator.Plus, Coefficient = new Coefficient(7), Variable = Items.Glasses }
                   ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(30.5), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Shirt,
                    Solution = new Coefficient(5),
                    OptimalEquation = OptimalEquation.First
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Glasses,
                    Solution = new Coefficient(1.5),
                    OptimalEquation = OptimalEquation.First
                },
            };

            EliminationExercise exercise10 = new()
            {
                Ordering = 10,
                Level = 5,
                FirstEquation = new LinearEquation
                {
                    LeftTerms =
            [
                new() { Operator = null, Coefficient = new Coefficient(7), Variable = Items.Card },
                new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Shorts }
            ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(20), Variable = Items.Bills }]
                },
                SecondEquation = new LinearEquation
                {
                    LeftTerms =
            [
                new() { Operator = null, Coefficient = new Coefficient(4), Variable = Items.Card },
                new() { Operator = Operator.Plus, Coefficient = new Coefficient(7), Variable = Items.Shorts }
            ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(40.5), Variable = Items.Bills }]
                },
                FirstVariable = new EliminationVariable
                {
                    Name = Items.Card,
                    Solution = new Coefficient(0.5),
                    OptimalEquation = OptimalEquation.Both
                },
                SecondVariable = new EliminationVariable
                {
                    Name = Items.Shorts,
                    Solution = new Coefficient(5.5),
                    OptimalEquation = OptimalEquation.First
                },
            };

            return [exercise1, exercise2, exercise3, exercise4, exercise5, exercise6, exercise7, exercise8, exercise9, exercise10];
        }
    }
}

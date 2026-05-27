using webapi.Models.Equalization;
using webapi.Models.Math;

namespace webapi.Data.Examples
{
    public static class EqualizationExamples
    {
        public static List<EqualizationExercise> GetExamples()
        {
            EqualizationExercise exercise1 = new()
            {
                Ordering = 1,
                Level = 1,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Papaya },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(700), Variable = Items.Weight }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pineapple }]
                    },
                    WeightsLeft = new Dictionary<Weight, int>() {
                        { Weight.W500, 1 },
                        { Weight.W200, 1 }
                    },
                    WeightsRight = null
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pineapple }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Papaya }]
                    },
                    WeightsLeft = null,
                    WeightsRight = null
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Pineapple,
                    Weight = 1050,
                    Amount = 3
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Papaya,
                    Weight = 350,
                    Amount = 10
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 1050,
                    VariablesLeft = 1,
                    VariablesRight = 3
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 700,
                    VariablesLeft = 0,
                    VariablesRight = 2
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W500, 1 },
                    { Weight.W200, 2 },
                    { Weight.W100, 1 }
                },
                ScaleAllocation = ScaleAllocation.LeftFirst
            };

            EqualizationExercise exercise2 = new()
            {
                Ordering = 2,
                Level = 1,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(150), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Lime }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Aubergine }]
                    },
                    WeightsLeft = new Dictionary<Weight, int>() {
                        { Weight.W100, 1 },
                        { Weight.W50, 1 }
                    },
                    WeightsRight = null
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Aubergine }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(5), Variable = Items.Lime }]
                    },
                    WeightsLeft = null,
                    WeightsRight = null,
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Aubergine,
                    Weight = 375,
                    Amount = 5
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Lime,
                    Weight = 75,
                    Amount = 15
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 375,
                    VariablesLeft = 3,
                    VariablesRight = 5
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 150,
                    VariablesLeft = 0,
                    VariablesRight = 2
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W200, 2 },
                    { Weight.W100, 1 },
                    { Weight.W50, 2 }
                },
                ScaleAllocation = ScaleAllocation.RightSecond
            };

            EqualizationExercise exercise3 = new()
            {
                Ordering = 3,
                Level = 1,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Apple },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(700), Variable = Items.Weight }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Melon }]
                    },
                    WeightsLeft = new Dictionary<Weight, int>() {
                        { Weight.W500, 1 },
                        { Weight.W100, 2 }
                    },
                    WeightsRight = null
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Melon }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(6), Variable = Items.Apple },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(100), Variable = Items.Weight }
                        ]
                    },
                    WeightsLeft = null,
                    WeightsRight = new Dictionary<Weight, int>() {
                        { Weight.W100, 1 }
                    }
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Melon,
                    Weight = 820,
                    Amount = 2
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Apple,
                    Weight = 120,
                    Amount = 10
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 820,
                    VariablesLeft = 1,
                    VariablesRight = 6
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 600,
                    VariablesLeft = 0,
                    VariablesRight = 5
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W500, 1 },
                    { Weight.W250, 1 },
                    { Weight.W100, 4 }
                },
                ScaleAllocation = ScaleAllocation.LeftFirst
            };

            EqualizationExercise exercise4 = new()
            {
                Ordering = 4,
                Level = 2,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(7), Variable = Items.Pear }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pumpkin }]
                    },
                    WeightsLeft = null,
                    WeightsRight = null
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pumpkin }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Pear },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(800), Variable = Items.Weight }
                        ]
                    },
                    WeightsLeft = null,
                    WeightsRight = new Dictionary<Weight, int>() {
                        { Weight.W500, 1 },
                        { Weight.W200, 1 },
                        { Weight.W100, 1 }
                    },
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Pumpkin,
                    Weight = 1120,
                    Amount = 3
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Pear,
                    Weight = 160,
                    Amount = 10
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 1120,
                    VariablesLeft = 7,
                    VariablesRight = 2
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 800,
                    VariablesLeft = 5,
                    VariablesRight = 0
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W500, 1 },
                    { Weight.W200, 1 },
                    { Weight.W100, 1 }
                },
                ScaleAllocation = ScaleAllocation.None
            };

            EqualizationExercise exercise5 = new()
            {
                Ordering = 5,
                Level = 2,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Coconut }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(450), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Banana }
                        ]
                    },
                    WeightsLeft = null,
                    WeightsRight = new Dictionary<Weight, int>() {
                        { Weight.W200, 2 },
                        { Weight.W50, 1 }
                    },
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Coconut }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(200), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(5), Variable = Items.Banana }
                        ]
                    },
                    WeightsLeft = null,
                    WeightsRight = new Dictionary<Weight, int>() {
                        { Weight.W200, 1 }
                    },
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Coconut,
                    Weight = 825,
                    Amount = 5
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Banana,
                    Weight = 125,
                    Amount = 15
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 825,
                    VariablesLeft = 3,
                    VariablesRight = 5
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 250,
                    VariablesLeft = 0,
                    VariablesRight = 2
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W200, 4 },
                    { Weight.W100, 1 },
                    { Weight.W50, 2 }
                },
                ScaleAllocation = ScaleAllocation.None
            };

            EqualizationExercise exercise6 = new()
            {
                Ordering = 6,
                Level = 3,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(600), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Lemon }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Apple }]
                    },
                    WeightsLeft = new Dictionary<Weight, int>() {
                        { Weight.W500, 1 },
                        { Weight.W100, 1 }
                    },
                    WeightsRight = null
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(3), Variable = Items.Apple }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(6), Variable = Items.Lemon }]
                    },
                    WeightsLeft = null,
                    WeightsRight = null
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Apple,
                    Weight = 240,
                    Amount = 6
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Lemon,
                    Weight = 120,
                    Amount = 10
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 720,
                    VariablesLeft = 1,
                    VariablesRight = 6
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 600,
                    VariablesLeft = 0,
                    VariablesRight = 5
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W500, 1 },
                    { Weight.W250, 1 },
                    { Weight.W100, 2 }
                },
                ScaleAllocation = ScaleAllocation.None
            };

            EqualizationExercise exercise7 = new()
            {
                Ordering = 7,
                Level = 3,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Papaya }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(100), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Carrot }
                        ]
                    },
                    WeightsLeft = null,
                    WeightsRight = new Dictionary<Weight, int>() {
                        { Weight.W100, 1 }
                    }
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Papaya }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(400), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Carrot }
                        ]
                    },
                    WeightsLeft = null,
                    WeightsRight = new Dictionary<Weight, int>() {
                        { Weight.W200, 2 }
                    }
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Papaya,
                    Weight = 350,
                    Amount = 4
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Carrot,
                    Weight = 150,
                    Amount = 10
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 700,
                    VariablesLeft = 4,
                    VariablesRight = 2
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 300,
                    VariablesLeft = 2,
                    VariablesRight = 0
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W500, 1 },
                    { Weight.W200, 2 },
                    { Weight.W100, 2 }
                },
                ScaleAllocation = ScaleAllocation.None
            };

            EqualizationExercise exercise8 = new()
            {
                Ordering = 8,
                Level = 4,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(500), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Pear }
                        ],
                        RightTerms = [new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Pumpkin }]
                    },
                    WeightsLeft = new Dictionary<Weight, int>() {
                        { Weight.W500, 1 }
                    },
                    WeightsRight = null
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pumpkin }],
                        RightTerms = [new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Pear }]
                    },
                    WeightsLeft = null,
                    WeightsRight = null
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Pumpkin,
                    Weight = 750,
                    Amount = 4
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Pear,
                    Weight = 250,
                    Amount = 12
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 1500,
                    VariablesLeft = 4,
                    VariablesRight = 6
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 500,
                    VariablesLeft = 0,
                    VariablesRight = 2
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W500, 1 },
                    { Weight.W200, 2 },
                    { Weight.W100, 1 }
                },
                ScaleAllocation = ScaleAllocation.LeftFirst
            };

            EqualizationExercise exercise9 = new()
            {
                Ordering = 9,
                Level = 4,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(350), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(5), Variable = Items.Lime }
                        ],
                        RightTerms = [new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Coconut }]
                    },
                    WeightsLeft = new Dictionary<Weight, int>() {
                        { Weight.W250, 1 },
                        { Weight.W100, 1 }
                    },
                    WeightsRight = null
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Coconut }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(200), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Lime }
                        ]
                    },
                    WeightsLeft = null,
                    WeightsRight = new Dictionary<Weight, int>() {
                        { Weight.W100, 2 }
                    }
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Coconut,
                    Weight = 325,
                    Amount = 7
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Lime,
                    Weight = 125,
                    Amount = 10
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 975,
                    VariablesLeft = 5,
                    VariablesRight = 3
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 250,
                    VariablesLeft = 2,
                    VariablesRight = 0
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W500, 1 },
                    { Weight.W250, 2 },
                    { Weight.W100, 7 },
                    { Weight.W50, 1 }
                },
                ScaleAllocation = ScaleAllocation.None
            };

            EqualizationExercise exercise10 = new()
            {
                Level = 5,
                Ordering = 10,
                FirstEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Melon }],
                        RightTerms = [
                            new() { Operator = null, Coefficient = new Coefficient(1300), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Aubergine }
                        ]
                    },
                    WeightsLeft = null,
                    WeightsRight = new Dictionary<Weight, int>() {
                        { Weight.W500, 2 },
                        { Weight.W200, 1 }
                    }
                },
                SecondEquation = new EqualizationEquation
                {
                    Equation = new LinearEquation
                    {
                        LeftTerms = [
                            new() { Operator = null, Coefficient = new Coefficient(150), Variable = Items.Weight },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Aubergine }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Melon }]
                    },
                    WeightsLeft = new Dictionary<Weight, int>() {
                        { Weight.W100, 1 },
                        { Weight.W50, 1 }
                    },
                    WeightsRight = null
                },
                IsolatedVariable = new EqualizationVariable
                {
                    Name = Items.Melon,
                    Weight = 900,
                    Amount = 7
                },
                SecondVariable = new EqualizationVariable
                {
                    Name = Items.Aubergine,
                    Weight = 375,
                    Amount = 10
                },
                EqualizedScale = new Scale
                {
                    TotalWeight = 2700,
                    VariablesLeft = 4,
                    VariablesRight = 6
                },
                SimplifiedScale = new Scale
                {
                    TotalWeight = 750,
                    VariablesLeft = 0,
                    VariablesRight = 2
                },
                AdditionalWeights = new Dictionary<Weight, int>() {
                    { Weight.W500, 2 },
                    { Weight.W200, 3 },
                    { Weight.W100, 4 },
                    { Weight.W50, 3 }
                },
                ScaleAllocation = ScaleAllocation.None
            };

            return [exercise1, exercise2, exercise3, exercise4, exercise5, exercise6, exercise7, exercise8, exercise9, exercise10];
        }
    }
}

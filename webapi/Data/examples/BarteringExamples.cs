using webapi.Models.Math;
using webapi.Models.Substitution.Bartering;

namespace webapi.Data.Examples
{
    public static class BarteringExamples
    {
        public static List<BarteringExercise> GetExamples()
        {
            BarteringExercise exercise1 = new()
            {
                Ordering = 1,
                Level = 1,
                LinearEquation = new LinearEquation
                {
                    LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Melon }],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Garlic }]
                },
                FirstMerchant = new Merchant
                {
                    ProductType = ProductType.Spices,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Pineapple }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Garlic }]
                    }
                },
                SecondMerchant = new Merchant
                {
                    ProductType = ProductType.Goods,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Papaya }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.RedCup }]
                    }
                },
                ThirdMerchant = new Merchant
                {
                    ProductType = ProductType.Fruits,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Melon }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Pineapple }]
                    }
                }
            };

            BarteringExercise exercise2 = new()
            {
                Ordering = 2,
                Level = 1,
                LinearEquation = new LinearEquation
                {
                    LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.RedPlate }],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.BlueCup }]
                },
                FirstMerchant = new Merchant
                {
                    ProductType = ProductType.Spices,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.RedPlate }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Oregano }]
                    }
                },
                SecondMerchant = new Merchant
                {
                    ProductType = ProductType.Goods,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Oregano }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.BlueCup }]
                    }
                },
                ThirdMerchant = new Merchant
                {
                    ProductType = ProductType.Fruits,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.RedPlate }],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Oregano }]
                    }
                }
            };

            BarteringExercise exercise3 = new()
            {
                Ordering = 3,
                Level = 2,
                LinearEquation = new LinearEquation
                {
                    LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(5), Variable = Items.Aubergine }],
                    RightTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Curry },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Coin }
                    ]
                },
                FirstMerchant = new Merchant
                {
                    ProductType = ProductType.Spices,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(5), Variable = Items.Coin }],
                        RightTerms = [new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Curry }]
                    }
                },
                SecondMerchant = new Merchant
                {
                    ProductType = ProductType.Goods,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(5), Variable = Items.Aubergine }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Teapot },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Coin }
                        ]
                    }
                },
                ThirdMerchant = new Merchant
                {
                    ProductType = ProductType.Fruits,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Teapot }],
                        RightTerms = [new() { Operator = Operator.Plus, Coefficient = new Coefficient(5), Variable = Items.Coin }]
                    }
                }
            };

            BarteringExercise exercise4 = new()
            {
                Ordering = 4,
                Level = 2,
                LinearEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pineapple },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Coin }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.BluePlate }]
                },
                FirstMerchant = new Merchant

                {
                    ProductType = ProductType.Spices,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Pineapple },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(3), Variable = Items.Coin }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Chili }]
                    }
                },
                SecondMerchant = new Merchant
                {
                    ProductType = ProductType.Goods,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Melon },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(2), Variable = Items.Coin }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.BluePlate }]
                    }
                },
                ThirdMerchant = new Merchant
                {
                    ProductType = ProductType.Fruits,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Chili }],
                        RightTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Melon },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Coin }
                        ],
                    }
                }
            };

            BarteringExercise exercise5 = new()
            {
                Ordering = 5,
                Level = 3,
                LinearEquation = new LinearEquation
                {
                    LeftTerms =
                    [
                        new() { Operator = null, Coefficient = new Coefficient(6), Variable = Items.Lemon },
                        new() { Operator = Operator.Plus, Coefficient = new Coefficient(4), Variable = Items.Coin }
                    ],
                    RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Sugar }],
                },
                FirstMerchant = new Merchant

                {
                    ProductType = ProductType.Spices,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Spoon },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(5), Variable = Items.Carrot }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Sugar }]
                    }
                },
                SecondMerchant = new Merchant
                {
                    ProductType = ProductType.Goods,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Lemon },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Coin }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(1), Variable = Items.Spoon }]
                    }
                },
                ThirdMerchant = new Merchant
                {
                    ProductType = ProductType.Fruits,
                    LinearEquation = new LinearEquation
                    {
                        LeftTerms =
                        [
                            new() { Operator = null, Coefficient = new Coefficient(2), Variable = Items.Spoon },
                            new() { Operator = Operator.Plus, Coefficient = new Coefficient(1), Variable = Items.Coin }
                        ],
                        RightTerms = [new() { Operator = null, Coefficient = new Coefficient(5), Variable = Items.Carrot }],
                    }
                }
            };

            return [exercise1, exercise2, exercise3, exercise4, exercise5];
        }
    }
}

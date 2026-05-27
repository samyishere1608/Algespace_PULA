export enum Weight {
    W1000 = "W1000",
    W500 = "W500",
    W250 = "W250",
    W200 = "W200",
    W100 = "W100",
    W50 = "W50"
}

export enum EqualizationItemType {
    IsolatedVariable,
    SecondVariable,
    Weight
}

export enum DragSource {
    FruitsLeft,
    FruitsRight,
    BalanceScaleLeft,
    BalanceScaleRight,
    DigitalScale,
    Weights
}

export enum EqualizationGamePhase {
    Equalization,
    Simplification,
    SolvingSystem
}

export enum ScaleAllocation {
    None,
    LeftFirst,
    LeftSecond,
    RightFirst,
    RightSecond
}

export enum InstructionType {
    FirstInstruction,
    ScaleAndSystemRelation,
    RelationReason,
    Simplification,
    DeterminingSecondVariable,
    DeterminingIsolatedVariable,
    Solution
}

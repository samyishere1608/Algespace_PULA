import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import FemaleAfricanNeutral from "@images/flexibility/AfroAmerican_F_Neutral.png";
import FemaleAfricanSmiling from "@images/flexibility/AfroAmerican_F_Smiling.png";
import FemaleAfricanThinking from "@images/flexibility/AfroAmerican_F_Thinking.png";
import MaleAfricanNeutral from "@images/flexibility/AfroAmerican_M_Neutral.png";
import MaleAfricanSmiling from "@images/flexibility/AfroAmerican_M_Smiling.png";
import MaleAfricanThinking from "@images/flexibility/AfroAmerican_M_Thinking.png";
import FemaleAsianNeutral from "@images/flexibility/Asian_F_Neutral.png";
import FemaleAsianSmiling from "@images/flexibility/Asian_F_Smiling.png";
import FemaleAsianThinking from "@images/flexibility/Asian_F_Thinking.png";
import MaleAsianNeutral from "@images/flexibility/Asian_M_Neutral.png";
import MaleAsianSmiling from "@images/flexibility/Asian_M_Smiling.png";
import MaleAsianThinking from "@images/flexibility/Asian_M_Thinking.png";
import FemaleCaucasianNeutral from "@images/flexibility/Caucasian_F_Neutral.png";
import FemaleCaucasianSmiling from "@images/flexibility/Caucasian_F_Smiling.png";
import FemaleCaucasianThinking from "@images/flexibility/Caucasian_F_Thinking.png";
import MaleCaucasianNeutral from "@images/flexibility/Caucasian_M_Neutral.png";
import MaleCaucasianSmiling from "@images/flexibility/Caucasian_M_Smiling.png";
import MaleCaucasianThinking from "@images/flexibility/Caucasian_M_Thinking.png";
import FemaleEasternNeutral from "@images/flexibility/MiddleEastern_F_Neutral.png";
import FemaleEasternSmiling from "@images/flexibility/MiddleEastern_F_Smiling.png";
import FemaleEasternThinking from "@images/flexibility/MiddleEastern_F_Thinking.png";
import MaleEasternNeutral from "@images/flexibility/MiddleEastern_M_Neutral.png";
import MaleEasternSmiling from "@images/flexibility/MiddleEastern_M_Smiling.png";
import MaleEasternThinking from "@images/flexibility/MiddleEastern_M_Thinking.png";

export function getAgentImageSource(type: AgentType, expression: AgentExpression): string {
    switch (type) {
        case AgentType.FemaleAfrican: {
            if (expression === AgentExpression.Neutral) {
                return FemaleAfricanNeutral;
            } else if (expression === AgentExpression.Smiling) {
                return FemaleAfricanSmiling;
            }
            return FemaleAfricanThinking;
        }
        case AgentType.MaleAfrican: {
            if (expression === AgentExpression.Neutral) {
                return MaleAfricanNeutral;
            } else if (expression === AgentExpression.Smiling) {
                return MaleAfricanSmiling;
            }
            return MaleAfricanThinking;
        }
        case AgentType.FemaleAsian: {
            if (expression === AgentExpression.Neutral) {
                return FemaleAsianNeutral;
            } else if (expression === AgentExpression.Smiling) {
                return FemaleAsianSmiling;
            }
            return FemaleAsianThinking;
        }
        case AgentType.MaleAsian: {
            if (expression === AgentExpression.Neutral) {
                return MaleAsianNeutral;
            } else if (expression === AgentExpression.Smiling) {
                return MaleAsianSmiling;
            }
            return MaleAsianThinking;
        }
        case AgentType.FemaleCaucasian: {
            if (expression === AgentExpression.Neutral) {
                return FemaleCaucasianNeutral;
            } else if (expression === AgentExpression.Smiling) {
                return FemaleCaucasianSmiling;
            }
            return FemaleCaucasianThinking;
        }
        case AgentType.MaleCaucasian: {
            if (expression === AgentExpression.Neutral) {
                return MaleCaucasianNeutral;
            } else if (expression === AgentExpression.Smiling) {
                return MaleCaucasianSmiling;
            }
            return MaleCaucasianThinking;
        }
        case AgentType.FemaleEastern: {
            if (expression === AgentExpression.Neutral) {
                return FemaleEasternNeutral;
            } else if (expression === AgentExpression.Smiling) {
                return FemaleEasternSmiling;
            }
            return FemaleEasternThinking;
        }
        case AgentType.MaleEastern: {
            if (expression === AgentExpression.Neutral) {
                return MaleEasternNeutral;
            } else if (expression === AgentExpression.Smiling) {
                return MaleEasternSmiling;
            }
            return MaleEasternThinking;
        }
    }
}

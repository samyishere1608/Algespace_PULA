namespace webapi.Models.Flexibility
{
    /// <summary>
    /// Japanese translations for the self-explanation content (option texts, reasons and
    /// the self-explanation agent message) that is served by the backend in Efficiency and
    /// Matching exercises. The data is keyed by the English string so that the same
    /// translation is reused wherever a string appears more than once.
    /// </summary>
    public static class SelfExplanationJapanese
    {
        private static readonly Dictionary<string, string> Translations = new(StringComparer.Ordinal)
        {
            // Agent messages shown before the self-explanation starts
            { "Explaining helps you to retain information for longer. You memorise better what you understand and what you still need to learn.", "説明することで、学んだことをより長く覚えていられます。自分が何を理解していて、何をまだ学ぶ必要があるのかがよくわかります。" },
            { "Explaining helps you to recognise connections between different topics and develop a deeper understanding.", "説明することで、異なるテーマ同士のつながりに気づき、より深い理解を身につけることができます。" },
            { "When you explain your solutions, you can immediately see where you still have uncertainties and what you still need to practise.", "自分の解き方を説明すると、どこにまだ不安があるのか、何を練習すればよいのかがすぐにわかります。" },
            { "By explaining different ways, you realise that there are often several solutions to a problem.", "いろいろな解き方を説明することで、一つの問題に複数の解き方があることが多いと気づけます。" },
            { "Explaining helps you to retain information for longer.", "説明することで、学んだことをより長く覚えていられます。" },
            { "When you explain your solutions, you can immediately see where you still have uncertainties.", "自分の解き方を説明すると、どこにまだ不安があるのかがすぐにわかります。" },
            { "Explanations help you to consolidate your knowledge and identify gaps.", "説明することで知識が定着し、理解できていない部分に気づくことができます。" },
            { "By explaining solutions, you understand the concepts much better.", "解き方を説明することで、概念をより深く理解できます。" },
            { "When explaining, you think about the best solutions, which strengthens your problem-solving skills.", "説明しながら最善の解き方を考えることで、問題を解く力が強くなります。" },
            { "If you explain your solutions, you will recognise possible mistakes more easily and can correct them.", "自分の解き方を説明すると、間違いに気づきやすくなり、修正できるようになります。" },
            { "By explaining solutions, you understand the concepts much better and realise how everything is connected.", "解き方を説明することで、概念をより深く理解し、全体がどのようにつながっているかがわかります。" },

            // Option texts — Efficiency exercises
            { "The first equation can be inserted into the second equation.", "第一の式を第二の式に代入できます。" },
            { "The term 2+x can be used for the variable y in the first equation.", "第一の式の変数 y に、項 2+x を代入できます。" },
            { "y can be inserted into the first equation for the variable x.", "第一の式の変数 x に、y を代入できます。" },
            { "The first equation must first be solved for y. The result can then be used in the second equation.", "まず第一の式を y について解き、その結果を第二の式に代入します。" },
            { "The variable x can be eliminated by subtracting the first equation from the second equation.", "第二の式から第一の式を引くと、変数 x を消去できます。" },
            { "The variable y can be eliminated by subtracting the first equation from the second equation.", "第二の式から第一の式を引くと、変数 y を消去できます。" },
            { "The variable x can be eliminated by subtracting the second equation from the first equation.", "第一の式から第二の式を引くと、変数 x を消去できます。" },
            { "Adding both equations eliminates the variable x.", "両方の式を足すと、変数 x が消えます。" },
            { "If you multiply the first equation by a factor of 2 and the second equation by a factor of 3 and subtract one equation from the other, the variable y is omitted.", "第一の式を2倍、第二の式を3倍して、一方の式からもう一方の式を引くと、変数 y が消えます。" },
            { "If you multiply the first equation by a factor of 3 and the second equation by a factor of 7 and add both equations together, the variable x is omitted.", "第一の式を3倍、第二の式を7倍して、両方の式を足すと、変数 x が消えます。" },
            { "The term x-8 can be used for the variable y in the first equation.", "第一の式の変数 y に、項 x-8 を代入できます。" },
            { "The term 2y can be replaced with x-8 in the first equation.", "第一の式の項 2y を x-8 に置き換えることができます。" },
            { "The second equation must first be solved for y. The result can then be inserted into the first equation.", "まず第二の式を y について解き、その結果を第一の式に代入します。" },
            { "The first equation can be inserted directly into the second.", "第一の式を第二の式に直接代入できます。" },
            { "The first equation can be inserted directly into the second equation.", "第一の式を第二の式に直接代入できます。" },
            { "The term x+1 can be substituted for y in the first equation.", "第一の式の変数 y に、項 x+1 を代入できます。" },
            { "The second equation must first be solved for x before substitution can be applied.", "代入法を使うには、まず第二の式を x について解く必要があります。" },
            { "The first equation must first be solved for y to substitute it into the second.", "第二の式に代入するには、まず第一の式を y について解く必要があります。" },
            { "Adding both equations eliminates y, because the y-coefficients have opposite signs.", "y の係数が反対の符号なので、両方の式を足すと y が消えます。" },
            { "Subtracting the second equation from the first eliminates y.", "第一の式から第二の式を引くと、y が消えます。" },
            { "The y-coefficients are equal in magnitude but opposite in sign, so elimination by addition can be applied directly.", "y の係数は大きさが等しく符号が反対なので、加算法を直接使えます。" },
            { "Both equations must first be transformed before elimination can be applied.", "消去法を使うには、まず両方の式を変形する必要があります。" },
            { "Multiplying the first equation by 2 and adding the second equation eliminates y.", "第一の式を2倍して第二の式を足すと、y が消えます。" },
            { "Adding both equations directly eliminates a variable.", "両方の式をそのまま足すと、どちらかの変数が消えます。" },
            { "Multiplying the first equation by 2 and subtracting the second equation eliminates x.", "第一の式を2倍して第二の式を引くと、x が消えます。" },
            { "Subtracting the first from the second equation eliminates y directly.", "第二の式から第一の式を引くと、そのまま y が消えます。" },
            { "The term y+3 can be substituted directly for x in the second equation.", "第二の式の変数 x に、項 y+3 を直接代入できます。" },
            { "x can be substituted for the term y+3 into the second equation.", "第二の式に、項 y+3 の代わりに x を代入できます。" },
            { "Both equations must first be rearranged for substitution to be applicable.", "代入法を使えるようにするには、まず両方の式を変形する必要があります。" },
            { "Multiplying the second equation by 2 and adding the first equation eliminates y.", "第二の式を2倍して第一の式を足すと、y が消えます。" },
            { "Subtracting the first equation from the second eliminates x directly.", "第二の式から第一の式を引くと、そのまま x が消えます。" },
            { "The term 2y can be replaced with 2x+2 in the first equation.", "第一の式の項 2y を 2x+2 に置き換えることができます。" },
            { "The second equation must first be solved for y before substitution can be applied.", "代入法を使うには、まず第二の式を y について解く必要があります。" },
            { "Both equations must first be brought into standard form.", "まず両方の式を標準形にする必要があります。" },

            // Option texts — Matching exercises
            { "The selected system only needs to be transformed once.", "選んだ連立方程式は、一度だけ変形すればよい。" },
            { "The other two systems would first have to be transformed in order to be able to use the method.", "他の2つの連立方程式は、この方法を使うにはまず変形する必要があります。" },
            { "The method could also be applied directly to the other two systems, but these are more complicated.", "他の2つの連立方程式にも直接この方法を使えますが、それらはより複雑です。" },
            { "Both equations are already solved for y. The method can therefore be used directly.", "両方の式がすでに y について解かれているので、この方法を直接使えます。" },
            { "No matter how you add or subtract, you cannot eliminate a variable in the other two systems without a transformation using the addition method.", "他の2つの連立方程式では、加算法を使っても、変形しない限りどのように足したり引いたりしても変数を消去できません。" },
            { "If you multiply the second equation by a factor of 2, you can eliminate the variable y by subtracting the equations.", "第二の式を2倍すると、式を引き算して変数 y を消去できます。" },
            { "The selected system is the only one that can be solved using the addition method.", "選んだ連立方程式だけが、加算法で解くことができます。" },
            { "The insertion method can also be applied directly to one of the other two systems, but the system is more difficult to solve.", "他の2つの連立方程式のうち1つにも代入法を直接使えますが、その連立方程式は解くのがより難しいです。" },
            { "The substitution method can be applied directly to the selected system by substituting 9/2-(3/2)y into the first equation for x.", "選んだ連立方程式では、第一の式の x に 9/2-(3/2)y を代入することで、代入法を直接使えます。" },
            { "The insertion procedure can always be used directly.", "代入法はいつでも直接使えます。" },
            { "The substitution method can be applied directly to the selected system by substituting 3+(5/2)x into the second equation for y.", "選んだ連立方程式では、第二の式の y に 3+(5/2)x を代入することで、代入法を直接使えます。" },
            { "The selected system must be divided by a factor of 2, then the equalization method can be applied.", "選んだ連立方程式を2で割ると、等値法を使えます。" },
            { "If the other two systems are divided by a factor of 2, the equating method could also have been applied directly here.", "他の2つの連立方程式を2で割れば、そこでも等値法を直接使うことができたでしょう。" },
            { "The terms 7-x and x+5 can be equated.", "7-x と x+5 を等しいと置くことができます。" },
            { "All systems can be solved directly using the equalization method.", "すべての連立方程式は、等値法で直接解けます。" },
            { "The substitution method can be applied to all three systems without transformation.", "代入法は、3つの連立方程式すべてに変形なしで使えます。" },
            { "The term 2y+1 can be substituted directly for x in the second equation.", "第二の式の変数 x に、項 2y+1 を直接代入できます。" },
            { "The x-coefficients are equal in magnitude but opposite in sign, so x is eliminated by adding both equations.", "x の係数は大きさが等しく符号が反対なので、両方の式を足すと x が消えます。" },
            { "Subtracting the first equation from the second eliminates x.", "第二の式から第一の式を引くと、x が消えます。" },
            { "The y-coefficients are equal in magnitude but opposite in sign, so y is eliminated by adding both equations.", "y の係数は大きさが等しく符号が反対なので、両方の式を足すと y が消えます。" },
            { "Both equations are already solved for y, so the expressions can be equated directly.", "両方の式がすでに y について解かれているので、式を直接等しいと置けます。" },
            { "Subtracting the two expressions for y gives the solution.", "y についての2つの式を引き算すると解が得られます。" },
            { "Both equations must first be solved for x before equalization can be applied.", "等値法を使うには、まず両方の式を x について解く必要があります。" },
            { "Equalization requires both equations to be solved for the same variable without a coefficient.", "等値法では、両方の式が係数のない同じ変数について解かれている必要があります。" },
            { "The term 2x can be replaced with y+8 in the first equation.", "第一の式の項 2x を y+8 に置き換えることができます。" },
            { "The first equation must first be solved for x before it can be substituted.", "代入するには、まず第一の式を x について解く必要があります。" },
            { "Subtracting the second equation from the first eliminates x directly.", "第一の式から第二の式を引くと、そのまま x が消えます。" },
            { "Both expressions for 2y can be equated directly, since both equations are solved for 2y.", "両方の式が 2y について解かれているので、2y の式を直接等しいと置けます。" },
            { "One of the equations must first be divided by 2 for equalization to be applicable.", "等値法を使うには、まずどちらかの式を2で割る必要があります。" },
            { "Substituting 2y from the second equation into the first gives the solution.", "第二の式の 2y を第一の式に代入すると解が得られます。" },
            { "Equalization can only be applied when both equations are solved for the same variable without a coefficient.", "等値法は、両方の式が係数のない同じ変数について解かれているときにだけ使えます。" },

            // Option reasons — Efficiency exercises
            { "The first equation is neither solved for x nor for y.", "第一の式は x についても y についても解かれていません。" },
            { "At most y-2 can be substituted into the first equation for the variable x.", "第一の式の変数 x に代入できるのは、せいぜい y-2 だけです。" },
            { "The insertion procedure can be used directly without the need for additional transformations.", "代入法は、追加の変形なしで直接使えます。" },
            { "If you subtract the first equation from the second, you are left with 1y.", "第二の式から第一の式を引くと、1y が残ります。" },
            { "Adding gives an equation containing 6x.", "足すと、6x を含む式になります。" },
            { "Subtracting the first from the second equation leaves 2y.", "第二の式から第一の式を引くと、2y が残ります。" },
            { "If you add both equations together, you get -4x.", "両方の式を足すと、-4x になります。" },
            { "Look carefully at the second equation. x-8 is not the same as y.", "第二の式をよく見てください。x-8 は y と同じではありません。" },
            { "Substitution can be applied directly because y is already isolated.", "y がすでに孤立しているので、代入法を直接使えます。" },
            { "The second equation is already solved for y; that expression can be used directly.", "第二の式はすでに y について解かれているので、その式を直接使えます。" },
            { "Subtracting gives 4y−(−4y)=8y, so y is not eliminated.", "引くと 4y−(−4y)=8y になり、y は消えません。" },
            { "The y-coefficients are already opposite, so no transformation is needed.", "y の係数はすでに反対の符号なので、変形は必要ありません。" },
            { "The x-coefficients are already opposite, so no transformation is needed.", "x の係数はすでに反対の符号なので、変形は必要ありません。" },
            { "Adding directly gives 9x−5y=31; no variable is eliminated.", "そのまま足すと 9x−5y=31 になり、どの変数も消えません。" },
            { "Subtracting gives 3x−15y=−3; y is not eliminated.", "引くと 3x−15y=−3 になり、y は消えません。" },
            { "Substitution can be applied directly because x is already isolated in the first equation.", "第一の式で x がすでに孤立しているので、代入法を直接使えます。" },
            { "The direction of substitution is wrong; y+3 is substituted for x, not the other way around.", "代入の向きが逆です。x の代わりに y+3 を代入します。" },
            { "Since x is already isolated in the first equation, no additional transformations are necessary.", "第一の式で x がすでに孤立しているので、追加の変形は必要ありません。" },
            { "Adding directly gives 15x+3y=39; no variable is eliminated.", "そのまま足すと 15x+3y=39 になり、どの変数も消えません。" },
            { "Subtracting gives 5x−9y=−17; x is not eliminated.", "引くと 5x−9y=−17 になり、x は消えません。" },
            { "The term 2y can be substituted directly into the first equation without first solving the second for y.", "第二の式を y について解かなくても、項 2y を第一の式に直接代入できます。" },
            { "Substitution can be applied directly without the need for additional transformations.", "代入法は、追加の変形なしで直接使えます。" },

            // Option reasons — Matching exercises
            { "The system does not need to be remodelled in order to use the method.", "この方法を使うために、連立方程式を変形する必要はありません。" },
            { "The method cannot be applied directly to the other systems.", "他の連立方程式には、この方法を直接使うことはできません。" },
            { "The other systems can also be solved using the method, but must first be transformed.", "他の連立方程式もこの方法で解けますが、まず変形する必要があります。" },
            { "The method can only be used if at least one of the equations in the system is solved for x or y.", "この方法は、連立方程式の少なくとも1つの式が x または y について解かれている場合にだけ使えます。" },
            { "Several transformations are necessary.", "いくつかの変形が必要です。" },
            { "The other two systems would first have to be remodelled.", "他の2つの連立方程式は、まず変形する必要があります。" },
            { "Only in the selected system is x already isolated.", "選んだ連立方程式でのみ、x がすでに孤立しています。" },
            { "Since x is already isolated, no additional transformations are necessary.", "x がすでに孤立しているので、追加の変形は必要ありません。" },
            { "Subtracting gives −8x−2y=−22; x is not eliminated.", "引くと −8x−2y=−22 になり、x は消えません。" },
            { "The y-coefficients are 5 and 3, not equal in magnitude with opposite signs.", "y の係数は 5 と 3 で、大きさが等しく符号が反対ではありません。" },
            { "The expressions are equated, not subtracted.", "式は引き算するのではなく、等しいと置きます。" },
            { "Equalization can be applied directly because both equations are already solved for y.", "両方の式がすでに y について解かれているので、等値法を直接使えます。" },
            { "Both equations are indeed solved for y, so the method can be applied directly.", "両方の式は実際に y について解かれているので、この方法を直接使えます。" },
            { "The expression 2x can be substituted directly without solving for x.", "x について解かなくても、式 2x を直接代入できます。" },
            { "Since 2x is already isolated in the second equation, this term can be substituted directly into the first.", "第二の式で 2x がすでに孤立しているので、この項を第一の式に直接代入できます。" },
            { "Adding directly gives 9x+y=21; no variable is eliminated.", "そのまま足すと 9x+y=21 になり、どの変数も消えません。" },
            { "Subtracting gives −3x−3y=−15; x is not eliminated.", "引くと −3x−3y=−15 になり、x は消えません。" },
            { "Equalization can be applied directly to 2y without dividing the equations by 2 first.", "式を2で割らなくても、2y に対して等値法を直接使えます。" },
            { "That describes substitution, not equalization.", "それは代入法の説明であり、等値法ではありません。" },
            { "Equalization also works when both equations are solved for a multiple of the same variable.", "等値法は、両方の式が同じ変数の倍数について解かれている場合にも使えます。" }
        };

        public static string? Translate(string? english)
        {
            if (string.IsNullOrEmpty(english))
            {
                return english;
            }

            return Translations.TryGetValue(english, out var japanese) ? japanese : english;
        }
    }
}

using webapi.Models.User;

namespace webapi.Models.Flexibility
{
    /// <summary>
    /// Japanese translations for exercise content that the backend serves in the exercise JSON —
    /// self-explanation option texts and reasons, and the pedagogical agent's motivational messages.
    /// Keyed by the English string, so one translation covers every exercise that uses it.
    ///
    /// This existed as `SelfExplanationJapanese` and was wired to ONLY the self-explanation agent
    /// message, which is why a Japanese student saw English for the first/second-solution, comparison,
    /// resolving and task messages while the self-explanation one was Japanese. It covers all of them
    /// now, and every `Deserialize(language)` picks it up.
    ///
    /// `Translate` returns the English text when a string is not in the dictionary, so a message added
    /// later degrades to the old behaviour instead of throwing or rendering nothing.
    /// </summary>
    public static class ExerciseContentJapanese
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

            { "Recognising that a variable is already on its own saves you a whole rearrangement.", "変数がすでに単独になっていることに気づけば、式を変形する手間を丸ごと省けます。" },
            { "Equal coefficients with opposite signs are the clearest signal for the addition method.", "係数の絶対値が同じで符号だけが違うときは、加減法を使う一番わかりやすい合図です。" },
            { "When both equations already stand solved for the same variable, equating them is the shortest route.", "どちらの式も同じ変数について解かれているなら、それらを等しいとおくのが一番短い道です。" },
            { "A single multiplication turns the two equations into an addition step you can solve directly.", "1回掛け算するだけで、2つの式はそのまま加減法で解ける形になります。" },
            { "When the same multiple of a variable appears on both sides, you can swap the whole term.", "同じ変数の同じ倍数が両方の式にあれば、その項ごと入れ替えられます。" },
            { "Two multiplications are not a detour, they are the fastest way to an equation with one variable.", "2回の掛け算は回り道ではありません。1つの変数だけの式にする一番速い方法です。" },
            { "A negative result is not a mistake. It only shows where the point sits on the number line.", "答えが負の数になっても間違いではありません。その点が数直線のどこにあるかを示しているだけです。" },
            { "When both equations are solved for the same variable, you can equate the right-hand sides.", "どちらの式も同じ変数について解かれていれば、右辺どうしを等しいとおけます。" },
            { "Equal coefficients mean one subtraction and a variable is gone.", "係数が同じなら、1回引くだけで変数が1つ消えます。" },
            { "A term on its own is the fastest starting point: one substitution and a variable is gone.", "単独になっている項は一番速い出発点です。1回代入すれば変数が1つ消えます。" },
            { "The variable does not matter. What matters is that both are solved for the same one.", "どの文字かは問題ではありません。どちらも同じ変数について解かれていることが大切です。" },
            { "Equal coefficients with the same sign mean subtract; with opposite signs, add.", "係数が同じで符号も同じなら引く、符号が違うなら足します。" },
            { "When the multiple you need already stands on the left, you can swap the whole term.", "必要な倍数がすでに左辺にあれば、その項ごと入れ替えられます。" },
            { "A minus in front of the x changes nothing about the procedure. Equating still works.", "x の前にマイナスがあっても手順は変わりません。そのまま等しいとおけます。" },

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

            { "The second equation is already solved for y, so the term 2x-2 can be substituted directly into the first equation.", "2番目の式はすでに y について解かれているので、2x-2 をそのまま1番目の式に代入できます。" },
            { "The first equation must first be solved for x before substituting.", "代入する前に、まず1番目の式を x について解く必要があります。" },
            { "The equalization method is the most direct here because y is already on its own.", "y がすでに単独になっているので、ここでは等置法が一番直接的です。" },
            { "Adding both equations removes x, because 5 and -5 cancel each other out.", "2つの式を足すと、5 と -5 が打ち消し合って x が消えます。" },
            { "The second equation must first be solved for x before substituting.", "代入する前に、まず2番目の式を x について解く必要があります。" },
            { "Both equations are already solved for y and can be equated.", "どちらの式もすでに y について解かれているので、等しいとおけます。" },
            { "The first equation must be multiplied by 2 to remove y.", "y を消すには、1番目の式を2倍する必要があります。" },
            { "Both equations are already solved for y, so the terms can be equated directly.", "どちらの式もすでに y について解かれているので、そのまま等しいとおけます。" },
            { "The second equation must first be solved for y.", "まず2番目の式を y について解く必要があります。" },
            { "Subtracting the first equation from the second removes y.", "2番目の式から1番目の式を引くと y が消えます。" },
            { "The first equation must first be solved for x before the method can be applied.", "この方法を使う前に、まず1番目の式を x について解く必要があります。" },
            { "Multiplying the first equation by 3 gives 6x in both; subtracting removes x.", "1番目の式を3倍するとどちらも 6x になり、引けば x が消えます。" },
            { "The substitution method works here without any transformation.", "ここでは代入法が変形なしでそのまま使えます。" },
            { "Adding both equations removes y.", "2つの式を足すと y が消えます。" },
            { "A single multiplication is not enough; both equations must be multiplied.", "1回の掛け算では足りません。両方の式を掛ける必要があります。" },
            { "The term x-1 already stands for 2y and therefore matches the 2y in the second equation directly.", "x-1 はすでに 2y を表しているので、2番目の式の 2y にそのまま当てはまります。" },
            { "The first equation must first be solved for y because it contains 2y.", "1番目の式には 2y があるので、まず y について解く必要があります。" },
            { "Adding the two equations removes y directly.", "2つの式を足すと y がそのまま消えます。" },
            { "Both equations are solved for x and can be equated.", "どちらの式も x について解かれているので、等しいとおけます。" },
            { "Multiplying the first by 3 and the second by 4 gives 12x in both; subtracting removes x.", "1番目を3倍、2番目を4倍するとどちらも 12x になり、引けば x が消えます。" },
            { "Adding both equations removes one variable.", "2つの式を足すと変数が1つ消えます。" },
            { "The substitution method can be applied here without any transformation.", "ここでは代入法が変形なしで使えます。" },
            { "A single multiplication is enough to line up the coefficients.", "1回の掛け算で係数がそろいます。" },
            { "The first equation is already solved for x, so the term 3-y can be substituted directly into the second equation.", "1番目の式はすでに x について解かれているので、3-y をそのまま2番目の式に代入できます。" },
            { "The first equation must first be solved for y.", "まず1番目の式を y について解く必要があります。" },
            { "Subtracting the second equation from the first removes a variable.", "1番目の式から2番目の式を引くと変数が1つ消えます。" },
            { "A negative result cannot come out of this task.", "この問題で負の答えになることはありません。" },

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

            { "The other two systems would first have to be solved for the same variable.", "ほかの2つの連立方程式は、まず同じ変数について解く必要があります。" },
            { "Equating only works when the two equations are solved for different variables.", "等置は、2つの式が違う変数について解かれているときだけ使えます。" },
            { "Both equations contain 3x; subtracting removes x and leaves y on its own.", "どちらの式にも 3x があるので、引くと x が消えて y だけが残ります。" },
            { "In the other two systems no variable can be removed without multiplying first.", "ほかの2つの連立方程式では、先に掛け算をしないとどの変数も消せません。" },
            { "Both equations must first be multiplied by a factor.", "まず両方の式に同じ数を掛ける必要があります。" },
            { "Adding the two equations removes x.", "2つの式を足すと x が消えます。" },
            { "The first equation is already solved for x, so the term 4y-3 can be substituted directly into the second equation.", "1番目の式はすでに x について解かれているので、4y-3 をそのまま2番目の式に代入できます。" },
            { "The other two systems would first have to be solved for a variable.", "ほかの2つの連立方程式は、まずどれかの変数について解く必要があります。" },
            { "Subtracting the second equation from the first removes x.", "1番目の式から2番目の式を引くと x が消えます。" },
            { "Both equations are already solved for x, so the terms can be equated directly.", "どちらの式もすでに x について解かれているので、そのまま等しいとおけます。" },
            { "Both equations must first be solved for x.", "まず両方の式を x について解く必要があります。" },
            { "Equating only works for systems in the form y = ...", "等置は y = … の形の連立方程式でしか使えません。" },
            { "Both equations contain 5x; subtracting them removes x and leaves y on its own.", "どちらの式にも 5x があるので、引くと x が消えて y だけが残ります。" },
            { "The other two systems would first have to be multiplied by a factor.", "ほかの2つの連立方程式は、まず何かを掛けて変形する必要があります。" },
            { "Adding the equations removes one variable.", "2つの式を足すと変数が1つ消えます。" },
            { "The term 3x-4 already stands for 2y and matches the 2y in the second equation directly.", "3x-4 はすでに 2y を表しているので、2番目の式の 2y にそのまま当てはまります。" },
            { "Adding the equations removes y.", "2つの式を足すと y が消えます。" },
            { "Both equations are solved for y, so the terms can be equated even with a minus sign in front.", "どちらの式も y について解かれているので、x の前にマイナスがあっても等しいとおけます。" },
            { "Equating does not work when a negative coefficient appears.", "負の係数が出てくると、等置は使えません。" },

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

            { "The second equation is already solved for y; no transformation is needed.", "2番目の式はすでに y について解かれているので、変形は必要ありません。" },
            { "The second equation is already solved for y and can be substituted exactly as it stands.", "2番目の式はすでに y について解かれているので、そのままの形で代入できます。" },
            { "The first equation is not solved for y and would have to be rearranged.", "1番目の式は y について解かれていないので、変形が必要です。" },
            { "The addition method can be applied without any transformation.", "加減法は変形なしでそのまま使えます。" },
            { "The first has 3y and the second 4y; neither is solved for y.", "1番目は 3y、2番目は 4y で、どちらも y について解かれていません。" },
            { "Adding already removes x; no multiplication is needed.", "足すだけで x が消えるので、掛け算は必要ありません。" },
            { "The second equation is already solved for y.", "2番目の式はすでに y について解かれています。" },
            { "Subtracting leaves -4x + 16; y does drop out, but no transformation was needed for that.", "引くと -4x + 16 が残ります。y は確かに消えますが、そのために変形は必要ありませんでした。" },
            { "It is solved for y, which is exactly what equating needs.", "y について解かれているので、等置に必要な形そのものです。" },
            { "Neither equation is solved for a variable.", "どちらの式も、どの変数についても解かれていません。" },
            { "Adding gives 8x + 3y = 17; no variable drops out.", "足すと 8x + 3y = 17 になり、どの変数も消えません。" },
            { "Multiplying only the first equation by 3 already lines up the coefficients of x.", "1番目の式を3倍するだけで、x の係数はそろいます。" },
            { "The term x-1 stands for 2y and matches the 2y in the second equation exactly.", "x-1 は 2y を表しており、2番目の式の 2y にそのまま当てはまります。" },
            { "Both equations contain 2y; adding leaves 4y in place.", "どちらの式にも 2y があるので、足すと 4y が残ります。" },
            { "Only the first equation isolates a term; the second does not.", "1番目の式だけが項を単独にしています。2番目はそうではありません。" },
            { "Adding gives 7x + 8y = 37; no variable drops out.", "足すと 7x + 8y = 37 になり、どの変数も消えません。" },
            { "No equation is solved for a variable.", "どの式も変数について解かれていません。" },
            { "The coefficients are 4 and 3, and 3 and 5; two multiplications are needed.", "係数は 4 と 3、3 と 5 なので、2回掛け算が必要です。" },
            { "It is solved for x, which is exactly what substituting needs.", "x について解かれているので、代入に必要な形そのものです。" },
            { "Subtracting gives -3x - 2y = -5; no variable drops out.", "引くと -3x - 2y = -5 になり、どの変数も消えません。" },
            { "Substituting gives y = 4 and x = -1, so a negative result is possible.", "代入すると y = 4、x = -1 になるので、負の答えもあり得ます。" },

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
            { "Equalization also works when both equations are solved for a multiple of the same variable.", "等値法は、両方の式が同じ変数の倍数について解かれている場合にも使えます。" },

            { "Both are already in the form y = ...", "どちらもすでに y = … の形になっています。" },
            { "It works precisely when both are solved for the same variable.", "どちらも同じ変数について解かれているときに、まさにうまくいきます。" },
            { "The coefficients of x are already equal in both equations.", "x の係数はどちらの式でもすでに同じです。" },
            { "Adding gives 6x - 3y = 3; x stays in place.", "足すと 6x - 3y = 3 になり、x は残ります。" },
            { "Subtracting gives -x - 3y = 4y - 19; x stays in place.", "引くと -x - 3y = 4y - 19 になり、x は残ります。" },
            { "Both are already solved for x.", "どちらもすでに x について解かれています。" },
            { "It works with any variable, as long as both are solved for the same one.", "どちらも同じ変数について解かれていれば、どの文字でも使えます。" },
            { "Adding gives 10x - y = 13; no variable drops out.", "足すと 10x - y = 13 になり、どの変数も消えません。" },
            { "The coefficients of x are already equal; one subtraction is enough.", "x の係数はすでに同じなので、1回引くだけで足ります。" },
            { "The term 3x-4 stands for 2y and fits without a transformation.", "3x-4 は 2y を表しており、変形しなくてもそのまま当てはまります。" },
            { "Both contain 2y; adding leaves 4y in place.", "どちらにも 2y があるので、足すと 4y が残ります。" },
            { "It works regardless of sign, as long as both are solved for the same variable.", "どちらも同じ変数について解かれていれば、符号に関係なく使えます。" },

            // ── Agent messages: comparing methods (Suitability) ──────────────────────────────────
            { "In exams, you often need to know different approaches. Comparing different methods prepares you optimally for this.", "試験では、さまざまな解き方を知っていることがよく求められます。いろいろな方法を比較することで、それに十分備えられます。" },
            { "Each method has its advantages and disadvantages. By comparing them, you will learn which method is best used when.", "それぞれの方法には長所と短所があります。比較することで、どの方法をいつ使うのが最適かが分かります。" },
            { "By comparing them, you will learn which methods are faster or easier. This helps you to work more efficiently and make better use of your time.", "比較することで、どの方法が速いか、簡単かが分かります。より効率よく作業でき、時間をうまく使えるようになります。" },
            { "The comparison shows you how different approaches can lead to the same result. This broadens your understanding and shows you new perspectives.", "比較することで、違う解き方でも同じ結果にたどり着けることが分かります。理解が広がり、新しい視点が得られます。" },
            { "Comparing different methods deepens your understanding of mathematical concepts and how they are related.", "さまざまな方法を比較すると、数学的な概念とそのつながりについての理解が深まります。" },
            { "Comparing different methods helps you to recognise and correct possible errors. You can see if and where you are wrong with a method.", "さまざまな方法を比較すると、間違いに気づいて直しやすくなります。どの方法で、どこを間違えたのかが分かります。" },
            { "If you know and can compare several methods, you are more flexible and can choose the best method depending on the problem.", "いくつかの方法を知り、比べられると、より柔軟になり、問題に応じて最適な方法を選べます。" },
            { "Comparing methods sharpens your judgement for the most efficient approach.", "方法を比較することで、最も効率的な解き方を見極める力が磨かれます。" },
            { "Knowing several methods makes you more flexible and adaptable.", "いくつかの方法を知っていると、より柔軟に対応できます。" },
            { "Comparing methods shows you which approach is most suitable for certain tasks.", "方法を比較することで、ある課題にどの解き方が最も適しているかが分かります。" },

            { "Solving two equations for the same variable is exactly the preparation the equalization method needs.", "2つの式を同じ変数について解くことは、まさに等置法の準備そのものです。" },
            { "Matching coefficients with opposite signs are the signal for the addition method.", "係数が同じで符号が違うときは、加減法を使う合図です。" },
            { "A term that is already on its own is an invitation to substitute.", "すでに単独になっている項は、代入しましょうという合図です。" },
            { "When both equations need rearranging, pick the method with the fewest intermediate steps.", "どちらの式も変形が必要なときは、途中の計算が一番少ない方法を選びましょう。" },

            // ── Agent messages: calculating by hand (first/second solution) ──────────────────────
            { "If you regularly calculate by hand, you will become faster and more efficient at solving tasks.", "定期的に手計算をすると、問題をより速く、効率よく解けるようになります。" },
            { "Computers sometimes make mistakes or are operated incorrectly. If you regularly calculate by hand, you can easily recognise and correct such errors.", "コンピューターは時々間違えたり、操作を誤ったりします。定期的に手計算をすると、そうした間違いに気づいて直しやすくなります。" },
            { "Solving equations by hand makes you less dependent on technology.", "手計算で方程式を解くと、技術への依存が少なくなります。" },
            { "If you regularly calculate by hand, you will learn to work more accurately and pay attention to details.", "定期的に手計算をすると、より正確に、細部に気を配って作業できるようになります。" },
            { "If you regularly calculate by hand, you will become faster and more efficient.", "定期的に手計算をすると、より速く、効率的になります。" },
            { "If you regularly calculate by hand, you will continuously expand and improve your maths skills.", "定期的に手計算をすると、数学の力が絶えず伸びていきます。" },
            { "By calculating by hand, you will better understand how mathematical concepts and rules are related.", "手計算をすることで、数学的な概念と法則のつながりをよりよく理解できます。" },
            { "Trying out different calculations by hand makes you flexible and adaptable when solving problems.", "いろいろな計算を手で試すと、問題を解くときに柔軟に対応できるようになります。" },
            { "By calculating by hand, you will better understand how mathematical concepts are related.", "手計算をすることで、数学的な概念同士のつながりをよりよく理解できます。" },
            { "If you calculate by hand, you become less dependent on technical aids and can rely on your own skills.", "手計算をすると、道具への依存が減り、自分の力に頼れるようになります。" },
            { "Calculators and computers are not always available. If you can calculate by hand, you are well prepared in any situation.", "電卓やコンピューターがいつも使えるとは限りません。手計算ができれば、どんな状況でも十分に対応できます。" },
            { "If you calculate by hand, you understand the individual steps better and can recognise and correct errors more quickly.", "手計算をすると、一つ一つの手順をよりよく理解でき、間違いにも早く気づいて直せます。" },
            { "If you can solve simple equations by hand, you will be better prepared to tackle complex problems.", "簡単な方程式を手で解けると、複雑な問題に取り組む備えができます。" },
            { "Manual calculations are required in many exams. Regular practice prepares you optimally for this.", "多くの試験では手計算が必要です。定期的に練習することで、それに十分備えられます。" },
            { "If you calculate by hand, you learn to work more precisely and pay attention to details.", "手計算をすると、より正確に、細部に気を配って作業できるようになります。" },
            { "Computers sometimes make mistakes. If you regularly calculate by hand, you can easily recognise and correct such errors.", "コンピューターは時々間違えます。定期的に手計算をすると、そうした間違いに気づいて直しやすくなります。" },
            { "Many everyday problems require basic mathematical knowledge, which you will deepen through manual calculation.", "日常の多くの問題には基礎的な数学の知識が必要で、手計算を通じてそれを深められます。" },
            { "If you calculate by hand, you become less dependent on technical aids.", "手計算をすると、道具への依存が少なくなります。" },
            { "Regularly practising different methods prepares you optimally for exams.", "さまざまな方法を定期的に練習すると、試験に十分備えられます。" },

            { "Rearranging an equation cleverly is often half the way to the answer.", "式をうまく変形できるかどうかが、答えまでの道のりの半分を決めることがよくあります。" },
            { "In exams you often need to know different approaches. Comparing them prepares you.", "試験ではいくつもの解き方を知っていることが役立ちます。それらを比べておくことが準備になります。" },
            { "Once you spot the pattern you need not a single intermediate step.", "このパターンに気づければ、途中の計算は一つもいりません。" },
            { "Working by hand makes you faster and surer at spotting patterns like this.", "手を動かして計算すると、こうしたパターンに気づくのが速く、確実になります。" },
            { "A glance at the shape often saves you several steps of working.", "式の形をひと目見るだけで、何手も計算を省けることがよくあります。" },
            { "Knowing several routes makes you more flexible at solving problems.", "いくつもの解き方を知っていると、問題を解くときに柔軟に対応できます。" },
            { "First see which factor lines the coefficients up, then calculate.", "まずどの数を掛ければ係数がそろうかを見つけてから計算しましょう。" },
            { "Seeing the structure saves time and avoids careless mistakes.", "構造を見抜けると時間が節約でき、うっかりミスも減ります。" },
            { "A coefficient other than 1 is no obstacle when the matching term is already there.", "同じ項がすでにそろっていれば、係数が1でなくても何の問題もありません。" },
            { "It pays to look closely: often the term fits without any rearrangement.", "よく見ることが大切です。変形しなくてもそのまま使える項がよくあります。" },
            { "Look systematically for the smallest common factor and it goes quickly.", "最小公倍数を意識して探せば、すぐに係数がそろいます。" },
            { "Tasks like this train your eye for structure, which saves time in exams.", "こうした問題は構造を見る目を鍛えてくれ、試験で時間の余裕につながります。" },
            { "A term on its own is always an invitation to substitute, minus sign or not.", "単独になっている項は、マイナスがついていても代入の合図です。" },
            { "Being confident with negative numbers keeps you from losing your thread.", "負の数に慣れておくと、計算の流れを見失わずに済みます。" },
            { "Once you recognise the form you need no intermediate step.", "形に気づければ、途中の計算は必要ありません。" },
            { "Comparing different systems sharpens your eye for the right method.", "いろいろな連立方程式を比べると、どの方法が合うかを見る目が育ちます。" },
            { "Compare the coefficients before you calculate. It saves work.", "計算する前に係数を見比べましょう。そのほうが手間が減ります。" },
            { "Practising mental arithmetic helps you see patterns like this faster.", "暗算の練習をすると、こうしたパターンにも早く気づけるようになります。" },
            { "One look is enough when you watch the shape of the equations.", "式の形に注目すれば、ひと目で判断できます。" },
            { "Knowing several methods makes you more flexible at solving.", "いくつもの方法を知っていると、解き方の幅が広がります。" },
            { "Watch the shape, not the letter.", "文字ではなく、式の形に注目しましょう。" },
            { "Check first, then calculate: it saves many steps.", "まず確認してから計算しましょう。それだけで何手も省けます。" },
            { "A quick look at the signs tells you whether to add or subtract.", "符号をちらっと見れば、足すのか引くのかがわかります。" },
            { "Telling the two cases apart is what makes you sure with the addition method.", "この2つの場合を区別できることが、加減法への自信につながります。" },
            { "You do not have to rearrange when the matching term is already there.", "同じ項がすでにあれば、変形する必要はありません。" },
            { "Looking closely saves you a whole step of working here.", "よく見るだけで、ここでは計算の一手間を丸ごと省けます。" },
            { "Do not let signs put you off: the shape decides, not the minus.", "符号に惑わされないでください。決め手は形であって、マイナスではありません。" },
            { "Confidence with negative numbers makes you faster in many tasks.", "負の数に慣れると、多くの問題で計算が速くなります。" },
            { "Solving equations for a variable shows you straight away which method suggests itself.", "式をある変数について解いてみると、どの方法が向いているかがすぐにわかります。" },
            { "Rearranging both equations cleverly saves time. Regular practice makes you confident at it.", "2つの式をうまく変形できると時間が節約できます。練習を重ねれば自信がつきます。" },
            { "Adding the equations cleverly removes one variable, so you only work with one.", "式をうまく足すと変数が1つ消え、1つの変数だけで計算できます。" },
            { "Rearrange first, solve second: one step more, but it always gets you there.", "まず変形してから解く。手間は1つ増えますが、必ず答えにたどりつけます。" },
            { "When a variable is already on its own you can substitute its term directly and save a rearrangement.", "変数がすでに単独になっていれば、その項をそのまま代入でき、変形の手間を省けます。" },
            { "A second route through the addition method shows both methods reach the same result.", "加減法という2つ目の道を通ると、どちらの方法でも同じ答えになることがわかります。" },
            { "When no variable is on its own you rearrange first. That is the price for a clean route through.", "どの変数も単独になっていないときは、まず式を変形します。それがすっきり解くための代償です。" },
            { "The addition method with prior multiplication is shorter here, but demands more of an overview.", "先に掛け算をする加減法のほうがここでは短く済みますが、全体を見渡す力が要ります。" },

            // ── Agent messages: trying an alternative method (Resolving) ─────────────────────────
            { "Trying out different methods shows you that there are often several ways to solve a problem.", "いろいろな方法を試すと、一つの問題に解き方がいくつもあることが多いと分かります。" },
            { "An alternative method can be faster and more efficient. By practising different approaches, you will find the method that suits you best.", "別の方法のほうが速く効率的なこともあります。いろいろな解き方を練習すると、自分に合った方法が見つかります。" },
            { "By trying out a different method, you discover new ways to solve the problem. This will help you to find out which method is quickest or easiest, which will help you to work more efficiently.", "別の方法を試すと、問題の新しい解き方に気づけます。どの方法が一番速いか、簡単かが分かり、より効率よく作業できます。" },
            { "If you master different methods, you can react flexibly to different problems.", "さまざまな方法を使いこなせると、いろいろな問題に柔軟に対応できます。" },
            { "If you know several methods, you are more flexible and can choose the best method depending on the problem.", "いくつかの方法を知っていると、より柔軟になり、問題に応じて最適な方法を選べます。" },
            { "If you have mastered different methods, you will be better prepared for more complex problems. You can then choose the method that best suits the problem at hand.", "さまざまな方法を使いこなせると、より複雑な問題にも備えられます。目の前の問題に最も適した方法を選べるようになります。" },
            { "If you try out a different method, you may notice mistakes that you previously overlooked. This will help you to work more precisely and improve your skills.", "別の方法を試すと、これまで見落としていた間違いに気づくことがあります。より正確に作業でき、力も伸びます。" },
            { "Solving a problem in several ways deepens your understanding of the connections.", "一つの問題をいくつもの方法で解くと、つながりについての理解が深まります。" },
            { "If you try out a different method, you may notice mistakes that you previously overlooked.", "別の方法を試すと、これまで見落としていた間違いに気づくことがあります。" },
            { "If you try a different method, you can immediately see which method is most efficient for this system.", "別の方法を試すと、この連立方程式にどの方法が最も効率的かがすぐに分かります。" },

            // ── Comparison step descriptions (Suitability)
            { "Your classmate subtracted the first equation from the second to remove y.", "クラスメートは y を消すために、2番目の式から1番目の式を引きました。" },
            { "Then they divided by -5 and so calculated x.", "次に両辺を -5 で割って x を求めました。" },
            { "To calculate y, they substituted the solution for x into the first equation.", "y を求めるために、x の答えを1番目の式に代入しました。" },
            { "Your classmate solved both equations for x so that they could be equated.", "クラスメートは等しいとおけるように、どちらの式も x について解きました。" },
            { "Equating the two expressions leaves an equation containing only y.", "2つの式を等しいとおくと、y だけの式が残ります。" },
            { "Finally they substituted y into one of the rearranged equations.", "最後に、変形した式の1つに y を代入しました。" },
            { "Your classmate multiplied the first equation by 2 so that x has the same number in front of it in both equations.", "クラスメートは、どちらの式でも x の前の数が同じになるように、1番目の式を2倍しました。" },
            { "Then they subtracted the new first equation from the second, removing x.", "次に、新しい1番目の式を2番目の式から引いて x を消しました。" },
            { "Last they substituted y into the first equation and calculated x.", "最後に y を1番目の式に代入して x を求めました。" },
            { "Your classmate solved the first equation for x.", "クラスメートは1番目の式を x について解きました。" },
            { "They substituted this term into the second equation.", "その式を2番目の式に代入しました。" },
            { "Finally they substituted y into the rearranged first equation.", "最後に、変形した1番目の式に y を代入しました。" },

            // ── Agent messages: what this task teaches (Tip exercises) ───────────────────────────
            { "In this task, you will learn an additional strategy that can also help you with other tasks.", "この課題では、他の課題にも役立つ追加のやり方を学びます。" },
            { "In this task, you will learn how to use the substitution method even more efficiently. This will also prepare you well for more difficult tasks.", "この課題では、代入法をさらに効率よく使う方法を学びます。より難しい課題への備えにもなります。" },

            // ── Tip-exercise questions, rendered as-is when the data sets them ──────────────────
            { "Did you know that you can also use the equation method if both equations in the system are solved for the same multiple of a variable? Would you like to try out such a task?", "連立方程式の両方の式が、同じ変数の同じ倍数について解かれている場合にも、等値法が使えることを知っていましたか？そのような問題を試してみませんか？" },
            { "Did you know that you can also substitute the term belonging to a multiple of a variable into the other equation if the same multiple of the variable occurs in this equation? Would you like to try out an example of this substitution method?", "ある式に変数の同じ倍数が含まれているとき、その倍数の項を他の式に代入できることを知っていましたか？この代入法の例を試してみませんか？" }
        };

        public static string? Translate(string? english)
        {
            if (string.IsNullOrEmpty(english))
            {
                return english;
            }

            return Translations.TryGetValue(english, out var japanese) ? japanese : english;
        }

        /// <summary>
        /// Picks the text for a language: German for de, the Japanese translation for ja, English
        /// otherwise. Null-safe in both directions: a field the data leaves unset stays null instead
        /// of becoming an empty string, because the client treats null as "fall back to the UI string"
        /// and an empty string as "render nothing" — turning one into the other blanks the line.
        ///
        /// Every Deserialize(language) goes through here, so a new field cannot be wired for German
        /// and silently forgotten for Japanese, which is how the agent messages went untranslated
        /// while the self-explanation one was fine.
        /// </summary>
        public static string? Pick(Language language, string? de, string? en)
        {
            if (language == Language.de)
            {
                return de;
            }

            return language == Language.ja ? Translate(en) : en;
        }
    }
}

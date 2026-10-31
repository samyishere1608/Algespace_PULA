"""
Japanese for the exercises added to reach 51 (Suitability 14-17, Efficiency 11-17, Matching 11-17).

Keyed by the English string, the same way ExerciseContentJapanese.Translations is, so inserting
these is a merge rather than a second dictionary to keep in step.

Grouped so write_japanese.py can drop each list into the matching section of the C# file.
"""

SELF_EXPLANATION_AGENT = {
    "Recognising that a variable is already on its own saves you a whole rearrangement.":
        "変数がすでに単独になっていることに気づけば、式を変形する手間を丸ごと省けます。",
    "Equal coefficients with opposite signs are the clearest signal for the addition method.":
        "係数の絶対値が同じで符号だけが違うときは、加減法を使う一番わかりやすい合図です。",
    "When both equations already stand solved for the same variable, equating them is the shortest route.":
        "どちらの式も同じ変数について解かれているなら、それらを等しいとおくのが一番短い道です。",
    "A single multiplication turns the two equations into an addition step you can solve directly.":
        "1回掛け算するだけで、2つの式はそのまま加減法で解ける形になります。",
    "When the same multiple of a variable appears on both sides, you can swap the whole term.":
        "同じ変数の同じ倍数が両方の式にあれば、その項ごと入れ替えられます。",
    "Two multiplications are not a detour, they are the fastest way to an equation with one variable.":
        "2回の掛け算は回り道ではありません。1つの変数だけの式にする一番速い方法です。",
    "A negative result is not a mistake. It only shows where the point sits on the number line.":
        "答えが負の数になっても間違いではありません。その点が数直線のどこにあるかを示しているだけです。",
    "When both equations are solved for the same variable, you can equate the right-hand sides.":
        "どちらの式も同じ変数について解かれていれば、右辺どうしを等しいとおけます。",
    "Equal coefficients mean one subtraction and a variable is gone.":
        "係数が同じなら、1回引くだけで変数が1つ消えます。",
    "A term on its own is the fastest starting point: one substitution and a variable is gone.":
        "単独になっている項は一番速い出発点です。1回代入すれば変数が1つ消えます。",
    "The variable does not matter. What matters is that both are solved for the same one.":
        "どの文字かは問題ではありません。どちらも同じ変数について解かれていることが大切です。",
    "Equal coefficients with the same sign mean subtract; with opposite signs, add.":
        "係数が同じで符号も同じなら引く、符号が違うなら足します。",
    "When the multiple you need already stands on the left, you can swap the whole term.":
        "必要な倍数がすでに左辺にあれば、その項ごと入れ替えられます。",
    "A minus in front of the x changes nothing about the procedure. Equating still works.":
        "x の前にマイナスがあっても手順は変わりません。そのまま等しいとおけます。",
}

OPTIONS_EFFICIENCY = {
    "The second equation is already solved for y, so the term 2x-2 can be substituted directly into the first equation.":
        "2番目の式はすでに y について解かれているので、2x-2 をそのまま1番目の式に代入できます。",
    "The first equation must first be solved for x before substituting.":
        "代入する前に、まず1番目の式を x について解く必要があります。",
    "The equalization method is the most direct here because y is already on its own.":
        "y がすでに単独になっているので、ここでは等置法が一番直接的です。",
    "Adding both equations removes x, because 5 and -5 cancel each other out.":
        "2つの式を足すと、5 と -5 が打ち消し合って x が消えます。",
    "The second equation must first be solved for x before substituting.":
        "代入する前に、まず2番目の式を x について解く必要があります。",
    "Both equations are already solved for y and can be equated.":
        "どちらの式もすでに y について解かれているので、等しいとおけます。",
    "The first equation must be multiplied by 2 to remove y.":
        "y を消すには、1番目の式を2倍する必要があります。",
    "Both equations are already solved for y, so the terms can be equated directly.":
        "どちらの式もすでに y について解かれているので、そのまま等しいとおけます。",
    "The second equation must first be solved for y.":
        "まず2番目の式を y について解く必要があります。",
    "Subtracting the first equation from the second removes y.":
        "2番目の式から1番目の式を引くと y が消えます。",
    "The first equation must first be solved for x before the method can be applied.":
        "この方法を使う前に、まず1番目の式を x について解く必要があります。",
    "Multiplying the first equation by 3 gives 6x in both; subtracting removes x.":
        "1番目の式を3倍するとどちらも 6x になり、引けば x が消えます。",
    "The substitution method works here without any transformation.":
        "ここでは代入法が変形なしでそのまま使えます。",
    "Adding both equations removes y.":
        "2つの式を足すと y が消えます。",
    "A single multiplication is not enough; both equations must be multiplied.":
        "1回の掛け算では足りません。両方の式を掛ける必要があります。",
    "The term x-1 already stands for 2y and therefore matches the 2y in the second equation directly.":
        "x-1 はすでに 2y を表しているので、2番目の式の 2y にそのまま当てはまります。",
    "The first equation must first be solved for y because it contains 2y.":
        "1番目の式には 2y があるので、まず y について解く必要があります。",
    "Adding the two equations removes y directly.":
        "2つの式を足すと y がそのまま消えます。",
    "Both equations are solved for x and can be equated.":
        "どちらの式も x について解かれているので、等しいとおけます。",
    "Multiplying the first by 3 and the second by 4 gives 12x in both; subtracting removes x.":
        "1番目を3倍、2番目を4倍するとどちらも 12x になり、引けば x が消えます。",
    "Adding both equations removes one variable.":
        "2つの式を足すと変数が1つ消えます。",
    "The substitution method can be applied here without any transformation.":
        "ここでは代入法が変形なしで使えます。",
    "A single multiplication is enough to line up the coefficients.":
        "1回の掛け算で係数がそろいます。",
    "The first equation is already solved for x, so the term 3-y can be substituted directly into the second equation.":
        "1番目の式はすでに x について解かれているので、3-y をそのまま2番目の式に代入できます。",
    "The first equation must first be solved for y.":
        "まず1番目の式を y について解く必要があります。",
    "Subtracting the second equation from the first removes a variable.":
        "1番目の式から2番目の式を引くと変数が1つ消えます。",
    "A negative result cannot come out of this task.":
        "この問題で負の答えになることはありません。",
}

OPTIONS_MATCHING = {
    "The other two systems would first have to be solved for the same variable.":
        "ほかの2つの連立方程式は、まず同じ変数について解く必要があります。",
    "Equating only works when the two equations are solved for different variables.":
        "等置は、2つの式が違う変数について解かれているときだけ使えます。",
    "Both equations contain 3x; subtracting removes x and leaves y on its own.":
        "どちらの式にも 3x があるので、引くと x が消えて y だけが残ります。",
    "In the other two systems no variable can be removed without multiplying first.":
        "ほかの2つの連立方程式では、先に掛け算をしないとどの変数も消せません。",
    "Both equations must first be multiplied by a factor.":
        "まず両方の式に同じ数を掛ける必要があります。",
    "Adding the two equations removes x.":
        "2つの式を足すと x が消えます。",
    "The first equation is already solved for x, so the term 4y-3 can be substituted directly into the second equation.":
        "1番目の式はすでに x について解かれているので、4y-3 をそのまま2番目の式に代入できます。",
    "The other two systems would first have to be solved for a variable.":
        "ほかの2つの連立方程式は、まずどれかの変数について解く必要があります。",
    "Subtracting the second equation from the first removes x.":
        "1番目の式から2番目の式を引くと x が消えます。",
    "Both equations are already solved for x, so the terms can be equated directly.":
        "どちらの式もすでに x について解かれているので、そのまま等しいとおけます。",
    "Both equations must first be solved for x.":
        "まず両方の式を x について解く必要があります。",
    "Equating only works for systems in the form y = ...":
        "等置は y = … の形の連立方程式でしか使えません。",
    "Both equations contain 5x; subtracting them removes x and leaves y on its own.":
        "どちらの式にも 5x があるので、引くと x が消えて y だけが残ります。",
    "The other two systems would first have to be multiplied by a factor.":
        "ほかの2つの連立方程式は、まず何かを掛けて変形する必要があります。",
    "Adding the equations removes one variable.":
        "2つの式を足すと変数が1つ消えます。",
    "The term 3x-4 already stands for 2y and matches the 2y in the second equation directly.":
        "3x-4 はすでに 2y を表しているので、2番目の式の 2y にそのまま当てはまります。",
    "Adding the equations removes y.":
        "2つの式を足すと y が消えます。",
    "Both equations are solved for y, so the terms can be equated even with a minus sign in front.":
        "どちらの式も y について解かれているので、x の前にマイナスがあっても等しいとおけます。",
    "Equating does not work when a negative coefficient appears.":
        "負の係数が出てくると、等置は使えません。",
}

REASONS_EFFICIENCY = {
    "The second equation is already solved for y; no transformation is needed.":
        "2番目の式はすでに y について解かれているので、変形は必要ありません。",
    "The second equation is already solved for y and can be substituted exactly as it stands.":
        "2番目の式はすでに y について解かれているので、そのままの形で代入できます。",
    "The first equation is not solved for y and would have to be rearranged.":
        "1番目の式は y について解かれていないので、変形が必要です。",
    "The addition method can be applied without any transformation.":
        "加減法は変形なしでそのまま使えます。",
    "The first has 3y and the second 4y; neither is solved for y.":
        "1番目は 3y、2番目は 4y で、どちらも y について解かれていません。",
    "Adding already removes x; no multiplication is needed.":
        "足すだけで x が消えるので、掛け算は必要ありません。",
    "The second equation is already solved for y.":
        "2番目の式はすでに y について解かれています。",
    "Subtracting leaves -4x + 16; y does drop out, but no transformation was needed for that.":
        "引くと -4x + 16 が残ります。y は確かに消えますが、そのために変形は必要ありませんでした。",
    "It is solved for y, which is exactly what equating needs.":
        "y について解かれているので、等置に必要な形そのものです。",
    "Neither equation is solved for a variable.":
        "どちらの式も、どの変数についても解かれていません。",
    "Adding gives 8x + 3y = 17; no variable drops out.":
        "足すと 8x + 3y = 17 になり、どの変数も消えません。",
    "Multiplying only the first equation by 3 already lines up the coefficients of x.":
        "1番目の式を3倍するだけで、x の係数はそろいます。",
    "The term x-1 stands for 2y and matches the 2y in the second equation exactly.":
        "x-1 は 2y を表しており、2番目の式の 2y にそのまま当てはまります。",
    "Both equations contain 2y; adding leaves 4y in place.":
        "どちらの式にも 2y があるので、足すと 4y が残ります。",
    "Only the first equation isolates a term; the second does not.":
        "1番目の式だけが項を単独にしています。2番目はそうではありません。",
    "Adding gives 7x + 8y = 37; no variable drops out.":
        "足すと 7x + 8y = 37 になり、どの変数も消えません。",
    "No equation is solved for a variable.":
        "どの式も変数について解かれていません。",
    "The coefficients are 4 and 3, and 3 and 5; two multiplications are needed.":
        "係数は 4 と 3、3 と 5 なので、2回掛け算が必要です。",
    "It is solved for x, which is exactly what substituting needs.":
        "x について解かれているので、代入に必要な形そのものです。",
    "Subtracting gives -3x - 2y = -5; no variable drops out.":
        "引くと -3x - 2y = -5 になり、どの変数も消えません。",    "Substituting gives y = 4 and x = -1, so a negative result is possible.":
        "代入すると y = 4、x = -1 になるので、負の答えもあり得ます。",
}

REASONS_MATCHING = {
    "Both are already in the form y = ...":
        "どちらもすでに y = … の形になっています。",
    "It works precisely when both are solved for the same variable.":
        "どちらも同じ変数について解かれているときに、まさにうまくいきます。",
    "The coefficients of x are already equal in both equations.":
        "x の係数はどちらの式でもすでに同じです。",
    "Adding gives 6x - 3y = 3; x stays in place.":
        "足すと 6x - 3y = 3 になり、x は残ります。",
    "Subtracting gives -x - 3y = 4y - 19; x stays in place.":
        "引くと -x - 3y = 4y - 19 になり、x は残ります。",
    "Both are already solved for x.":
        "どちらもすでに x について解かれています。",
    "It works with any variable, as long as both are solved for the same one.":
        "どちらも同じ変数について解かれていれば、どの文字でも使えます。",
    "Adding gives 10x - y = 13; no variable drops out.":
        "足すと 10x - y = 13 になり、どの変数も消えません。",
    "The coefficients of x are already equal; one subtraction is enough.":
        "x の係数はすでに同じなので、1回引くだけで足ります。",
    "The term 3x-4 stands for 2y and fits without a transformation.":
        "3x-4 は 2y を表しており、変形しなくてもそのまま当てはまります。",
    "Both contain 2y; adding leaves 4y in place.":
        "どちらにも 2y があるので、足すと 4y が残ります。",
    "It works regardless of sign, as long as both are solved for the same variable.":
        "どちらも同じ変数について解かれていれば、符号に関係なく使えます。",
}

COMPARISON_AGENT = {
    "Solving two equations for the same variable is exactly the preparation the equalization method needs.":
        "2つの式を同じ変数について解くことは、まさに等置法の準備そのものです。",
    "Matching coefficients with opposite signs are the signal for the addition method.":
        "係数が同じで符号が違うときは、加減法を使う合図です。",
    "A term that is already on its own is an invitation to substitute.":
        "すでに単独になっている項は、代入しましょうという合図です。",
    "When both equations need rearranging, pick the method with the fewest intermediate steps.":
        "どちらの式も変形が必要なときは、途中の計算が一番少ない方法を選びましょう。",
}

FIRST_SECOND_SOLUTION_AGENT = {
    "Rearranging an equation cleverly is often half the way to the answer.":
        "式をうまく変形できるかどうかが、答えまでの道のりの半分を決めることがよくあります。",
    "In exams you often need to know different approaches. Comparing them prepares you.":
        "試験ではいくつもの解き方を知っていることが役立ちます。それらを比べておくことが準備になります。",
    "Once you spot the pattern you need not a single intermediate step.":
        "このパターンに気づければ、途中の計算は一つもいりません。",
    "Working by hand makes you faster and surer at spotting patterns like this.":
        "手を動かして計算すると、こうしたパターンに気づくのが速く、確実になります。",
    "A glance at the shape often saves you several steps of working.":
        "式の形をひと目見るだけで、何手も計算を省けることがよくあります。",
    "Knowing several routes makes you more flexible at solving problems.":
        "いくつもの解き方を知っていると、問題を解くときに柔軟に対応できます。",
    "First see which factor lines the coefficients up, then calculate.":
        "まずどの数を掛ければ係数がそろうかを見つけてから計算しましょう。",
    "Seeing the structure saves time and avoids careless mistakes.":
        "構造を見抜けると時間が節約でき、うっかりミスも減ります。",
    "A coefficient other than 1 is no obstacle when the matching term is already there.":
        "同じ項がすでにそろっていれば、係数が1でなくても何の問題もありません。",
    "It pays to look closely: often the term fits without any rearrangement.":
        "よく見ることが大切です。変形しなくてもそのまま使える項がよくあります。",
    "Look systematically for the smallest common factor and it goes quickly.":
        "最小公倍数を意識して探せば、すぐに係数がそろいます。",
    "Tasks like this train your eye for structure, which saves time in exams.":
        "こうした問題は構造を見る目を鍛えてくれ、試験で時間の余裕につながります。",
    "A term on its own is always an invitation to substitute, minus sign or not.":
        "単独になっている項は、マイナスがついていても代入の合図です。",
    "Being confident with negative numbers keeps you from losing your thread.":
        "負の数に慣れておくと、計算の流れを見失わずに済みます。",
    "Once you recognise the form you need no intermediate step.":
        "形に気づければ、途中の計算は必要ありません。",
    "Comparing different systems sharpens your eye for the right method.":
        "いろいろな連立方程式を比べると、どの方法が合うかを見る目が育ちます。",
    "Compare the coefficients before you calculate. It saves work.":
        "計算する前に係数を見比べましょう。そのほうが手間が減ります。",
    "Practising mental arithmetic helps you see patterns like this faster.":
        "暗算の練習をすると、こうしたパターンにも早く気づけるようになります。",
    "One look is enough when you watch the shape of the equations.":
        "式の形に注目すれば、ひと目で判断できます。",
    "Knowing several methods makes you more flexible at solving.":
        "いくつもの方法を知っていると、解き方の幅が広がります。",
    "Watch the shape, not the letter.":
        "文字ではなく、式の形に注目しましょう。",
    "Check first, then calculate: it saves many steps.":
        "まず確認してから計算しましょう。それだけで何手も省けます。",
    "A quick look at the signs tells you whether to add or subtract.":
        "符号をちらっと見れば、足すのか引くのかがわかります。",
    "Telling the two cases apart is what makes you sure with the addition method.":
        "この2つの場合を区別できることが、加減法への自信につながります。",
    "You do not have to rearrange when the matching term is already there.":
        "同じ項がすでにあれば、変形する必要はありません。",
    "Looking closely saves you a whole step of working here.":
        "よく見るだけで、ここでは計算の一手間を丸ごと省けます。",
    "Do not let signs put you off: the shape decides, not the minus.":
        "符号に惑わされないでください。決め手は形であって、マイナスではありません。",
    "Confidence with negative numbers makes you faster in many tasks.":
        "負の数に慣れると、多くの問題で計算が速くなります。",
    "Solving equations for a variable shows you straight away which method suggests itself.":
        "式をある変数について解いてみると、どの方法が向いているかがすぐにわかります。",
    "Rearranging both equations cleverly saves time. Regular practice makes you confident at it.":
        "2つの式をうまく変形できると時間が節約できます。練習を重ねれば自信がつきます。",
    "Adding the equations cleverly removes one variable, so you only work with one.":
        "式をうまく足すと変数が1つ消え、1つの変数だけで計算できます。",
    "Rearrange first, solve second: one step more, but it always gets you there.":
        "まず変形してから解く。手間は1つ増えますが、必ず答えにたどりつけます。",
    "When a variable is already on its own you can substitute its term directly and save a rearrangement.":
        "変数がすでに単独になっていれば、その項をそのまま代入でき、変形の手間を省けます。",
    "A second route through the addition method shows both methods reach the same result.":
        "加減法という2つ目の道を通ると、どちらの方法でも同じ答えになることがわかります。",
    "When no variable is on its own you rearrange first. That is the price for a clean route through.":
        "どの変数も単独になっていないときは、まず式を変形します。それがすっきり解くための代償です。",
    "The addition method with prior multiplication is shorter here, but demands more of an overview.":
        "先に掛け算をする加減法のほうがここでは短く済みますが、全体を見渡す力が要ります。",
}

RESOLVING_AGENT = {
    "Trying out different methods shows you that there are often several ways to solve a problem.":
        "いろいろな方法を試すと、1つの問題に解き方がいくつもあることがわかります。",
}

COMPARISON_STEPS = {
    "Your classmate subtracted the first equation from the second to remove y.":
        "クラスメートは y を消すために、2番目の式から1番目の式を引きました。",
    "Then they divided by -5 and so calculated x.":
        "次に両辺を -5 で割って x を求めました。",
    "To calculate y, they substituted the solution for x into the first equation.":
        "y を求めるために、x の答えを1番目の式に代入しました。",
    "Your classmate solved both equations for x so that they could be equated.":
        "クラスメートは等しいとおけるように、どちらの式も x について解きました。",
    "Equating the two expressions leaves an equation containing only y.":
        "2つの式を等しいとおくと、y だけの式が残ります。",
    "Finally they substituted y into one of the rearranged equations.":
        "最後に、変形した式の1つに y を代入しました。",
    "Your classmate multiplied the first equation by 2 so that x has the same number in front of it in both equations.":
        "クラスメートは、どちらの式でも x の前の数が同じになるように、1番目の式を2倍しました。",
    "Then they subtracted the new first equation from the second, removing x.":
        "次に、新しい1番目の式を2番目の式から引いて x を消しました。",
    "Last they substituted y into the first equation and calculated x.":
        "最後に y を1番目の式に代入して x を求めました。",
    "Your classmate solved the first equation for x.":
        "クラスメートは1番目の式を x について解きました。",
    "They substituted this term into the second equation.":
        "その式を2番目の式に代入しました。",
    "Finally they substituted y into the rearranged first equation.":
        "最後に、変形した1番目の式に y を代入しました。",
}

GROUPS = [
    ("// Option texts — Efficiency exercises", OPTIONS_EFFICIENCY),
    ("// Option texts — Matching exercises", OPTIONS_MATCHING),
    ("// Option reasons — Efficiency exercises", REASONS_EFFICIENCY),
    ("// Option reasons — Matching exercises", REASONS_MATCHING),
    ("// ── Agent messages: comparing methods (Suitability)", COMPARISON_AGENT),
    ("// ── Agent messages: calculating by hand (first/second solution)", FIRST_SECOND_SOLUTION_AGENT),
    ("// ── Agent messages: trying an alternative method (Resolving)", RESOLVING_AGENT),
    ("// ── Comparison step descriptions (Suitability)", COMPARISON_STEPS),
    ("// Agent messages shown before the self-explanation starts", SELF_EXPLANATION_AGENT),
]

const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle
} = require('docx');
const fs = require('fs');

const NAVY = "1F3352", RED = "A5322C", INK = "1A1A1A", HEAD = "Cambria", BODY = "Calibri";

function title(text, size, opts = {}) {
  return new Paragraph({ alignment: AlignmentType.CENTER,
    spacing: { after: opts.after ?? 60, before: opts.before ?? 0 },
    children: [new TextRun({ text, font: HEAD, bold: true, color: NAVY, size })] });
}
function subtitle(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40, before: 120 },
    children: [new TextRun({ text, font: BODY, italics: true, color: "555555", size: 22 })] });
}
function meta(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120, before: 40 },
    children: [new TextRun({ text, font: BODY, color: NAVY, size: 20 })] });
}
function rule() {
  return new Paragraph({ spacing: { after: 260, before: 60 },
    border: { bottom: { color: RED, style: BorderStyle.SINGLE, size: 12, space: 6 } },
    children: [new TextRun({ text: "", size: 2 })] });
}
function header(text) {
  return new Paragraph({ spacing: { before: 320, after: 140 }, keepNext: true,
    children: [
      new TextRun({ text: "—  ", font: HEAD, bold: true, color: RED, size: 26 }),
      new TextRun({ text, font: HEAD, bold: true, color: NAVY, size: 26 }) ] });
}
function body(text) {
  return new Paragraph({ spacing: { after: 140, line: 276 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, font: BODY, color: INK, size: 22 })] });
}
function lead(leadIn, rest) {
  return new Paragraph({ spacing: { after: 140, line: 276 }, alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: leadIn + "  ", font: BODY, bold: true, color: NAVY, size: 22 }),
      new TextRun({ text: rest, font: BODY, color: INK, size: 22 }) ] });
}
function bullet(leadIn, rest) {
  return new Paragraph({ spacing: { after: 110, line: 268 }, indent: { left: 340, hanging: 340 },
    children: [
      new TextRun({ text: "–  ", font: BODY, bold: true, color: RED, size: 22 }),
      new TextRun({ text: leadIn, font: BODY, bold: true, color: NAVY, size: 22 }),
      new TextRun({ text: rest, font: BODY, color: INK, size: 22 }) ] });
}
function golden(text) {
  return new Paragraph({ spacing: { before: 340, after: 120, line: 288 }, indent: { left: 240, right: 240 },
    border: { top: { color: RED, style: BorderStyle.SINGLE, size: 18, space: 10 } },
    children: [new TextRun({ text, font: BODY, italics: true, color: RED, size: 23 })] });
}

const k = [];
k.push(new Paragraph({ spacing: { before: 360, after: 40 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "K E B R A N E", font: HEAD, bold: true, color: NAVY, size: 40 })] }));
k.push(title("Le Livre", 34, { before: 120, after: 0 }));
k.push(title("de la Culture", 34, { after: 60 }));
k.push(subtitle("Comment nous travaillons, comment nous décidons, comment nous recrutons."));
k.push(meta("Document fondateur   ·   Version 1.0"));
k.push(rule());

k.push(header("COMMENT LIRE CE LIVRE"));
k.push(body("La culture n'est pas ce qui est écrit sur un mur. C'est la somme des comportements que nous récompensons et de ceux que nous refusons."));
k.push(body("Ce livre ne décrit pas l'entreprise que nous aimerions être. Il décrit comment nous décidons, travaillons et recrutons quand personne ne regarde. Le jour où un texte de ce livre contredit nos actes, il faut corriger l'un ou l'autre, jamais faire semblant."));
k.push(body("Il prolonge Le Manifeste de Kebrane. Le manifeste dit pourquoi nous existons. Celui-ci dit comment nous nous comportons."));

k.push(header("CE QUE NOUS SOMMES"));
k.push(body("Une petite équipe, répartie sur plusieurs pays et plusieurs langues, qui construit des outils durables pour des gens que le monde a rendus invisibles."));
k.push(body("Nous travaillons entre le Cameroun, l'Allemagne et ailleurs, en français, en allemand et en anglais. Notre petite taille n'est pas une faiblesse à cacher, c'est une discipline : chaque personne compte, chaque décision se voit, personne ne se cache derrière un organigramme."));

k.push(header("COMMENT NOUS TRAVAILLONS"));
k.push(lead("Écrire d'abord.", "Répartis sur plusieurs fuseaux et plusieurs langues, nous ne comptons pas sur le hasard des couloirs. Ce qui n'est pas écrit n'existe pas. On écrit les décisions, pas seulement les conversations. Un document clair vaut mieux qu'une réunion brillante."));
k.push(lead("Asynchrone par défaut.", "La réunion est un coût, pas une preuve de travail. On se réunit quand l'écrit ne suffit plus, jamais par réflexe. Le temps de concentration est un bien rare, on le protège."));
k.push(lead("Profondeur, pas présence.", "Nous ne mesurons pas les heures assises. De même que nous refusons de juger notre succès au temps que nos utilisateurs passent sur nos plateformes, nous refusons de juger le nôtre au temps passé à notre bureau. Ce qui compte, c'est la barrière supprimée."));
k.push(lead("Autonomie et responsabilité.", "Chacun est propriétaire de son domaine. La liberté d'agir vient avec le devoir de rendre des comptes. On ne demande pas la permission, on informe et on assume."));
k.push(lead("Livrer, puis améliorer.", "La clarté avant la vitesse, mais la vitesse quand même. Un produit imparfait entre les mains d'un utilisateur vaut mieux qu'un produit parfait resté dans nos têtes."));

k.push(header("COMMENT NOUS COMMUNIQUONS"));
k.push(lead("Direct et bienveillant.", "On dit la vérité tôt, même quand elle dérange. La franchise sans respect est de la brutalité ; le respect sans franchise est de la lâcheté. On vise les deux à la fois."));
k.push(lead("Le désaccord est un cadeau.", "Celui qui n'est pas d'accord et se tait vole une décision à l'équipe. On exprime son désaccord, on argumente, puis on s'engage derrière la décision prise, même quand ce n'était pas la sienne."));
k.push(lead("La langue n'est jamais une barrière, chez nous non plus.", "Français, allemand, anglais : on s'adapte pour être compris, pas pour paraître. Personne n'est jugé sur son accent ou ses fautes, seulement sur ses idées. Ce serait absurde de combattre les barrières dehors et d'en dresser à l'intérieur."));
k.push(lead("Pas de politique.", "L'énergie dépensée à gérer les ego est de l'énergie volée aux utilisateurs."));

k.push(header("COMMENT NOUS DÉCIDONS"));
k.push(lead("Toute décision commence par une question.", "Quelle barrière supprime-t-on, et pour qui ? Si la réponse n'est pas claire, la décision attend."));
k.push(lead("Portes à sens unique, portes à double sens.", "Une décision réversible se prend vite, et souvent seul. Une décision irréversible se prend lentement, et à plusieurs. Ne jamais confondre les deux : la lenteur sur le réversible tue l'élan, la vitesse sur l'irréversible tue l'entreprise."));
k.push(lead("Une décision a toujours un responsable.", "Pas de décision orpheline. Une personne nommée tranche, écrit la décision et son pourquoi. On a le droit d'être en désaccord avec elle, pas avec le fait qu'elle existe."));
k.push(lead("En cas de doute, le manifeste tranche.", "L'option qui rend l'utilisateur plus autonome, même si elle nous rapporte moins. C'est écrit, c'est la règle, on ne la renégocie pas à chaque réunion."));

k.push(header("COMMENT NOUS RECRUTONS"));
k.push(lead("Le caractère avant le CV.", "Un diplôme prouve un passé, pas un avenir. On recrute des gens curieux, autonomes, obsédés par le problème et non par la technologie. Les compétences s'apprennent, le caractère beaucoup moins."));
k.push(lead("Le seuil.", "On ne recrute pas quelqu'un qui fera l'affaire. On recrute quelqu'un qui rend l'équipe meilleure qu'avant son arrivée. Dans le doute, c'est non."));
k.push(lead("La diversité est un avantage, pas une case à cocher.", "Nous servons des gens de langues, de pays et de parcours différents. Une équipe qui leur ressemble comprend leurs barrières mieux que n'importe quelle étude de marché."));
k.push(lead("Les questions que nous posons.", "Raconte une barrière que tu as supprimée pour quelqu'un. Raconte une fois où tu t'es trompé, et ce que tu en as fait. Qu'as-tu appris seul, sans que personne te le demande ?"));
k.push(lead("Recruter lentement, se séparer avec respect.", "On prend le temps de bien choisir. Et quand une séparation devient nécessaire, elle se fait tôt, avec honnêteté et dignité. Personne ne devrait apprendre en partant ce qu'il aurait dû entendre en restant."));

k.push(header("CE QUE NOUS NE TOLÉRONS PAS"));
k.push(body("Une culture se définit autant par ce qu'elle refuse que par ce qu'elle célèbre."));
k.push(bullet("L'esbroufe : ", "impressionner au lieu de résoudre."));
k.push(bullet("La dépendance créée exprès : ", "retenir l'utilisateur au lieu de le rendre autonome."));
k.push(bullet("Le culte des heures : ", "confondre l'agitation avec le travail."));
k.push(bullet("Le mépris : ", "envers un collègue, un utilisateur ou un candidat."));
k.push(bullet("La politique interne : ", "servir son ego avant la mission."));
k.push(bullet("Le silence complice : ", "voir un problème et ne rien dire."));

k.push(header("LE RITUEL DE LA SEMAINE"));
k.push(body("Quelle barrière avons-nous supprimée cette semaine ?"));
k.push(body("Chaque semaine, chacun répond à cette question par écrit, en une phrase. Ce n'est pas un rapport d'activité, c'est une preuve d'impact. Une semaine sans réponse arrive, et ce n'est pas grave. Mais si la réponse reste vide trop souvent, ce n'est pas la personne qui a un problème, c'est ce sur quoi nous l'avons laissée travailler."));

k.push(header("LA CULTURE N'EST PAS FIGÉE"));
k.push(body("Ce livre est une version, pas une vérité éternelle. La culture se vit, se corrige et se transmet. Chaque nouvelle recrue en hérite, et a le droit de la questionner. Le jour où plus personne ne la questionne, elle est déjà morte."));

k.push(golden("La règle d'or : on ne juge pas les gens sur ce qu'ils disent croire, mais sur ce qu'ils font quand c'est difficile."));

const doc = new Document({
  creator: "Kebrane", title: "Le Livre de la Culture Kebrane",
  styles: { default: { document: { run: { font: BODY, size: 22, color: INK } } } },
  sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: k }],
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/sessions/practical-sweet-franklin/mnt/outputs/Le-Livre-de-la-Culture-Kebrane.docx", buf);
  console.log("written OK");
});

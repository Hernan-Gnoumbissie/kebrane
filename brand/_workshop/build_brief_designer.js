const d=require('docx');
const {Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle,ImageRun,PageBreak}=d;
const fs=require('fs');
const SERIF="Georgia",NAVY="1F3352",RED="A5322C",INK="1A1A1A",GREY="555555";
const P=(o)=>new Paragraph(o),R=(o)=>new TextRun(o);
const nameLine=(t)=>P({spacing:{before:300,after:40},alignment:AlignmentType.CENTER,children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:38,characterSpacing:40})]});
const bigTitle=(t,o={})=>P({alignment:AlignmentType.CENTER,spacing:{after:o.after??60,before:o.before??0},children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:32})]});
const subtitle=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:40,before:140},children:[R({text:t,font:SERIF,italics:true,color:GREY,size:20})]});
const meta=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:120,before:60},children:[R({text:t,font:SERIF,color:NAVY,size:18})]});
const rule=()=>P({spacing:{after:200,before:60},border:{bottom:{color:RED,style:BorderStyle.SINGLE,size:12,space:6}},children:[R({text:"",size:2})]});
const header=(t)=>P({spacing:{before:320,after:140},keepNext:true,children:[R({text:"—  ",font:SERIF,bold:true,color:RED,size:24}),R({text:t,font:SERIF,bold:true,color:NAVY,size:24})]});
const body=(t)=>P({spacing:{after:140,line:284},alignment:AlignmentType.JUSTIFIED,children:[R({text:t,font:SERIF,color:INK,size:21})]});
const lead=(l,r)=>P({spacing:{after:120,line:284},children:[R({text:l+"  ",font:SERIF,bold:true,color:NAVY,size:21}),R({text:r,font:SERIF,color:INK,size:21})]});
const field=(l,r)=>P({spacing:{after:80,line:280},indent:{left:340,hanging:340},alignment:AlignmentType.JUSTIFIED,children:[R({text:l+"  ",font:SERIF,bold:true,color:RED,size:20}),R({text:r,font:SERIF,color:INK,size:20})]});
const bullet=(t)=>P({spacing:{after:90,line:280},indent:{left:340,hanging:340},children:[R({text:"–  ",font:SERIF,bold:true,color:RED,size:21}),R({text:t,font:SERIF,color:INK,size:21})]});
const dirHead=(t)=>P({spacing:{before:220,after:80},keepNext:true,children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:23})]});
const crit=(t)=>P({spacing:{before:200,after:200,line:300},indent:{left:220,right:220},border:{top:{color:RED,style:BorderStyle.SINGLE,size:18,space:10},bottom:{color:RED,style:BorderStyle.SINGLE,size:18,space:10}},children:[R({text:t,font:SERIF,italics:true,bold:true,color:NAVY,size:23})]});
const golden=(t)=>P({spacing:{before:300,after:120,line:300},indent:{left:220,right:220},border:{top:{color:RED,style:BorderStyle.SINGLE,size:18,space:10}},children:[R({text:t,font:SERIF,italics:true,color:RED,size:21})]});
const img=(file,w,h)=>P({alignment:AlignmentType.CENTER,spacing:{before:40,after:20},children:[new ImageRun({type:"png",data:fs.readFileSync(file),transformation:{width:w,height:h}})]});
const cap=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:120},children:[R({text:t,font:SERIF,italics:true,color:GREY,size:16})]});
const pb=()=>P({children:[new PageBreak()]});

const k=[];
k.push(nameLine("K E B R A N E"));
k.push(bigTitle("Brief d'exécution — Symbole & Logotype",{before:100,after:50}));
k.push(subtitle("À l'attention du studio retenu. Liberté totale sur le tracé, aucune sur le sens."));
k.push(meta("Document fondateur   ·   Version 2.1 (brief de refonte)"));
k.push(rule());
k.push(crit("« Le résultat doit pouvoir être lu comme un A lorsqu'il est associé au nom Kebrane, et comme une arche ou un passage lorsqu'il est vu seul. »"));

k.push(header("POURQUOI CE BRIEF"));
k.push(body("Le système de marque Kebrane existe déjà : concept, palette, typographie éditoriale, règles d'usage et architecture de marque cohérente. Ce brief ne demande donc pas d'inventer une marque, mais d'exécuter au plus haut niveau les deux seules pièces qui méritent une main experte — le symbole et le logotype."));
k.push(body("L'objectif n'est pas plus d'abstraction. C'est plus de singularité, de maîtrise et de précision. Le studio est libre du tracé ; il ne l'est pas du sens."));

k.push(header("CE QUI EST ACQUIS (et ne se renégocie pas)"));
k.push(lead("Le concept.","Le sens naît du retrait : retirer la barre du A, c'est faire tomber la barrière ; l'ouverture devient un passage. C'est l'âme de la marque — elle ne bouge pas."));
k.push(lead("Le nom.","Kebrane. Définitif. On n'y touche pas."));
k.push(lead("La couleur mère.","Marine #1F3352, réservée à la marque mère ; Rouge #A5322C en accent rare."));
k.push(lead("L'architecture de marque.","Un symbole universel ; chaque produit se distingue par la couleur de son conteneur d'icône (GermanPass bleu ardoise, TCFPass vert sauge, PermitPass ocre, Arrival prune). Le A ne se recolore jamais."));
k.push(lead("La voix.","Claire, sobre, jamais tapageuse. Le dessin doit lui ressembler."));

k.push(header("LES DEUX LIVRABLES ATTENDUS"));
k.push(lead("1 — Un symbole propriétaire.","Dessiné sur mesure, unique, réductible. Optimisé en priorité pour les petites tailles (favicon, icône d'app) : il doit rester lui-même à 16 px, jamais s'effondrer en forme générique. Fonctionne en une seule couleur (Marine et blanc réservé), sans dégradé, ombre ni relief. Livré avec grille de construction, zone de protection, versions couleur, et une favicon dédiée optimisée 16 px."));
k.push(lead("2 — Un logotype dessiné.","Le mot KEBRANE dessiné sur mesure, ou une sérif contemporaine profondément personnalisée. Pas de police système : Georgia est la voix des documents, jamais la signature de la marque. Une relation intentionnelle doit lier le A du mot et le symbole. Livré avec verrous, interlettrage et versions couleur."));

k.push(header("LE VERROU (règle née d'un premier essai)"));
k.push(body("Un premier essai a révélé un piège à écrire noir sur blanc : le symbole — qui est un A — posé à gauche du mot se lit « AKEBRANE ». Le nom ne commence pas par A (le A est la 5ᵉ lettre : kebr·a·ne). Le symbole ne se pose donc jamais en préfixe horizontal du mot. Deux verrous, et deux seulement, sont autorisés :"));
k.push(img("schema4.png",300,193));
k.push(cap("À éviter (haut) et autorisés (bas) — schéma de principe."));
k.push(bullet("Verrou vertical : le symbole au-dessus du mot."));
k.push(bullet("A intégré : le symbole devient le A interne de KEBRANE (kebr·A·ne)."));

k.push(header("CONTRAINTES ISSUES DU TEST (concevoir POUR, pas découvrir après)"));
k.push(body("Un test de reconnaissance a déjà été mené sur le symbole actuel. Le studio doit concevoir en tenant compte de ses enseignements :"));
k.push(bullet("Petites tailles : sous 24 px, un mark nu trop fin s'effondre. Prévoir une forme — ou une favicon dédiée — dont l'ouverture survit à 16 px."));
k.push(bullet("Fonds hostiles : sur fond chargé ou photo, prévoir une pastille. Le contraste prime toujours."));
k.push(bullet("Écran d'accueil : les icônes produits doivent être distinctes entre elles (accent) tout en restant une évidente famille."));
k.push(bullet("Cercle et carré : le symbole doit tenir en avatar rond comme en icône carrée, sans être rogné."));

k.push(header("L'ANTI-BRIEF (ce qu'on ne veut pas)"));
k.push(bullet("Plus d'abstraction gratuite : de la singularité, pas un signe muet qui perd le concept."));
k.push(bullet("Aucun dégradé, ombre, 3D, effet ou mode qui datera."));
k.push(bullet("Pas de rébus : si le symbole a besoin d'une légende, il a échoué."));
k.push(bullet("Jamais le symbole-A en préfixe horizontal du mot (faux « AKEBRANE ») : seuls le verrou vertical ou le A intégré sont permis."));
k.push(bullet("Ne jamais recolorer le A, ni casser l'architecture d'accents par produit."));
k.push(bullet("Aucune police système pour le logotype. Ne pas illustrer littéralement « barrière », « passeport » ou « pont »."));

k.push(golden("Gardez le concept du passage et du retrait. Oubliez le tracé actuel. Livrez un signe intemporel — qui puisse encore exister dans cinquante ans. Pas davantage d'abstraction : davantage de singularité, de maîtrise et de précision."));

k.push(pb());
k.push(P({spacing:{before:120,after:60},children:[R({text:"—  ",font:SERIF,bold:true,color:RED,size:26}),R({text:"DIRECTIONS DE RÉFÉRENCE",font:SERIF,bold:true,color:NAVY,size:26})]}));
k.push(body("Trois principes de dessin, pas trois logos. Ce sont des angles d'attaque, pas des tracés à reproduire — les schémas ci-dessous sont volontairement en fil de fer. Le studio reste libre du dessin ; il ne l'est pas de la logique."));

k.push(dirHead("Direction 1 — A–arche"));
k.push(img("schema1.png",150,120));k.push(cap("Schéma de principe — non un tracé."));
k.push(field("L'idée :","la lettre reste identifiable, mais l'ouverture — l'arche laissée par la barre retirée — devient le signe distinctif. Pas « un A », mais « le A dont l'ouverture est la signature »."));
k.push(field("Rester reconnaissable :","la silhouette de A, et l'ouverture comme élément mémorable."));
k.push(field("Risque à éviter :","rester un A standard et banal, ou glisser vers un chevron / un accent."));
k.push(field("À 16 / 24 / 64 px :","16 → l'ouverture doit survivre (forme dédiée) ; 24 → le A se lit ; 64 → l'ouverture porte la singularité."));
k.push(field("Avec les couleurs produits :","l'ouverture reste vide (blanche) ; le conteneur prend l'accent. Le geste ne dépend jamais de la couleur."));

k.push(dirHead("Direction 2 — Passage en négatif"));
k.push(img("schema2.png",150,120));k.push(cap("Schéma de principe — non un tracé."));
k.push(field("L'idée :","la masse dessine le A, le vide dessine le seuil. On lit autant le plein que le creux (figure/fond)."));
k.push(field("Rester reconnaissable :","la dualité plein/vide ; le seuil aussi fort que la lettre."));
k.push(field("Risque à éviter :","que le vide se referme en petit (piège déjà identifié), ou une ambiguïté figure/fond illisible."));
k.push(field("À 16 / 24 / 64 px :","16 → le vide doit rester un créneau ouvert, pas un sliver ; 24 → équilibre plein/vide ; 64 → la double lecture s'épanouit."));
k.push(field("Avec les couleurs produits :","le négatif s'ouvre sur la couleur du conteneur — le passage montre alors la couleur du combat mené."));

k.push(dirHead("Direction 3 — A intégré au logotype"));
k.push(img("schema3.png",150,120));k.push(cap("Schéma de principe — non un tracé."));
k.push(field("L'idée :","le symbole naît du mot. Le A de KEBRANE est dessiné pour pouvoir se détacher et vivre seul."));
k.push(field("Rester reconnaissable :","la continuité entre le A du mot et le symbole — une même signature."));
k.push(field("Risque à éviter :","un symbole qui ne tient pas seul une fois détaché, ou un A qui jure avec les autres lettres."));
k.push(field("À 16 / 24 / 64 px :","16 → seul le symbole détaché ; 24 → le symbole ; 64 → le logotype complet, la parenté A↔symbole visible."));
k.push(field("Avec les couleurs produits :","le logotype reste Marine (marque mère) ; le symbole détaché prend l'accent en contexte produit."));

k.push(golden("Lu comme un A quand il porte le nom ; comme une arche, un passage, quand il est seul. Pas davantage d'abstraction : davantage de singularité, de maîtrise et de précision."));

const doc=new Document({creator:"Kebrane",title:"Brief d'exécution — Symbole & Logotype Kebrane",
  styles:{default:{document:{run:{font:SERIF,size:21,color:INK}}}},
  sections:[{properties:{page:{margin:{top:1440,bottom:1440,left:1440,right:1440}}},children:k}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("Kebrane-Brief-Designer-Symbole-Logotype.docx",b);console.log("v2.1 ok");});

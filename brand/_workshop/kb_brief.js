const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = require('docx');
const fs=require('fs');
const SERIF="Georgia",NAVY="1F3352",RED="A5322C",INK="1A1A1A",GREY="555555";
const P=(o)=>new Paragraph(o),R=(o)=>new TextRun(o);
const nameLine=(t)=>P({spacing:{before:360,after:40},alignment:AlignmentType.CENTER,children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:38,characterSpacing:40})]});
const bigTitle=(t,o={})=>P({alignment:AlignmentType.CENTER,spacing:{after:o.after??60,before:o.before??0},children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:34})]});
const subtitle=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:40,before:140},children:[R({text:t,font:SERIF,italics:true,color:GREY,size:21})]});
const meta=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:120,before:60},children:[R({text:t,font:SERIF,color:NAVY,size:19})]});
const rule=()=>P({spacing:{after:260,before:60},border:{bottom:{color:RED,style:BorderStyle.SINGLE,size:12,space:6}},children:[R({text:"",size:2})]});
const header=(t)=>P({spacing:{before:340,after:150},keepNext:true,children:[R({text:"—  ",font:SERIF,bold:true,color:RED,size:25}),R({text:t,font:SERIF,bold:true,color:NAVY,size:25})]});
const body=(t)=>P({spacing:{after:150,line:288},alignment:AlignmentType.JUSTIFIED,children:[R({text:t,font:SERIF,color:INK,size:21})]});
const dirHead=(t)=>P({spacing:{before:280,after:90},keepNext:true,children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:23})]});
const field=(l,r)=>P({spacing:{after:90,line:284},alignment:AlignmentType.JUSTIFIED,indent:{left:340,hanging:340},children:[R({text:l+"  ",font:SERIF,bold:true,color:RED,size:21}),R({text:r,font:SERIF,color:INK,size:21})]});
const lead=(l,r)=>P({spacing:{after:150,line:288},alignment:AlignmentType.JUSTIFIED,children:[R({text:l+"  ",font:SERIF,bold:true,color:NAVY,size:21}),R({text:r,font:SERIF,color:INK,size:21})]});
const bullet=(t)=>P({spacing:{after:110,line:280},indent:{left:340,hanging:340},children:[R({text:"–  ",font:SERIF,bold:true,color:RED,size:21}),R({text:t,font:SERIF,color:INK,size:21})]});
const golden=(t)=>P({spacing:{before:360,after:120,line:300},indent:{left:240,right:240},border:{top:{color:RED,style:BorderStyle.SINGLE,size:18,space:10}},children:[R({text:t,font:SERIF,italics:true,color:RED,size:22})]});

const k=[];
k.push(nameLine("K E B R A N E"));
k.push(bigTitle("Le Brief de Logo",{before:120,after:60}));
k.push(subtitle("Le principe soustractif, les contraintes, et les directions à départager."));
k.push(meta("Document fondateur   ·   Version 1.0"));
k.push(rule());

k.push(header("CE QUE DOIT FAIRE CE LOGO"));
k.push(body("Le logo n'est pas une décoration : c'est la forme la plus courte de ce que nous croyons. Il doit porter, sans un mot, l'idée qui fonde Kebrane — une barrière que l'on retire. Un inconnu qui le voit pour la première fois ne comprendra peut-être pas tout, mais il ne devra jamais y lire le contraire : ni l'enfermement, ni l'ornement gratuit."));
k.push(body("C'est aussi la signature d'une maison mère. Il coiffera des sous-marques (Kebrane Education, Kebrane Arrival) et des produits (GermanPass, TCFPass, PermitPass, Arrival). Il doit donc rester assez sobre pour les accueillir sans les écraser."));

k.push(header("LE PRINCIPE SOUSTRACTIF"));
k.push(body("Nous gardons la règle qui gouvernait déjà la recherche précédente : le sens naît de ce que l'on retire, pas de ce que l'on ajoute. Un logo Kebrane ne s'enrichit pas de fioritures ; il s'ouvre par un retrait. Quelque chose est visiblement enlevé, et ce vide est le message. Une barrière tombée se donne à voir par l'espace qu'elle laisse, jamais par un symbole qu'on plaque par-dessus."));
k.push(lead("Ce qui change avec le nom.", "L'ancrage précédent — « L'Ouverture » — reposait sur le O d'Orivane, un anneau qui ne se refermait jamais tout à fait. Kebrane n'a pas de O. L'esprit reste ; l'ancrage doit être neuf. Le nom nous en offre un, presque trop beau : dans KEBRANE, le A porte une barre transversale, et cette barre est, littéralement, une barrière. La retirer, c'est faire tomber la barrière dans la lettre même."));

k.push(header("LES CONTRAINTES NON NÉGOCIABLES"));
k.push(bullet("Lisible et reconnaissable à 16 pixels, en favicon comme en pied de page."));
k.push(bullet("Fonctionne en une seule couleur, en navy comme en réservé (blanc sur fond foncé)."));
k.push(bullet("Ne dépend d'aucune lettre que le nom ne possède pas — le O est derrière nous."));
k.push(bullet("Culturellement neutre pour nos publics : Afrique francophone, Allemagne, ailleurs. Aucune forme qui heurte ou exclut."));
k.push(bullet("Se décline en verrou de sous-marque sans se déformer : Kebrane + division, Kebrane + produit."));
k.push(bullet("Une seule idée, pas un rébus. Si le symbole a besoin d'une légende, il a échoué."));

k.push(header("LES DIRECTIONS À DÉPARTAGER"));
k.push(body("Quatre pistes, toutes fidèles au principe soustractif, mais qui ancrent le retrait à des endroits différents. Aucune n'est encore choisie. Elles existent pour être comparées, pas admirées."));

k.push(dirHead("Direction A — Le A ouvert"));
k.push(field("L'idée :","le symbole est le A de Kebrane, dressé comme une arche, débarrassé de sa barre transversale."));
k.push(field("Le geste :","on retire la barre — la « barrière » — du A. La lettre s'ouvre en passage ; on peut la traverser."));
k.push(field("Forces :","ancrage direct dans le nom et dans le mot « barrière » ; une seule idée, immédiate ; se réduit très bien en petit."));
k.push(field("Vigilance :","un A sans barre peut se lire comme un simple chevron ou un Λ ; il faudra un dessin qui dise « lettre ouverte », pas « accent »."));

k.push(dirHead("Direction B — La brèche"));
k.push(field("L'idée :","un symbole abstrait : une barre pleine, horizontale, dont un segment a été retiré — une ouverture pratiquée dans le mur."));
k.push(field("Le geste :","on enlève un morceau de la barrière ; le passage, c'est le manque. La forme est presque entière, mais le vide est tout le propos."));
k.push(field("Forces :","la lecture la plus littérale de « faire tomber la barrière » ; totalement indépendant de l'alphabet ; intemporel et international."));
k.push(field("Vigilance :","l'abstraction doit rester distinctive et ne pas évoquer une simple icône de menu ou un logo générique de « connexion »."));

k.push(dirHead("Direction C — Le seuil"));
k.push(field("L'idée :","une forme pleine dans laquelle est découpée une arche — un seuil, une porte, une passerelle en creux."));
k.push(field("Le geste :","on soustrait le passage à la masse. Ce qu'on enlève dessine la porte que l'on franchit puis que l'on quitte."));
k.push(field("Forces :","traduit « passerelle, pas destination » du Manifeste et des Principes ; chaleureux et humain ; belle réserve en blanc."));
k.push(field("Vigilance :","le motif « porte » est courant ; il faudra une proportion et une coupe qui n'appartiennent qu'à Kebrane."));

k.push(dirHead("Direction D — Les deux E"));
k.push(field("L'idée :","jouer la structure du nom : Kebrane s'ouvre et se ferme sur un E. Deux E se font face et encadrent un passage, ou un seul E perd une barre."));
k.push(field("Le geste :","le retrait se joue sur le E — lettre déjà « ouverte » vers la droite — dont on enlève une barre pour ménager le vide."));
k.push(field("Forces :","fondé sur la symétrie propre du nom ; matière riche pour un monogramme ; distinctif."));
k.push(field("Vigilance :","plus conceptuel, donc moins immédiat ; risque de paraître clever avant d'être clair — à surveiller contre notre propre voix."));

k.push(header("COMMENT NOUS CHOISIRONS"));
k.push(body("Comme pour le nom, nous ne retiendrons pas la direction que nous préférons, mais celle qui franchit la barre. Les seuils se fixent par écrit avant de regarder les propositions dessinées, et ne se renégocient pas après coup."));
k.push(lead("Filtres éliminatoires (tout ou rien).","Lisibilité à 16 px en une couleur ; reproductibilité en navy et en réservé ; indépendance vis-à-vis du O ; neutralité culturelle. Une direction qui échoue à l'un de ces filtres sort, quel que soit son charme."));
k.push(lead("Critères pondérés (pour départager les survivantes).","Intégrité soustractive — le sens naît-il vraiment d'un retrait ? Distinction — ne ressemble à rien de connu. Mémorabilité — reconstructible de mémoire par un inconnu. Extensibilité — tient en verrou de sous-marque. Intemporalité — ne sera pas daté dans cinq ans."));
k.push(lead("La règle d'arrêt.","Aucune direction n'est déclarée gagnante avant que toutes aient passé les filtres éliminatoires. L'attachement à une piste se note, mais ne vote pas. Si deux directions restent à égalité, c'est la plus simple qui l'emporte."));

k.push(golden("Un logo Kebrane ne se remarque pas parce qu'il montre plus, mais parce qu'il a retiré ce qu'il fallait. La barrière tombée est le dessin."));

const doc=new Document({creator:"Kebrane",title:"Le Brief de Logo Kebrane",
  styles:{default:{document:{run:{font:SERIF,size:21,color:INK}}}},
  sections:[{properties:{page:{margin:{top:1440,bottom:1440,left:1440,right:1440}}},children:k}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("/sessions/practical-sweet-franklin/mnt/outputs/Le-Brief-de-Logo-Kebrane.docx",b);console.log("brief docx ok");});

const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = require('docx');
const fs = require('fs');
const SERIF="Georgia", NAVY="1F3352", RED="A5322C", INK="1A1A1A", GREY="555555";
const P=(o)=>new Paragraph(o), R=(o)=>new TextRun(o);
const nameLine=(t)=>P({spacing:{before:360,after:40},alignment:AlignmentType.CENTER,children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:38,characterSpacing:40})]});
const bigTitle=(t,o={})=>P({alignment:AlignmentType.CENTER,spacing:{after:o.after??60,before:o.before??0},children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:34})]});
const subtitle=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:40,before:140},children:[R({text:t,font:SERIF,italics:true,color:GREY,size:21})]});
const meta=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:120,before:60},children:[R({text:t,font:SERIF,color:NAVY,size:19})]});
const rule=()=>P({spacing:{after:260,before:60},border:{bottom:{color:RED,style:BorderStyle.SINGLE,size:12,space:6}},children:[R({text:"",size:2})]});
const header=(t)=>P({spacing:{before:340,after:150},keepNext:true,children:[R({text:"—  ",font:SERIF,bold:true,color:RED,size:25}),R({text:t,font:SERIF,bold:true,color:NAVY,size:25})]});
const body=(t)=>P({spacing:{after:150,line:288},alignment:AlignmentType.JUSTIFIED,children:[R({text:t,font:SERIF,color:INK,size:21})]});
const opening=(t)=>P({spacing:{after:170,line:300},alignment:AlignmentType.JUSTIFIED,children:[R({text:t,font:SERIF,color:NAVY,size:24})]});
const lead=(l,r)=>P({spacing:{after:150,line:288},alignment:AlignmentType.JUSTIFIED,children:[R({text:l+"  ",font:SERIF,bold:true,color:NAVY,size:21}),R({text:r,font:SERIF,color:INK,size:21})]});
const bullet=(t)=>P({spacing:{after:110,line:280},indent:{left:340,hanging:340},children:[R({text:"–  ",font:SERIF,bold:true,color:RED,size:21}),R({text:t,font:SERIF,color:INK,size:21})]});
const golden=(t)=>P({spacing:{before:360,after:120,line:300},indent:{left:240,right:240},border:{top:{color:RED,style:BorderStyle.SINGLE,size:18,space:10}},children:[R({text:t,font:SERIF,italics:true,color:RED,size:22})]});

const k=[];
k.push(nameLine("K E B R A N E"));
k.push(bigTitle("Le Manifeste",{before:120,after:60}));
k.push(subtitle("Pourquoi nous existons."));
k.push(meta("Document fondateur   ·   Version 1.0"));
k.push(rule());

k.push(opening("Il y a des barrières que l'on choisit, et des barrières que l'on subit. Les premières nous font grandir. Les secondes décident, à notre place, de ce que nous avons le droit de devenir. Kebrane existe pour faire tomber les secondes."));

k.push(header("CE QUE NOUS VOYONS"));
k.push(body("Partout, des personnes capables et déterminées sont arrêtées non par un manque de talent, mais par un obstacle qu'elles n'ont pas choisi : une langue, un examen, un certificat, un dossier, une file d'attente. Entre l'Afrique francophone et l'Allemagne, ces obstacles s'accumulent. Un test de langue manqué, un diplôme non reconnu, une démarche écrite pour décourager : il en faut parfois peu pour refermer un avenir entier."));
k.push(body("Ces barrières ne mesurent pas la valeur d'une personne. Elles mesurent seulement la distance entre elle et ceux qui ont écrit les règles. Nous refusons que le hasard d'une naissance — un pays, une langue, un papier — tienne lieu de destin."));

k.push(header("CE QUE NOUS CROYONS"));
k.push(lead("Une barrière subie n'est pas un destin.", "Ce qui a été dressé par des règles peut être franchi par de meilleurs outils. Aucune frontière administrative n'est une loi de la nature."));
k.push(lead("L'autonomie de la personne passe avant tout le reste.", "Nous ne voulons pas rendre les gens dépendants de nous. Nous voulons les rendre libres — libres d'obtenir ce qu'ils cherchent, puis libres de partir."));
k.push(lead("La langue ne doit jamais être un mur.", "Ni dehors, ni chez nous. Se faire comprendre est un droit, pas un privilège réservé à ceux qui parlent déjà la bonne langue."));
k.push(lead("La dignité n'est pas une option.", "On peut aider quelqu'un sans jamais le faire se sentir petit. La clarté, l'honnêteté et le respect ne sont pas des égards que l'on ajoute : ce sont le produit lui-même."));

k.push(header("POURQUOI KEBRANE EXISTE"));
k.push(body("Kebrane est une maison. Sous un même toit, nous construisons des outils qui suppriment, un par un, les obstacles administratifs, linguistiques et de certification qui séparent les gens de la vie qu'ils veulent mener — dans l'éducation, l'installation, et au-delà."));
k.push(body("Chaque produit fait tomber une barrière précise, pour une personne précise : franchir un examen avec GermanPass, TCFPass, PermitPass ; s'installer et trouver ses repères avec Arrival. Ce ne sont pas des destinations où retenir l'utilisateur, mais des passerelles qu'il traverse, puis qu'il quitte, plus libre qu'avant."));

k.push(header("NOTRE PROMESSE"));
k.push(body("À celui qui nous fait confiance, nous ne promettons pas le succès — personne d'honnête ne le peut. Nous promettons un chemin plus clair vers lui : dire la vérité tôt, montrer la prochaine étape, ne jamais faire tourner en rond. Nous nous jugerons non au temps que les gens passent chez nous, mais aux barrières qu'ils ne rencontrent plus."));
k.push(body("Et une règle nous départage quand tout le reste hésite : en cas de doute, nous choisissons l'option qui rend la personne plus autonome, même lorsqu'elle nous rapporte moins. C'est écrit, et cela ne se renégocie pas."));

k.push(header("CE QUE NOUS NE FERONS JAMAIS"));
k.push(bullet("Retenir quelqu'un contre son intérêt, ou lui rendre le départ difficile."));
k.push(bullet("Monétiser la détresse, ou faire payer plus cher celui qui est le plus coincé."));
k.push(bullet("Cacher la vérité, exagérer une promesse ou fabriquer l'urgence pour vendre."));
k.push(bullet("Réduire une personne à un dossier, un requérant ou un usager."));
k.push(bullet("Dresser, à l'intérieur, les barrières que nous combattons dehors."));

k.push(golden("Les barrières qu'on n'a pas choisies ne devraient jamais décider de ce qu'on peut devenir. C'est pour cela, et pour rien d'autre, que Kebrane existe."));

const doc=new Document({creator:"Kebrane",title:"Le Manifeste de Kebrane",
  styles:{default:{document:{run:{font:SERIF,size:21,color:INK}}}},
  sections:[{properties:{page:{margin:{top:1440,bottom:1440,left:1440,right:1440}}},children:k}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("/sessions/practical-sweet-franklin/mnt/outputs/Le-Manifeste-de-Kebrane.docx",b);console.log("docx ok");});

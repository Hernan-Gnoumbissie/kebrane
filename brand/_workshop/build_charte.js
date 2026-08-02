const d=require('docx');
const {Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle,ImageRun,Table,TableRow,TableCell,WidthType,ShadingType}=d;
const fs=require('fs');
const SERIF="Georgia",NAVY="1F3352",RED="A5322C",INK="1A1A1A",GREY="555555";
const P=(o)=>new Paragraph(o),R=(o)=>new TextRun(o);
const nameLine=(t)=>P({spacing:{before:360,after:40},alignment:AlignmentType.CENTER,children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:38,characterSpacing:40})]});
const bigTitle=(t,o={})=>P({alignment:AlignmentType.CENTER,spacing:{after:o.after??60,before:o.before??0},children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:34})]});
const subtitle=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:40,before:140},children:[R({text:t,font:SERIF,italics:true,color:GREY,size:21})]});
const meta=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:120,before:60},children:[R({text:t,font:SERIF,color:NAVY,size:19})]});
const rule=()=>P({spacing:{after:240,before:60},border:{bottom:{color:RED,style:BorderStyle.SINGLE,size:12,space:6}},children:[R({text:"",size:2})]});
const header=(t)=>P({spacing:{before:340,after:150},keepNext:true,children:[R({text:"—  ",font:SERIF,bold:true,color:RED,size:25}),R({text:t,font:SERIF,bold:true,color:NAVY,size:25})]});
const sub=(t)=>P({spacing:{before:160,after:80},keepNext:true,children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:20})]});
const body=(t)=>P({spacing:{after:150,line:288},alignment:AlignmentType.JUSTIFIED,children:[R({text:t,font:SERIF,color:INK,size:21})]});
const lead=(l,r)=>P({spacing:{after:130,line:288},children:[R({text:l+"  ",font:SERIF,bold:true,color:NAVY,size:21}),R({text:r,font:SERIF,color:INK,size:21})]});
const bullet=(t)=>P({spacing:{after:100,line:280},indent:{left:340,hanging:340},children:[R({text:"–  ",font:SERIF,bold:true,color:RED,size:21}),R({text:t,font:SERIF,color:INK,size:21})]});
const golden=(t)=>P({spacing:{before:340,after:120,line:300},indent:{left:240,right:240},border:{top:{color:RED,style:BorderStyle.SINGLE,size:18,space:10}},children:[R({text:t,font:SERIF,italics:true,color:RED,size:22})]});
const img=(file,w,h)=>P({alignment:AlignmentType.CENTER,spacing:{before:60,after:40},children:[new ImageRun({type:"png",data:fs.readFileSync(file),transformation:{width:w,height:h}})]});
const capt=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:160},children:[R({text:t,font:SERIF,italics:true,color:GREY,size:18})]});

function tbl(rows,cw,heads){
  const cell=(t,{b=false,color=INK,fill=null,white=false,w=2500}={})=>new TableCell({
    width:{size:w,type:WidthType.DXA},shading:fill?{type:ShadingType.CLEAR,color:"auto",fill}:undefined,
    margins:{top:60,bottom:60,left:120,right:120},
    children:[P({children:[R({text:t,font:SERIF,bold:b,color:white?"FFFFFF":color,size:19})]})]});
  const trs=[];
  if(heads){trs.push(new TableRow({tableHeader:true,children:heads.map((h,i)=>cell(h,{b:true,white:true,fill:NAVY,w:cw[i]}))}));}
  rows.forEach(r=>{trs.push(new TableRow({children:r.map((c,i)=>cell(c.t,{b:c.b,color:c.color||INK,fill:c.fill,white:c.white,w:cw[i]}))}));});
  return new Table({columnWidths:cw,width:{size:cw.reduce((a,b)=>a+b,0),type:WidthType.DXA},rows:trs});
}

const k=[];
k.push(nameLine("K E B R A N E"));
k.push(bigTitle("Charte graphique",{before:120,after:60}));
k.push(subtitle("Le logo, les couleurs, la typographie — le système visuel, gouverné par le retrait."));
k.push(meta("Document fondateur   ·   Version 1.1 (essentielle)"));
k.push(rule());
k.push(body("Ce système applique au visuel ce que l'Identité verbale fixe pour la voix : clair avant d'être élégant, sobre, jamais tapageur. Le principe reste le même partout — le sens naît de ce qu'on retire. La barrière retirée est le dessin."));

k.push(header("LE LOGO"));
k.push(lead("Le symbole — le A ouvert.","On retire la barre transversale du A. La barre, c'est la barrière ; la lettre s'ouvre en arche, un passage que l'on franchit. C'est le monogramme, le favicon, l'icône d'application."));
k.push(img("kebrane-symbol-navy.png",96,101));
k.push(capt("Le symbole, en Marine sur fond clair."));
k.push(img("kebrane-symbol-reversed.png",110,116));
k.push(capt("Version réservée (pastille) — blanc sur Marine, pour icône d'app, avatar et fonds foncés."));
k.push(lead("Le logotype.","Le symbole accompagné du nom KEBRANE, en Georgia capitales, interlettré. Le symbole porte l'idée ; le mot reste parfaitement lisible."));
k.push(lead("Zone de protection.","Une marge minimale égale à la largeur d'un pied de la lettre est réservée autour du logo, sur les quatre côtés. Rien n'y entre."));
k.push(lead("Une seule couleur.","Le logo vit en aplat Marine, ou en blanc réservé. Jamais de dégradé, d'ombre, ni de relief."));

k.push(sub("Usage → forme"));
k.push(body("Le symbole change de forme selon la taille et le fond. Un mark minimal ne se sauve pas en ajoutant du détail, mais en choisissant la bonne forme pour chaque contexte. Le A nu descend jusqu'à 24 px sur fond clair ; en dessous, ou sur tout fond chargé, on passe à la pastille."));
k.push(tbl([
 [{t:"≥ 96 px",b:true,color:NAVY},{t:"A nu (Marine, ou blanc réservé)"}],
 [{t:"64 – 24 px",b:true,color:NAVY},{t:"A nu, seulement sur fond clair et uni"}],
 [{t:"< 24 px",b:true,color:NAVY},{t:"Pastille (A blanc sur carré/cercle Marine)"}],
 [{t:"Favicon (≤ 20 px)",b:true,color:NAVY},{t:"Pastille pixel-optimisée (arche élargie)"}],
 [{t:"Fond chargé / photo",b:true,color:NAVY},{t:"Pastille, quelle que soit la taille"}],
 [{t:"Icône d'application",b:true,color:NAVY},{t:"Pastille"}],
 [{t:"Avatar (réseaux)",b:true,color:NAVY},{t:"Pastille"}],
],[2600,6400],["Contexte / taille","Forme à utiliser"]));
k.push(P({spacing:{before:120,after:40},children:[R({text:"Taille minimale.  ",font:SERIF,bold:true,color:NAVY,size:21}),R({text:"A nu : 24 px de haut. Pastille : 16 px. Logotype complet : 24 px de haut. Sous 24 px, on n'utilise que la pastille.",font:SERIF,color:INK,size:21})]}));
k.push(P({spacing:{after:150},children:[R({text:"Favicon 16 px.  ",font:SERIF,bold:true,color:NAVY,size:21}),R({text:"Version dédiée, dessinée sur la grille de 16 px : ouverture rectangulaire d'environ 3 px, sommet plat, jambes épaissies, pour que l'arche reste ouverte. À n'employer qu'à 16–20 px ; au-delà, le symbole standard reprend.",font:SERIF,color:INK,size:21})]}));

k.push(P({spacing:{before:120,after:80},children:[R({text:"Ce qu'on ne fait jamais",font:SERIF,bold:true,color:NAVY,size:21})]}));
k.push(bullet("Remettre la barre du A : c'est nier le principe même."));
k.push(bullet("Boucher l'arche, ou la remplir d'un motif."));
k.push(bullet("Recolorer hors palette — surtout en néon."));
k.push(bullet("Incliner, étirer ou déformer la lettre."));
k.push(bullet("Poser le A nu sous 24 px, ou sur un fond qui ne lui donne pas un contraste franc."));

k.push(header("LES COULEURS"));
k.push(body("Un cœur discipliné, quelques tons de service. Le Marine porte la confiance ; le Rouge ne sert que d'accent, jamais d'aplat dominant. Le Ciel et le Sable apportent le calme et la chaleur, sans hausser la voix."));
k.push(sub("Primaires & secondaires"));
k.push(tbl([
 [{t:"Marine",b:true,fill:"1F3352",white:true},{t:"#1F3352",color:NAVY},{t:"Couleur mère. Titres, textes forts, fonds foncés. Contraste AAA sur papier."}],
 [{t:"Rouge",b:true,fill:"A5322C",white:true},{t:"#A5322C",color:NAVY},{t:"Accent rare : dashes, règle d'or, ligne rouge. Jamais pour du texte courant."}],
 [{t:"Ciel",b:true,fill:"A7C4DC",color:NAVY},{t:"#A7C4DC",color:NAVY},{t:"Calme, états, liens, réservé sur Marine. Pas pour du texte fin sur blanc."}],
 [{t:"Sable",b:true,fill:"ECD8BE",color:NAVY},{t:"#ECD8BE",color:NAVY},{t:"Fonds chauds, respirations, blocs. Jamais pour du texte."}],
],[2100,1500,5400]));
k.push(sub("Neutres"));
k.push(tbl([
 [{t:"Encre",b:true,fill:"1A1A1A",white:true},{t:"#1A1A1A",color:NAVY},{t:"Texte courant."}],
 [{t:"Gris",b:true,fill:"5C6672",white:true},{t:"#5C6672",color:NAVY},{t:"Texte secondaire, légendes."}],
 [{t:"Papier",b:true,fill:"FBF9F5",color:NAVY},{t:"#FBF9F5",color:NAVY},{t:"Fond par défaut, chaud et calme."}],
 [{t:"Blanc",b:true,fill:"FFFFFF",color:NAVY},{t:"#FFFFFF",color:NAVY},{t:"Réserve, cartes, surfaces."}],
],[2100,1500,5400]));
k.push(sub("Équilibre"));
k.push(body("Environ 60 % de Marine et de Papier, 25 % de neutres, 10 % de Ciel et de Sable, 5 % de Rouge. Le Rouge ne dépasse jamais l'accent."));

k.push(header("LA TYPOGRAPHIE"));
k.push(body("Une seule famille, éditoriale : Georgia. Empattements solides, œil chaleureux, lisible en petit corps — l'autorité institutionnelle sans le réflexe « défaut Word ». Elle porte les titres, le corps et les citations."));
k.push(lead("Display.","Le nom en capitales interlettrées, Marine."));
k.push(lead("Titres de section.","Capitales, précédés d'un tiret rouge."));
k.push(lead("Corps.","Georgia régulier, environ 11 pt sur 16, en Encre. Phrases courtes, une idée à la fois."));
k.push(lead("Règle d'or.","En italique, bordée d'un filet rouge."));
k.push(body("Une police d'interface sans-serif pourra compléter Georgia pour les contextes fonctionnels (formulaires, tableaux de bord), à définir avec le premier produit. Georgia reste la voix éditoriale de la marque."));

k.push(golden("Un logo Kebrane ne se remarque pas parce qu'il montre plus, mais parce qu'il a retiré ce qu'il fallait."));

const doc=new Document({creator:"Kebrane",title:"Charte graphique Kebrane",
  styles:{default:{document:{run:{font:SERIF,size:21,color:INK}}}},
  sections:[{properties:{page:{margin:{top:1440,bottom:1440,left:1440,right:1440}}},children:k}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("Kebrane-Charte-graphique.docx",b);console.log("charte v1.1 ok");});

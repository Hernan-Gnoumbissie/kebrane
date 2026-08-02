const D=require('docx');
const {Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle,ImageRun,PageBreak,Table,TableRow,TableCell,WidthType,ShadingType}=D;
const fs=require('fs');
const SERIF="Georgia",NAVY="1F3352",RED="A5322C",INK="1A1A1A",GREY="555555";
const P=(o)=>new Paragraph(o),R=(o)=>new TextRun(o);

// inline tokenizer: ** -> bold(navy), * -> italic
function mkRuns(text,{color=INK,italic=false,size=21}={}){
  const out=[]; const re=/(\*\*[^*]+\*\*|\*[^*]+\*|[^*]+)/g; let m;
  while((m=re.exec(text))!==null){
    let t=m[0];
    if(t.startsWith("**")&&t.endsWith("**")) out.push(R({text:t.slice(2,-2),font:SERIF,bold:true,color:NAVY,size,italics:italic}));
    else if(t.startsWith("*")&&t.endsWith("*")) out.push(R({text:t.slice(1,-1),font:SERIF,italics:true,color,size}));
    else out.push(R({text:t,font:SERIF,color,size,italics:italic}));
  }
  return out.length?out:[R({text:text,font:SERIF,color,size})];
}
const header=(t)=>P({spacing:{before:300,after:130},keepNext:true,children:[R({text:"—  ",font:SERIF,bold:true,color:RED,size:24}),R({text:t,font:SERIF,bold:true,color:NAVY,size:24})]});
const subhead=(t)=>P({spacing:{before:180,after:70},keepNext:true,children:[R({text:t.replace(/\*\*/g,""),font:SERIF,bold:true,color:NAVY,size:21})]});
const subtitle=(t)=>P({alignment:AlignmentType.LEFT,spacing:{after:120,before:20},children:[R({text:t,font:SERIF,italics:true,color:GREY,size:20})]});
const body=(t)=>P({spacing:{after:140,line:284},alignment:AlignmentType.JUSTIFIED,children:mkRuns(t)});
const leadP=(bold,rest)=>P({spacing:{after:120,line:284},alignment:AlignmentType.JUSTIFIED,children:[R({text:bold.replace(/\*\*/g,"")+"  ",font:SERIF,bold:true,color:NAVY,size:21}),...mkRuns(rest)]});
const bullet=(t)=>P({spacing:{after:90,line:280},indent:{left:340,hanging:340},children:[R({text:"–  ",font:SERIF,bold:true,color:RED,size:21}),...mkRuns(t)]});
const quote=(t)=>P({spacing:{after:130,before:20,line:288},indent:{left:300},border:{left:{color:RED,style:BorderStyle.SINGLE,size:18,space:14}},children:mkRuns(t,{color:NAVY,italic:true})});

function parseMd(text){
  const lines=text.split("\n"); const out=[]; let started=false; let subDone=false;
  for(let raw of lines){
    const line=raw.replace(/\s+$/,"");
    if(!started){ if(line.startsWith("# ")){started=true; continue;} continue; }
    if(line.trim()==="") continue;
    if(line.startsWith("Document fondateur")) continue;
    if(line.startsWith("---")) continue;
    if(line.startsWith("## ")){ out.push(header(line.slice(3).trim())); continue; }
    if(line.startsWith("### ")){ out.push(subhead(line.slice(4).trim())); continue; }
    if(line.startsWith("> ")){ out.push(quote(line.slice(2).trim())); continue; }
    if(line.startsWith("- ")){ out.push(bullet(line.slice(2).trim())); continue; }
    if(!subDone && /^\*[^*].*\*$/.test(line) && !line.startsWith("**")){ out.push(subtitle(line.slice(1,-1))); subDone=true; continue; }
    const m=line.match(/^\*\*(.+?)\*\*(.*)$/);
    if(m){ if(m[2].trim()===""){ out.push(subhead(m[1])); } else { out.push(leadP(m[1], m[2].trim())); } continue; }
    out.push(body(line));
  }
  return out;
}

// ---- house pieces for cover / parts / visual identity ----
const partTitle=(num,t)=>[
  P({children:[new PageBreak()]}),
  P({spacing:{before:200,after:20},children:[R({text:num,font:SERIF,bold:true,color:RED,size:24,characterSpacing:30})]}),
  P({spacing:{after:60},border:{bottom:{color:RED,style:BorderStyle.SINGLE,size:12,space:6}},children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:34})]}),
];
const img=(file,w,h)=>P({alignment:AlignmentType.CENTER,spacing:{before:60,after:30},children:[new ImageRun({type:"png",data:fs.readFileSync(file),transformation:{width:w,height:h}})]});
const golden=(t)=>P({spacing:{before:300,after:120,line:300},indent:{left:220,right:220},border:{top:{color:RED,style:BorderStyle.SINGLE,size:18,space:10}},children:[R({text:t,font:SERIF,italics:true,color:RED,size:21})]});
function colorTable(rows){
  const cell=(t,{b=false,color=INK,fill=null,white=false,w=2500}={})=>new TableCell({width:{size:w,type:WidthType.DXA},shading:fill?{type:ShadingType.CLEAR,color:"auto",fill}:undefined,margins:{top:60,bottom:60,left:120,right:120},children:[P({children:[R({text:t,font:SERIF,bold:b,color:white?"FFFFFF":color,size:19})]})]});
  const trs=rows.map(r=>new TableRow({children:[cell(r.nom,{b:true,fill:r.hex,white:r.white,color:r.white?"FFFFFF":NAVY,w:2100}),cell("#"+r.hex,{color:NAVY,w:1500}),cell(r.role,{w:5400})]}));
  return new Table({columnWidths:[2100,1500,5400],width:{size:9000,type:WidthType.DXA},rows:trs});
}

const k=[];
// COVER
k.push(P({spacing:{before:1400,after:60},alignment:AlignmentType.CENTER,children:[R({text:"K E B R A N E",font:SERIF,bold:true,color:NAVY,size:52,characterSpacing:50})]}));
k.push(P({alignment:AlignmentType.CENTER,spacing:{after:40},children:[R({text:"Le Brand Book",font:SERIF,bold:true,color:NAVY,size:40})]}));
k.push(P({alignment:AlignmentType.CENTER,spacing:{after:20,before:120},children:[R({text:"Le système de marque complet — pourquoi, comment, à quoi il ressemble.",font:SERIF,italics:true,color:GREY,size:22})]}));
k.push(P({alignment:AlignmentType.CENTER,spacing:{before:200},border:{top:{color:RED,style:BorderStyle.SINGLE,size:12,space:8}},children:[R({text:"Document maître   ·   Version 1.0   ·   Juillet 2026",font:SERIF,color:NAVY,size:19})]}));

// SOMMAIRE
k.push(P({children:[new PageBreak()]}));
k.push(header("SOMMAIRE"));
const toc=[["Comment lire ce livre",""],["I","Le Manifeste — pourquoi nous existons"],["II","La Culture — comment nous nous comportons"],["III","Les Principes Produit — comment nous construisons"],["IV","L'Identité verbale — comment nous parlons"],["V","L'Identité visuelle — à quoi nous ressemblons"],["VI","L'Architecture de marque — une maison, plusieurs portes"]];
toc.forEach(([n,t])=>k.push(P({spacing:{after:90},children:[R({text:(n?n+"  —  ":""),font:SERIF,bold:true,color:RED,size:21}),R({text:t||n,font:SERIF,color:NAVY,size:21})]})));

// COMMENT LIRE
k.push(...partTitle("","COMMENT LIRE CE LIVRE"));
k.push(body("Ce livre rassemble en un seul endroit tout le système de marque Kebrane. Il est fait pour tenir seul : un designer, une recrue ou un partenaire qui ne nous a jamais rencontrés doit pouvoir, à partir de lui, comprendre pourquoi Kebrane existe, comment elle se comporte, comment elle construit, comment elle parle et à quoi elle ressemble."));
k.push(body("Les six parties se lisent dans l'ordre : le sens d'abord (Manifeste), les comportements ensuite (Culture, Principes, Identité verbale), la forme en dernier (Identité visuelle, Architecture). La forme sert le sens, jamais l'inverse."));
k.push(golden("Le jour où un texte de ce livre contredit nos actes, il faut corriger l'un ou l'autre, jamais faire semblant."));

// PARTS I-IV from md
const files=[["I — LE MANIFESTE","Le-Manifeste-de-Kebrane.md"],["II — LA CULTURE","Le-Livre-de-la-Culture-Kebrane.md"],["III — LES PRINCIPES PRODUIT","Les-Principes-Produit-Kebrane.md"],["IV — L'IDENTITÉ VERBALE","L-Identite-verbale-Kebrane.md"]];
for(const [pt,f] of files){
  const parts=pt.split(" — ");
  k.push(...partTitle("PARTIE "+parts[0], parts[1]));
  k.push(...parseMd(fs.readFileSync(f,"utf8")));
}

// PART V — IDENTITÉ VISUELLE (authored)
k.push(...partTitle("PARTIE V","L'IDENTITÉ VISUELLE"));
k.push(body("Le principe visuel prolonge la voix : clair avant d'être élégant, sobre, jamais tapageur. Le sens naît de ce qu'on retire — la barrière retirée est le dessin."));
k.push(header("LE SYMBOLE"));
k.push(leadP("Le A ouvert.","On retire la barre du A ; la lettre s'ouvre en arche, un passage que l'on franchit. C'est le monogramme, le favicon, l'icône d'application. (Dessin en cours de refonte par un studio ; ci-dessous, la forme de travail.)"));
k.push(img("kebrane-symbol-navy.png",90,95));
k.push(header("USAGE → FORME"));
k.push(bullet("**≥ 96 px** : le A nu (Marine, ou blanc réservé)."));
k.push(bullet("**64–24 px** : le A nu, sur fond clair et uni seulement."));
k.push(bullet("**< 24 px, fond chargé, icône d'app, avatar** : la pastille (A blanc sur carré/cercle Marine)."));
k.push(bullet("**Favicon ≤ 20 px** : pastille pixel-optimisée, ouverture élargie."));
k.push(leadP("Interdits.","Ne pas remettre la barre, ne pas boucher l'arche, ne pas recolorer le A, ne pas incliner, ne pas poser le A nu sous 24 px."));
k.push(header("LES COULEURS"));
k.push(body("Un cœur discipliné, quelques tons de service. Le Marine porte la confiance ; le Rouge ne sert que d'accent."));
k.push(colorTable([
 {nom:"Marine",hex:"1F3352",white:true,role:"Couleur mère. Titres, textes forts, fonds foncés."},
 {nom:"Rouge",hex:"A5322C",white:true,role:"Accent rare : dashes, règle d'or, ligne rouge. Jamais du texte courant."},
 {nom:"Ciel",hex:"A7C4DC",white:false,role:"Calme, états, liens. Pas de texte fin sur blanc."},
 {nom:"Sable",hex:"ECD8BE",white:false,role:"Fonds chauds, respirations. Jamais du texte."},
 {nom:"Encre",hex:"1A1A1A",white:true,role:"Texte courant."},
 {nom:"Papier",hex:"FBF9F5",white:false,role:"Fond par défaut."},
]));
k.push(header("LA TYPOGRAPHIE"));
k.push(body("Georgia comme voix éditoriale des documents : titres, corps, citations. Le logotype de marque, lui, sera dessiné sur mesure — jamais une police système."));

// PART VI — ARCHITECTURE
k.push(...partTitle("PARTIE VI","L'ARCHITECTURE DE MARQUE"));
k.push(body("Une maison, pas une collection. Le A, le Marine, Georgia et la voix sont universels. Ce qui distingue un produit, c'est une seule variable : la couleur de son conteneur d'icône. Le A ne se recolore jamais ; le Marine reste réservé à la marque mère."));
k.push(header("TROIS ÉTAGES"));
k.push(leadP("Marque mère.","Kebrane, abstraite, en Marine. Signe les produits en pied : « By Kebrane »."));
k.push(leadP("Divisions.","Kebrane Education, Kebrane Arrival — verrou logo + descripteur."));
k.push(leadP("Produits.","GermanPass, TCFPass, PermitPass, Arrival. Chacun porte le A universel dans sa couleur."));
k.push(header("LA GAMME D'ACCENTS"));
k.push(bullet("GermanPass — bleu ardoise (#4F7CA3)."));
k.push(bullet("TCFPass — vert sauge (#5F8A72)."));
k.push(bullet("PermitPass — ocre (#B0893F)."));
k.push(bullet("Arrival — prune (#7E6A93)."));
k.push(leadP("La règle.","Un nouvel accent se choisit dans la même famille : mi-saturé, harmonisé au Marine, jamais néon, jamais le Rouge de marque. Dans le produit, l'accent réapparaît par petites touches — jamais sur le A."));

// COLOPHON
k.push(...partTitle("","COLOPHON"));
k.push(body("Ce Brand Book v1.0 consolide les documents fondateurs suivants :"));
k.push(bullet("Le Manifeste de Kebrane — v1.0"));
k.push(bullet("Le Livre de la Culture Kebrane — v1.0"));
k.push(bullet("Les Principes Produit Kebrane — v0.9"));
k.push(bullet("L'Identité verbale de Kebrane — v0.9"));
k.push(bullet("La Charte graphique — v1.1 (identité visuelle)"));
k.push(bullet("L'Architecture de marque — v1.0"));
k.push(body("Documents de travail associés, hors Brand Book : le Protocole de sélection du nom, le Brief de Logo, la Grille de décision, le Test de reconnaissance, le Brief d'exécution au designer (v2.1) et la Feuille de route de protection de la marque."));
k.push(golden("Un designer qui n'a jamais rencontré les fondateurs doit pouvoir reconstruire toute la marque à partir de ce livre. C'est son seul vrai test."));

const doc=new Document({creator:"Kebrane",title:"Kebrane — Le Brand Book",
  styles:{default:{document:{run:{font:SERIF,size:21,color:INK}}}},
  sections:[{properties:{page:{margin:{top:1440,bottom:1440,left:1440,right:1440}}},children:k}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("Kebrane-Brand-Book.docx",b);console.log("brand book ok, paragraphs:",k.length);});

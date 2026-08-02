const d=require('docx');
const {Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle}=d;
const fs=require('fs');
const SERIF="Georgia",NAVY="1F3352",RED="A5322C",INK="1A1A1A",GREY="555555";
const P=(o)=>new Paragraph(o),R=(o)=>new TextRun(o);
const nameLine=(t)=>P({spacing:{before:300,after:40},alignment:AlignmentType.CENTER,children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:38,characterSpacing:40})]});
const bigTitle=(t,o={})=>P({alignment:AlignmentType.CENTER,spacing:{after:o.after??60,before:o.before??0},children:[R({text:t,font:SERIF,bold:true,color:NAVY,size:31})]});
const subtitle=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:40,before:140},children:[R({text:t,font:SERIF,italics:true,color:GREY,size:20})]});
const meta=(t)=>P({alignment:AlignmentType.CENTER,spacing:{after:120,before:60},children:[R({text:t,font:SERIF,color:NAVY,size:18})]});
const rule=()=>P({spacing:{after:200,before:60},border:{bottom:{color:RED,style:BorderStyle.SINGLE,size:12,space:6}},children:[R({text:"",size:2})]});
const header=(t)=>P({spacing:{before:300,after:130},keepNext:true,children:[R({text:"—  ",font:SERIF,bold:true,color:RED,size:24}),R({text:t,font:SERIF,bold:true,color:NAVY,size:24})]});
const body=(t)=>P({spacing:{after:140,line:284},alignment:AlignmentType.JUSTIFIED,children:[R({text:t,font:SERIF,color:INK,size:21})]});
const lead=(l,r)=>P({spacing:{after:110,line:284},children:[R({text:l+"  ",font:SERIF,bold:true,color:NAVY,size:21}),R({text:r,font:SERIF,color:INK,size:21})]});
const bullet=(t)=>P({spacing:{after:90,line:280},indent:{left:340,hanging:340},children:[R({text:"–  ",font:SERIF,bold:true,color:RED,size:21}),R({text:t,font:SERIF,color:INK,size:21})]});
const golden=(t)=>P({spacing:{before:300,after:120,line:300},indent:{left:220,right:220},border:{top:{color:RED,style:BorderStyle.SINGLE,size:18,space:10}},children:[R({text:t,font:SERIF,italics:true,color:RED,size:21})]});

const k=[];
k.push(nameLine("K E B R A N E"));
k.push(bigTitle("Feuille de route — Protection de la marque",{before:100,after:50}));
k.push(subtitle("Verrouiller le nom avant d'investir. La leçon Orivane : les faits d'abord."));
k.push(meta("Document opérationnel   ·   Version 1.0   ·   29 juillet 2026"));
k.push(rule());
k.push(body("Avertissement : ce document est un plan d'action, pas un avis juridique. Le screen initial ci-dessous est un premier filtre web ; la clearance réelle exige une recherche TMview / EUIPO / OAPI et, idéalement, un conseil en propriété industrielle. C'est ce contrôle officiel qui avait révélé le conflit sur Orivane — on ne s'en passe pas."));

k.push(header("OÙ ON EN EST (screen initial)"));
k.push(lead("Marque.","Aucune société ni marque commerciale « Kebrane » n'est ressortie du screen web. Encourageant, mais non concluant."));
k.push(lead("À noter.","« Kebrane Gabriel » est un monastère éthiopien du lac Tana — nom religieux/géographique, pas une marque. Risque commercial faible, mais à trancher en conscience."));
k.push(lead("Domaines.","kebrane.com est déjà enregistré (à toi, IONOS). kebrane.de et kebrane.eu sont libres ; kebrane.app ≈ 9,99 $/an ; kebrane.io ≈ 37,99 $/an."));
k.push(lead("Handle.","@kebrane est déjà pris sur X (Twitter). Prévoir une variante, tenue partout."));

k.push(header("ÉTAPE 1 — CLEARANCE OFFICIELLE (avant tout dépôt)"));
k.push(bullet("Recherche TMview sur KEBRANE et ses proches phonétiques, dans les classes visées et les territoires cibles (UE, Allemagne, France, zone OAPI / Cameroun)."));
k.push(bullet("Vérifier EUIPO (eSearch) et le registre OAPI directement."));
k.push(bullet("Faire valider par un conseil en propriété industrielle : c'est le contrôle qui a sauvé la mise sur Orivane."));
k.push(bullet("Ne rien annoncer publiquement avant la clearance."));

k.push(header("ÉTAPE 2 — DÉPÔT DE MARQUE"));
k.push(bullet("EUIPO — classes de Nice 9 (logiciels, applications), 41 (éducation, formation) et 42 (SaaS, développement logiciel)."));
k.push(bullet("OAPI (Cameroun et zone OAPI) — mêmes classes."));
k.push(bullet("Déposer d'abord la marque verbale « Kebrane ». Le logo figuratif se dépose plus tard, une fois le designer livré — surtout pas le tracé provisoire."));
k.push(bullet("Conserver les preuves et dates de première utilisation."));

k.push(header("ÉTAPE 3 — DOMAINES"));
k.push(bullet("Acheter kebrane.de chez IONOS (≈ 15 €/an, carte simple, jamais le bundle) — comme prévu."));
k.push(bullet("Sécuriser les défensifs utiles : kebrane.eu, kebrane.app, kebrane.io."));
k.push(bullet("Tout rattacher au même compte, renouvellement automatique activé."));

k.push(header("ÉTAPE 4 — HANDLES SOCIAUX"));
k.push(bullet("@kebrane étant pris, choisir UNE variante et la tenir partout : par ex. @kebraneHQ, @wearekebrane ou @getkebrane."));
k.push(bullet("Bloquer sur X, Instagram, LinkedIn (page), TikTok, YouTube et GitHub (organisation), même sans activité immédiate."));
k.push(bullet("La cohérence du handle vaut mieux que le handle parfait : même nom partout."));

k.push(header("ORDRE & RÈGLE"));
k.push(body("Ordre : clearance officielle → dépôt de la marque verbale → domaines et handles (en parallèle) → dépôt du logo figuratif au retour du designer. Règle : aucune dépense de design public ni de communication avant la clearance."));
k.push(golden("Un nom qu'on n'a pas verrouillé n'est pas encore le sien. Les faits d'abord, l'attachement en dernier."));

const doc=new Document({creator:"Kebrane",title:"Feuille de route — Protection de la marque Kebrane",
  styles:{default:{document:{run:{font:SERIF,size:21,color:INK}}}},
  sections:[{properties:{page:{margin:{top:1440,bottom:1440,left:1440,right:1440}}},children:k}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync("Kebrane-Protection-de-la-marque.docx",b);console.log("protection doc ok");});

import { test } from "node:test";
import assert from "node:assert/strict";
import { tendanceScore } from "@/lib/tendance";

const serie = (...pcts: number[]) => pcts.map((pct) => ({ pct }));

test("en dessous de quatre sessions, on ne conclut pas", () => {
  assert.equal(tendanceScore(serie()), null);
  assert.equal(tendanceScore(serie(40, 90)), null);
  assert.equal(tendanceScore(serie(40, 60, 90)), null);
});

test("une progression est detectee", () => {
  // 2 precedentes a 40, 2 recentes a 60 -> +20
  const t = tendanceScore(serie(40, 40, 60, 60));
  assert.deepEqual(t, { delta: 20, fenetre: 2 });
});

test("une baisse est detectee, et son signe est negatif", () => {
  const t = tendanceScore(serie(80, 80, 50, 50));
  assert.equal(t?.delta, -30);
});

test("un plateau donne zero, pas null — stable est une information", () => {
  assert.equal(tendanceScore(serie(70, 70, 70, 70))?.delta, 0);
});

test("la fenetre est plafonnee a cinq et ne se chevauche jamais", () => {
  const t = tendanceScore(serie(...Array(30).fill(50)));
  assert.equal(t?.fenetre, 5);
});

test("seules les sessions comparees comptent, pas tout l'historique", () => {
  // 12 sessions -> fenetre de 5 : les deux zeros initiaux sortent des deux
  // fenetres comparees. La tendance recente est plate, et c'est ce qu'il faut
  // annoncer plutot que de trainer un mauvais depart indefiniment.
  const t = tendanceScore(serie(0, 0, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70));
  assert.equal(t?.delta, 0);
});

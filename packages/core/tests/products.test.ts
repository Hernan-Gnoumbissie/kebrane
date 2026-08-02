import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { products, PRODUCT_REGISTRY, ProductStatus } from "../src/index";
import { db, tracker, testSlug } from "./helpers";

/**
 * KB-18 — `products.syncRegistry` : le seed du catalogue (KB-09).
 *
 * Il est rejoué à CHAQUE déploiement (KB-21). Deux exigences, donc : il doit
 * converger vers le registre déclaratif, et être rejouable sans rien casser ni
 * dupliquer. La landing (KB-19) et le hub en dépendent tous les deux.
 */
describe("products", () => {
  const t = tracker();
  after(() => t.cleanup());

  test("upsert crée puis met à jour, sans jamais dupliquer le slug", async () => {
    const slug = testSlug("upsert");
    t.product(slug);

    const created = await products.upsert({ slug, name: "Avant" });
    assert.equal(created.name, "Avant");
    assert.equal(created.status, ProductStatus.COMING_SOON, "statut prudent par défaut");

    const updated = await products.upsert({
      slug,
      name: "Après",
      accentColor: "#123456",
      status: ProductStatus.ACTIVE,
    });

    assert.equal(updated.id, created.id, "même ligne, pas un doublon");
    assert.equal(updated.name, "Après");
    assert.equal(updated.accentColor, "#123456");
    assert.equal(await db.product.count({ where: { slug } }), 1);
  });

  test("upsert efface les champs absents plutôt que de les conserver", async () => {
    // Le registre est DÉCLARATIF : retirer une accroche du fichier doit la
    // retirer en base, sinon le seed ne converge pas vers ce qui est écrit.
    const slug = testSlug("declaratif");
    t.product(slug);

    await products.upsert({ slug, name: "P", tagline: "Une accroche" });
    const after_ = await products.upsert({ slug, name: "P" });

    assert.equal(after_.tagline, null);
  });

  test("syncRegistry applique tout le registre déclaratif", async () => {
    const synced = await products.syncRegistry();

    assert.equal(synced.length, PRODUCT_REGISTRY.length);
    for (const definition of PRODUCT_REGISTRY) {
      const row = synced.find((p) => p.slug === definition.slug);
      assert.ok(row, `${definition.slug} doit être enregistré`);
      assert.equal(row.name, definition.name);
      assert.equal(row.status, definition.status);
      assert.equal(row.accentColor, definition.accentColor);
    }
  });

  test("syncRegistry est rejouable : mêmes lignes, pas de doublon", async () => {
    const first = await products.syncRegistry();
    const second = await products.syncRegistry();

    assert.deepEqual(
      second.map((p) => p.id).sort(),
      first.map((p) => p.id).sort(),
      "un déploiement ne doit pas recréer le catalogue"
    );

    for (const definition of PRODUCT_REGISTRY) {
      assert.equal(await db.product.count({ where: { slug: definition.slug } }), 1);
    }
  });

  test("le registre déclaratif est cohérent", async () => {
    // Garde-fou : ces invariants sont supposés par le hub et la landing.
    const slugs = PRODUCT_REGISTRY.map((p) => p.slug);
    assert.equal(new Set(slugs).size, slugs.length, "slugs uniques");

    for (const p of PRODUCT_REGISTRY) {
      assert.match(p.accentColor, /^#[0-9A-Fa-f]{6}$/, `${p.slug} : accent HEX attendu`);
      if (p.status === ProductStatus.ACTIVE) {
        assert.ok(p.url, `${p.slug} est ACTIVE : il lui faut une URL pour être ouvrable`);
      }
    }
  });

  test("bySlug retrouve un produit enregistré, et rien d'autre", async () => {
    const slug = testSlug("by-slug");
    t.product(slug);
    await products.upsert({ slug, name: "Cherché" });

    assert.equal((await products.bySlug(slug))?.name, "Cherché");
    assert.equal(await products.bySlug("slug-inexistant"), null);
  });
});

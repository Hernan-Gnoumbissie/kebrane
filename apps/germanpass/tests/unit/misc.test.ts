import "./setup-env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { sm2 } from "@/lib/srs";
import { isCopyViolation } from "@/lib/anti-copy";
import { computeNewAccessUntil } from "@/lib/account";
import { detectMime } from "@/lib/storage";
import { chunkText, estimateTokens } from "@/lib/chunking";

// ---------- SM-2 ----------
test("SM-2 : première révision réussie → intervalle 1 j", () => {
  const r = sm2({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, 4);
  assert.equal(r.intervalDays, 1);
  assert.equal(r.repetitions, 1);
});

test("SM-2 : deuxième révision réussie → intervalle 6 j", () => {
  const r = sm2({ easeFactor: 2.5, intervalDays: 1, repetitions: 1 }, 4);
  assert.equal(r.intervalDays, 6);
});

test("SM-2 : troisième révision → intervalle × EF", () => {
  const r = sm2({ easeFactor: 2.5, intervalDays: 6, repetitions: 2 }, 5);
  assert.equal(r.intervalDays, 15);
  assert.ok(r.easeFactor > 2.5);
});

test("SM-2 : échec (quality < 3) → reset, intervalle 1 j", () => {
  const r = sm2({ easeFactor: 2.5, intervalDays: 30, repetitions: 5 }, 1);
  assert.equal(r.repetitions, 0);
  assert.equal(r.intervalDays, 1);
  assert.equal(r.easeFactor, 2.5);
});

test("SM-2 : EF plancher à 1,3", () => {
  const state = { easeFactor: 1.31, intervalDays: 1, repetitions: 1 };
  const r = sm2(state, 3);
  assert.ok(r.easeFactor >= 1.3);
});

test("SM-2 : quality hors bornes → erreur", () => {
  assert.throws(() => sm2({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, 6));
  assert.throws(() => sm2({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, -1));
  assert.throws(() => sm2({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, 2.5));
});

// ---------- Anti-copie ----------
test("anti-copie : sous les seuils → ok", () => {
  assert.equal(isCopyViolation(0.54, 0.91), false);
});

test("anti-copie : trigram au seuil → violation", () => {
  assert.equal(isCopyViolation(0.55, 0), true);
});

test("anti-copie : embedding au seuil → violation", () => {
  assert.equal(isCopyViolation(0, 0.92), true);
});

// ---------- Expiration de compte ----------
test("computeNewAccessUntil : accès encore valide → prolongation depuis accessUntil", () => {
  const now = new Date("2026-06-11T00:00:00Z");
  const current = new Date("2026-06-20T00:00:00Z");
  const r = computeNewAccessUntil(current, 30, now);
  assert.equal(r.toISOString(), new Date("2026-07-20T00:00:00Z").toISOString());
});

test("computeNewAccessUntil : accès expiré → prolongation depuis maintenant", () => {
  const now = new Date("2026-06-11T00:00:00Z");
  const current = new Date("2026-06-01T00:00:00Z");
  const r = computeNewAccessUntil(current, 7, now);
  assert.equal(r.toISOString(), new Date("2026-06-18T00:00:00Z").toISOString());
});

test("computeNewAccessUntil : jamais activé (null) → depuis maintenant", () => {
  const now = new Date("2026-06-11T00:00:00Z");
  const r = computeNewAccessUntil(null, 365, now);
  assert.equal(r.toISOString(), new Date("2027-06-11T00:00:00Z").toISOString());
});

// ---------- Détection MIME (magic bytes) ----------
test("detectMime : JPEG", () => {
  const buf = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
  assert.equal(detectMime(buf)?.mime, "image/jpeg");
});

test("detectMime : PNG", () => {
  const buf = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(8),
  ]);
  assert.equal(detectMime(buf)?.mime, "image/png");
});

test("detectMime : PDF", () => {
  const buf = Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(8)]);
  assert.equal(detectMime(buf)?.mime, "application/pdf");
});

test("detectMime : WebM", () => {
  const buf = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(12)]);
  assert.equal(detectMime(buf)?.mime, "audio/webm");
});

test("detectMime : OGG", () => {
  const buf = Buffer.concat([Buffer.from("OggS"), Buffer.alloc(12)]);
  assert.equal(detectMime(buf)?.mime, "audio/ogg");
});

test("detectMime : MP3 (ID3)", () => {
  const buf = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(12)]);
  assert.equal(detectMime(buf)?.mime, "audio/mpeg");
});

test("detectMime : WEBP", () => {
  const buf = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);
  assert.equal(detectMime(buf)?.mime, "image/webp");
});

test("detectMime : texte brut → text/plain", () => {
  assert.equal(detectMime(Buffer.from("hello world, this is text"))?.mime, "text/plain");
});

test("detectMime : binaire inconnu (octets null) → null", () => {
  // Données binaires non reconnues : magic-bytes inconnus + octet null → refusé.
  const buf = Buffer.concat([Buffer.from([0x9a, 0x7b, 0x00, 0x42]), Buffer.alloc(12)]);
  assert.equal(detectMime(buf), null);
});

test("detectMime : buffer trop court → null", () => {
  assert.equal(detectMime(Buffer.from([0x01, 0x02])), null);
});

// ---------- Chunking ----------
test("chunkText : texte court → un seul chunk", () => {
  const chunks = chunkText("Ein kurzer Text.");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]?.position, 0);
});

test("chunkText : texte vide → aucun chunk", () => {
  assert.deepEqual(chunkText("   "), []);
});

test("chunkText : long texte → plusieurs chunks ~512 tokens, positions croissantes", () => {
  const long = Array.from({ length: 300 }, (_, i) => `Satz nummer ${i} über das Wetter in Berlin.`).join(" ");
  const chunks = chunkText(long);
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.ok(c.tokenCount <= 600, `chunk trop grand: ${c.tokenCount}`);
  }
  assert.deepEqual(
    chunks.map((c) => c.position),
    chunks.map((_, i) => i)
  );
});

test("estimateTokens : ~4 caractères par token", () => {
  assert.equal(estimateTokens("abcdefgh"), 2);
});

import "./setup-env";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { toKebraneAccessStatus } from "@/lib/kebrane";

/**
 * KB-08 — traduction de l'état d'accès GermanPass vers le statut d'accès Kebrane
 * (`ProductAccess.status`), ce que le hub affiche « Actif / En attente / À souscrire ».
 * Fonction pure : testable sans base ni Core.
 */
describe("toKebraneAccessStatus", () => {
  const now = new Date("2026-08-02T12:00:00Z");
  const past = new Date("2026-07-01T00:00:00Z");
  const future = new Date("2026-09-01T00:00:00Z");

  test("ACTIVE sans échéance → NONE (socle gratuit permanent, non payant)", () => {
    assert.equal(toKebraneAccessStatus({ status: "ACTIVE", accessUntil: null }, now), "NONE");
  });

  test("ACTIVE avec échéance future → ACTIVE", () => {
    assert.equal(toKebraneAccessStatus({ status: "ACTIVE", accessUntil: future }, now), "ACTIVE");
  });

  test("ACTIVE mais échéance dépassée → NONE (l'accès est consommé)", () => {
    assert.equal(toKebraneAccessStatus({ status: "ACTIVE", accessUntil: past }, now), "NONE");
  });

  test("ACTIVE expirant exactement maintenant → NONE (borne exclusive)", () => {
    assert.equal(toKebraneAccessStatus({ status: "ACTIVE", accessUntil: now }, now), "NONE");
  });

  test("PENDING (preuve de paiement en attente) → PENDING", () => {
    assert.equal(toKebraneAccessStatus({ status: "PENDING", accessUntil: null }, now), "PENDING");
  });

  test("SUSPENDED → SUSPENDED", () => {
    assert.equal(
      toKebraneAccessStatus({ status: "SUSPENDED", accessUntil: future }, now),
      "SUSPENDED"
    );
  });

  test("EXPIRED → NONE", () => {
    assert.equal(toKebraneAccessStatus({ status: "EXPIRED", accessUntil: past }, now), "NONE");
  });

  test("DELETED → NONE", () => {
    assert.equal(toKebraneAccessStatus({ status: "DELETED", accessUntil: null }, now), "NONE");
  });
});

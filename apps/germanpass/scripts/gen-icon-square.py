#!/usr/bin/env python3
"""
GermanPass PWA Icon Generator
Génère les icônes carrées 512x512, 192x192, 180x180 et 32x32
avec bouclier allemand sur fond bleu marine.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import math

# ── Chemins de sortie ────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ICONS_DIR = os.path.join(PROJECT_ROOT, "public", "icons")
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "public")

os.makedirs(ICONS_DIR, exist_ok=True)

# ── Couleurs ─────────────────────────────────────────────────────
BG_TOP    = (15, 35, 66)   # #0f2342
BG_BOT    = (26, 54, 96)   # #1a3660
BLACK     = (26, 26, 26)   # #1a1a1a
RED       = (221, 0, 0)    # #dd0000
GOLD      = (255, 204, 0)  # #ffcc00
WHITE     = (255, 255, 255)


def draw_gradient_bg(draw, size):
    """Fond dégradé vertical bleu marine."""
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b))


def shield_polygon(cx, cy, w, h):
    """
    Calcule les points du bouclier centré en (cx, cy).
    w = largeur totale, h = hauteur totale.
    Forme: rectangle en haut + pointe arrondie en bas.
    Renvoie une liste de points pour ImageDraw.polygon().
    """
    x0 = cx - w // 2
    x1 = cx + w // 2
    y0 = cy - h // 2
    y1 = cy + h // 2

    # Pourcentage de hauteur où commence l'arrondi vers la pointe
    curve_start = 0.65

    points = []

    # Côté gauche en haut, arrondi top-left
    r = int(w * 0.08)  # rayon des coins haut

    # top-left arc
    for angle in range(180, 270, 5):
        rad = math.radians(angle)
        points.append((x0 + r + r * math.cos(rad), y0 + r + r * math.sin(rad)))

    # top-right arc
    for angle in range(270, 360, 5):
        rad = math.radians(angle)
        points.append((x1 - r + r * math.cos(rad), y0 + r + r * math.sin(rad)))

    # Droite vers bas
    curve_y = y0 + int(h * curve_start)
    points.append((x1, curve_y))

    # Courbe vers la pointe (côté droit)
    n_pts = 20
    for i in range(n_pts + 1):
        t = i / n_pts
        # De (x1, curve_y) vers (cx, y1) avec une courbe de Bézier quadratique
        ctrl_x = x1
        ctrl_y = y1
        px = (1-t)**2 * x1 + 2*(1-t)*t * ctrl_x + t**2 * cx
        py = (1-t)**2 * curve_y + 2*(1-t)*t * ctrl_y + t**2 * y1
        points.append((px, py))

    # Côté gauche depuis la pointe
    for i in range(n_pts, -1, -1):
        t = i / n_pts
        ctrl_x = x0
        ctrl_y = y1
        px = (1-t)**2 * x0 + 2*(1-t)*t * ctrl_x + t**2 * cx
        py = (1-t)**2 * curve_y + 2*(1-t)*t * ctrl_y + t**2 * y1
        points.append((px, py))

    points.append((x0, curve_y))

    return points


def generate_icon(size=512):
    """Génère l'icône à la taille donnée."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fond dégradé
    draw_gradient_bg(draw, size)

    scale = size / 512

    # Dimensions du bouclier (centré légèrement plus haut que le milieu)
    sh_w = int(280 * scale)
    sh_h = int(320 * scale)
    cx = size // 2
    cy = int(size * 0.48)

    # ── Contour blanc (légèrement plus grand) ──
    border = int(4 * scale)
    outline_pts = shield_polygon(cx, cy, sh_w + border * 2, sh_h + border * 2)
    draw.polygon(outline_pts, fill=WHITE)

    # ── Masque du bouclier ──────────────────────────────────────
    shield_pts = shield_polygon(cx, cy, sh_w, sh_h)

    # Créer un masque de la forme du bouclier
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.polygon(shield_pts, fill=255)

    # ── Calque des bandes de couleur ────────────────────────────
    bands = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bands_draw = ImageDraw.Draw(bands)

    y0_shield = cy - sh_h // 2
    y1_shield = cy + sh_h // 2
    third = sh_h // 3

    # Tiers supérieur : noir
    bands_draw.rectangle([0, y0_shield, size, y0_shield + third], fill=BLACK + (255,))
    # Tiers central : rouge
    bands_draw.rectangle([0, y0_shield + third, size, y0_shield + 2 * third], fill=RED + (255,))
    # Tiers inférieur : or
    bands_draw.rectangle([0, y0_shield + 2 * third, size, y1_shield + 50], fill=GOLD + (255,))

    # Appliquer le masque du bouclier aux bandes
    bands.putalpha(mask)
    img.paste(bands, mask=bands)

    # ── Coche ✓ au centre du rouge ──────────────────────────────
    check_cx = cx
    check_cy = y0_shield + third + third // 2  # milieu du tiers rouge
    check_size = int(80 * scale)

    # Dessiner la coche avec des lignes épaisses
    lw = max(int(10 * scale), 3)
    # Branche gauche : de bas-gauche vers le creux
    p1 = (check_cx - int(32 * scale), check_cy + int(5 * scale))
    p2 = (check_cx - int(8 * scale), check_cy + int(28 * scale))
    # Branche droite : du creux vers haut-droite
    p3 = (check_cx + int(38 * scale), check_cy - int(28 * scale))

    # Dessiner avec épaisseur en empilant des lignes décalées
    for offset in range(-lw // 2, lw // 2 + 1):
        draw.line([
            (p1[0], p1[1] + offset),
            (p2[0], p2[1] + offset),
        ], fill=WHITE, width=lw)
        draw.line([
            (p2[0], p2[1] + offset),
            (p3[0], p3[1] + offset),
        ], fill=WHITE, width=lw)

    # Dessin supplémentaire avec offset horizontal pour épaissir
    for offset in range(-lw // 3, lw // 3 + 1):
        draw.line([
            (p1[0] + offset, p1[1]),
            (p2[0] + offset, p2[1]),
        ], fill=WHITE, width=lw)
        draw.line([
            (p2[0] + offset, p2[1]),
            (p3[0] + offset, p3[1]),
        ], fill=WHITE, width=lw)

    # ── Texte "GP" sous le bouclier ─────────────────────────────
    gp_y = cy + sh_h // 2 + int(22 * scale)
    gp_size = int(40 * scale)

    try:
        # Essayer une police système bold
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", gp_size)
    except Exception:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", gp_size)
        except Exception:
            font = ImageFont.load_default()

    text = "GP"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text(
        (cx - text_w // 2, gp_y),
        text,
        fill=WHITE,
        font=font,
    )

    return img


def main():
    print("Génération de l'icône 512×512...")
    icon_512 = generate_icon(512)
    out_512 = os.path.join(ICONS_DIR, "icon-512.png")
    icon_512.save(out_512, "PNG")
    print(f"  ✓ {out_512}")

    print("Génération de l'icône 192×192...")
    icon_192 = generate_icon(192)
    out_192 = os.path.join(ICONS_DIR, "icon-192.png")
    icon_192.save(out_192, "PNG")
    print(f"  ✓ {out_192}")

    print("Génération de l'icône 180×180 (apple-touch-icon)...")
    icon_180 = generate_icon(180)
    out_180 = os.path.join(ICONS_DIR, "apple-touch-icon.png")
    # Apple-touch-icon ne supporte pas la transparence — fond opaque
    bg = Image.new("RGB", (180, 180), BG_TOP)
    bg.paste(icon_180, mask=icon_180.split()[3])
    bg.save(out_180, "PNG")
    print(f"  ✓ {out_180}")

    print("Génération de l'icône 32×32...")
    icon_32 = generate_icon(32)
    out_32_png = os.path.join(ICONS_DIR, "icon-32.png")
    icon_32.save(out_32_png, "PNG")
    print(f"  ✓ {out_32_png}")

    # Favicon .ico (format multi-taille : 16, 32, 48)
    icon_16 = generate_icon(16)
    icon_48 = generate_icon(48)
    out_ico = os.path.join(PUBLIC_DIR, "favicon.ico")
    # Convertir en RGB pour ICO
    def to_rgb(img):
        bg = Image.new("RGB", img.size, BG_TOP)
        if img.mode == "RGBA":
            bg.paste(img, mask=img.split()[3])
        else:
            bg.paste(img)
        return bg

    ico_img = to_rgb(icon_32)
    ico_img.save(
        out_ico,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[to_rgb(icon_16), to_rgb(icon_48)],
    )
    print(f"  ✓ {out_ico}")

    print("\nToutes les icônes ont été générées avec succès !")


if __name__ == "__main__":
    main()

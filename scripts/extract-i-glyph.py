#!/usr/bin/env python3
"""
Extract the "i" glyph from a TTF font and save as SVG (like horn-icon.svg).
Usage: python scripts/extract-i-glyph.py
"""

import os
from pathlib import Path

# Add fonttools - will be installed via pip
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    font_path = project_root / "fanjofey.ttf"
    # Output to generated file (info-i-25.svg is the active icon)
    output_path = project_root / "client" / "src" / "assets" / "info-i-from-font.svg"

    if not font_path.exists():
        print(f"Error: Font not found at {font_path}")
        return 1

    font = TTFont(font_path)
    glyph_set = font.getGlyphSet()
    cmap = font["cmap"].getBestCmap()

    # Find glyph name for "i" (Unicode U+0069)
    glyph_name = cmap.get(ord("i"))
    if not glyph_name:
        # Try alternate names
        for name in ["i", "I", "uni0069"]:
            if name in glyph_set:
                glyph_name = name
                break
        if not glyph_name:
            print("Error: Could not find 'i' glyph in font. Available glyphs:", list(glyph_set.keys())[:20])
            return 1

    print(f"Using glyph: {glyph_name}")

    # SVGPathPen outputs path with font coords (Y-up). We need Y-down for SVG.
    # TransformPen with (1, 0, 0, -1, 0, 0) flips Y
    svg_pen = SVGPathPen(glyph_set)
    transform_pen = TransformPen(svg_pen, (1, 0, 0, -1, 0, 0))

    glyph = glyph_set[glyph_name]
    glyph.draw(transform_pen)
    path_d = svg_pen.getCommands()

    # Get font metrics for viewBox
    hhea = font["hhea"]
    ascent = hhea.ascent
    descent = hhea.descent
    units_per_em = font["head"].unitsPerEm

    # Glyph width
    glyph_width = glyph.width

    # Create viewBox that fits the glyph, similar to horn-icon (512x512)
    # Scale to fit in 512x512
    view_size = 512
    scale = view_size / units_per_em
    # Center the glyph
    x_offset = (view_size - glyph_width * scale) / 2
    y_offset = (view_size + (ascent + descent) * scale / 2) / 2

    # Wrap path in transform to scale and center
    transform = f"translate({x_offset} {y_offset}) scale({scale} -{scale})"
    # Actually, the path is already in font units. We need to scale it.
    # Simpler: use viewBox "0 0 units_per_em height" and scale via SVG
    # Or: apply transform to the path coordinates... complex.
    # Simpler approach: use the font's coordinate space as viewBox
    # and let the SVG scale. viewBox="0 -ascent width ascent-descent" typically.
    # For a 512x512 output like horn-icon, we want the glyph centered and scaled.
    # Let me use a simpler approach: viewBox based on glyph bounds
    # The path from SVGPathPen is in font units. Typical font: ascent ~800, descent ~-200, so 0 to 1000
    # Let's use viewBox="0 0 512 512" and wrap the path in a transform
    # transform="scale(0.5) translate(0, 512)" or similar to flip and scale
    # Actually the TransformPen already flipped Y. So we have Y-down coords in font units.
    # Font units: typically 0 to 1000 for height. Width varies.
    # For 512x512 output: viewBox="0 0 512 512", and we need to scale the path.
    # The path d is in font coords. We can wrap it: <g transform="scale(s) translate(x,y)"><path d="..."/></g>
    # scale = 512/units_per_em, translate to center
    # Units: x from 0 to glyph_width, y from -descent to ascent (after our flip, descent to -ascent)
    # Actually after TransformPen (1,0,0,-1,0,0): y is negated. So original y=100 becomes y=-100.
    # Font: y goes from descent (negative) to ascent (positive). After flip: -ascent to -descent.
    # So our path has y in range roughly -ascent to -descent.
    # Let me use a simpler viewBox: 0 0 glyph_width ascent-descent, then scale to 512
    # viewBox="0 0 {glyph_width} {ascent - descent}" - but y might be negative
    # Standard: viewBox="0 {-descent} {glyph_width} {ascent - descent}" - origin at baseline
    # For 512x512 icon: viewBox="0 0 512 512", path needs transform
    # transform="scale(512/units_per_em) translate(0, units_per_em)" to scale and shift
    # Actually scale(512/1000) translate(0, 1000) - no, that's wrong
    # Simpler: put path in a group with transform="scale(s) translate(tx, ty)"
    # s = 512/units_per_em, tx = -glyph_width/2 * s + 256, ty = 256 - (ascent+descent)/2 * s
    # Actually let me just use the path directly with a viewBox that matches.
    # viewBox="0 0 {units_per_em} {units_per_em}" and the path - but our path might have negative y
    # Let me check - after TransformPen flip, y values: original ascent=800 -> -800, descent=-200 -> 200
    # So y range is -ascent to -descent. For ascent=800, descent=-200: -800 to 200.
    # viewBox="0 -800 1000 1000" would work. But we want 512x512.
    # Easiest: use viewBox="0 0 512 512" and transform the path so it fits.
    # We'll use a group: <g transform="translate(256,256) scale(0.4) translate(-glyph_width/2,-ascent/2)">  # rough
    # Simpler: use viewBox that matches font and scale. viewBox="0 -{ascent} {glyph_width} {ascent-descent}"
    # Then width="512" height="512" preserveAspectRatio="xMidYMid meet" - SVG will scale to fit.
    # Let me try: viewBox="0 -{ascent} {glyph_width} {ascent-descent}" - but descent is negative
    # ascent-descent = 800 - (-200) = 1000. viewBox="0 -800 200 1000" for a 200-wide glyph
    # Actually the path coordinates - we flipped Y. So the path has y negated.
    # Original glyph: y from descent to ascent. After flip: -ascent to -descent.
    # So viewBox minY = -ascent, height = ascent - descent (since descent is negative, ascent - descent = ascent + |descent|)
    # viewBox="0 {-ascent} {glyph_width} {ascent - descent}"
    # Hmm, -ascent is negative. viewBox can have negative values.
    # viewBox="0 -800 200 1000" - x from 0 to 200, y from -800 to 200. Good.
    vb_x = 0
    vb_y = -ascent
    vb_w = max(glyph_width, units_per_em)
    vb_h = ascent - descent

    # For 512x512 output matching horn-icon style
    svg_content = f'''<?xml version="1.0" encoding="utf-8"?>
<svg width="512" height="512" viewBox="{vb_x} {vb_y} {vb_w} {vb_h}" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="{path_d}"/></svg>'''

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(svg_content, encoding="utf-8")
    print(f"Wrote {output_path}")
    return 0

if __name__ == "__main__":
    exit(main())

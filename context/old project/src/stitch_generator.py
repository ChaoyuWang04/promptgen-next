#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Image Stitching Module for Final Ad Creative Generation
Combines main image and diff image with multilingual text overlay
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import re
import random
import platform
from typing import Dict, Tuple, Optional

# ====================================================================================
# Language Templates
# ====================================================================================

LANGUAGE_TEMPLATES = {
    1: {  # English
        "name": "English",
        "line1": "I've tried <c:#ff1a1a>{tries}</c> times but",
        "line2": "still can't find <c:#ff1a1a> 10 </c> differences"
    },
    2: {  # French
        "name": "Français",
        "line1": "J'ai essayé <c:#ff1a1a>{tries}</c> fois mais",
        "line2": "je ne trouve toujours pas <c:#ff1a1a> 10 </c> différences"
    },
    3: {  # Japanese
        "name": "日本語",
        "line1": "<c:#ff1a1a>{tries}</c>回試しましたが",
        "line2": "まだ<c:#ff1a1a> 10 </c>つの違いが見つかりません"
    },
    4: {  # Korean
        "name": "한국어",
        "line1": "<c:#ff1a1a>{tries}</c>번 시도했지만",
        "line2": "아직도 <c:#ff1a1a> 10 </c>개의 차이점을 못 찾았어요"
    },
    5: {  # German
        "name": "Deutsch",
        "line1": "Ich habe es <c:#ff1a1a>{tries}</c> Mal versucht",
        "line2": "aber ich finde immer noch <c:#ff1a1a> 10 </c> Unterschiede nicht"
    },
    6: {  # Spanish
        "name": "Español",
        "line1": "He intentado <c:#ff1a1a>{tries}</c> veces pero",
        "line2": "todavía no puedo encontrar <c:#ff1a1a> 10 </c> diferencias"
    },
    7: {  # Traditional Chinese
        "name": "繁體中文",
        "line1": "我已經試了<c:#ff1a1a>{tries}</c>次了",
        "line2": "但還是找不到<c:#ff1a1a> 10 </c>個不同"
    }
}

# ====================================================================================
# Font Configuration
# ====================================================================================

FONT_CONFIG = {
    1: "ARIAL.TTF",                              # English
    2: "ARIAL.TTF",                              # Français
    3: "NotoSansJP-VariableFont_wght.ttf",      # 日本語
    4: "NotoSansKR-VariableFont_wght.ttf",      # 한국어
    5: "ARIAL.TTF",                              # Deutsch
    6: "ARIAL.TTF",                              # Español
    7: "NotoSansTC-VariableFont_wght.ttf"       # 繁體中文
}

LANGUAGE_CODE = {
    1: "en",   # English
    2: "fr",   # Français
    3: "ja",   # 日本語
    4: "ko",   # 한국어
    5: "de",   # Deutsch
    6: "es",   # Español
    7: "zh"    # 繁體中文
}

# ====================================================================================
# Configuration
# ====================================================================================

DEFAULT_CONFIG = {
    "title_size": 110,      # Font size for title text (fallback/default)
    "pad": 40,             # Padding around canvas
    "gap": 20,             # Gap between left and right images
    "bg_color": "#ffffff",  # Background color
    "auto_header": True,   # Auto-calculate header height
    "tries_min": 300,      # Minimum tries number
    "tries_max": 999,      # Maximum tries number
    "diffs_min": 10,       # Minimum differences number
    "diffs_max": 20        # Maximum differences number
}

# ====================================================================================
# Language-Specific Font Sizes
# ====================================================================================

LANGUAGE_FONT_SIZES = {
    1: 110,  # English - Standard Latin alphabet
    2: 90,  # Français - Slightly smaller for longer French text
    3: 90,   # 日本語 - CJK characters need smaller size for balance
    4: 90,   # 한국어 - CJK characters need smaller size for balance
    5: 90,  # Deutsch - German words tend to be longer
    6: 90,  # Español - Spanish text can be verbose
    7: 110    # 繁體中文 - CJK characters need smaller size for balance
}

# Color tag regex pattern
TAG_RE = re.compile(r"<c:(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})>(.*?)</c>")

# ====================================================================================
# Font Detection
# ====================================================================================

def get_system_font_path(language_id: int = 1) -> str:
    """
    Get font path based on language ID.

    Args:
        language_id: Language ID (1-7, default: 1=English)

    Returns:
        Path to appropriate font for the specified language
    """
    # Get font filename from config
    font_name = FONT_CONFIG.get(language_id, "ARIAL.TTF")

    # Check project assets folder first
    project_font = Path(__file__).parent.parent / "assets" / "fonts" / font_name
    if project_font.exists():
        return str(project_font)

    # Fallback to system fonts for common cases
    system = platform.system()

    if system == "Darwin":  # macOS
        # Try to find the font in system
        system_candidates = [
            f"/Library/Fonts/{font_name}",
            f"/System/Library/Fonts/{font_name}",
            "/System/Library/Fonts/Supplemental/Arial.ttf",  # Fallback for Latin
            "/Library/Fonts/Arial Unicode.ttf",  # Fallback with Unicode support
            "/System/Library/Fonts/PingFang.ttc"  # Fallback for CJK on macOS
        ]
    elif system == "Windows":
        system_candidates = [
            f"C:/Windows/Fonts/{font_name}",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/msgothic.ttc"  # Fallback for CJK on Windows
        ]
    else:  # Linux
        system_candidates = [
            f"/usr/share/fonts/truetype/{font_name}",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
        ]

    # Try system fonts
    for font_path in system_candidates:
        if Path(font_path).exists():
            return font_path

    # Final fallback: raise error with helpful message
    raise FileNotFoundError(
        f"Font '{font_name}' not found. Please place it in assets/fonts/ directory.\n"
        f"Expected path: {project_font}"
    )

# ====================================================================================
# Text Parsing and Rendering
# ====================================================================================

def parse_colored_spans(text: str, default_color: str = "#000000"):
    """
    Parse text with <c:color>text</c> tags into color spans.

    Args:
        text: Text with color tags
        default_color: Default color for untagged text

    Returns:
        List of (text, color) tuples
    """
    spans = []
    pos = 0

    for match in TAG_RE.finditer(text):
        # Add text before tag
        if match.start() > pos:
            spans.append((text[pos:match.start()], default_color))

        # Add tagged text
        spans.append((match.group(2), match.group(1)))
        pos = match.end()

    # Add remaining text
    if pos < len(text):
        spans.append((text[pos:], default_color))

    return spans


def get_line_height(font: ImageFont.FreeTypeFont) -> int:
    """
    Calculate line height for a font.

    Args:
        font: PIL Font object

    Returns:
        Line height in pixels
    """
    try:
        ascent, descent = font.getmetrics()
        return ascent + descent + 8
    except Exception:
        bbox = font.getbbox("Ag")
        return (bbox[3] - bbox[1]) + 8


def draw_multicolor_centered_text(
    draw: ImageDraw.Draw,
    canvas_width: int,
    y: int,
    spans,
    font: ImageFont.FreeTypeFont,
    line_height: int
) -> int:
    """
    Draw text with multiple colors, centered horizontally.

    Args:
        draw: PIL Draw object
        canvas_width: Canvas width for centering
        y: Y position to start drawing
        spans: List of (text, color) tuples
        font: Font to use
        line_height: Height to advance after drawing

    Returns:
        New Y position after drawing
    """
    # Calculate total width
    total_width = sum(draw.textlength(text, font=font) for text, _ in spans)

    # Start X position (centered)
    x = (canvas_width - total_width) // 2
    current_x = x

    # Draw each span
    for text, color in spans:
        draw.text((current_x, y), text, font=font, fill=color)
        current_x += int(draw.textlength(text, font=font))

    return y + line_height


def resize_images_same_height(left_img: Image.Image, right_img: Image.Image) -> Tuple[Image.Image, Image.Image]:
    """
    Resize two images to have the same height.

    Args:
        left_img: Left image
        right_img: Right image

    Returns:
        Tuple of resized (left, right) images
    """
    target_height = min(left_img.height, right_img.height)

    def scale_image(img):
        ratio = target_height / img.height
        new_width = int(img.width * ratio)
        return img.resize((new_width, target_height), Image.LANCZOS)

    return scale_image(left_img), scale_image(right_img)

# ====================================================================================
# Main Stitch Function
# ====================================================================================

def stitch_images(
    main_image_path: str,
    diff_image_path: str,
    output_path: str,
    language_id: int = 1,
    config: Optional[Dict] = None
) -> Dict:
    """
    Stitch main and diff images together with multilingual text overlay.

    Args:
        main_image_path: Path to main image
        diff_image_path: Path to diff image
        output_path: Path to save final stitched image
        language_id: Language ID (1-7, default: 1=English)
        config: Optional config dict (overrides defaults)

    Returns:
        Dict with success status and output path or error details
    """
    try:
        # Merge config with defaults
        cfg = {**DEFAULT_CONFIG, **(config or {})}

        # Validate language_id
        if language_id not in LANGUAGE_TEMPLATES:
            raise ValueError(f"Invalid language_id: {language_id}. Must be 1-7.")

        # Get language template
        lang = LANGUAGE_TEMPLATES[language_id]

        # Generate random numbers
        tries = random.randint(cfg["tries_min"], cfg["tries_max"])
        diffs = random.randint(cfg["diffs_min"], cfg["diffs_max"])

        # Format text lines
        line1 = lang["line1"].format(tries=tries, diffs=diffs)
        line2 = lang["line2"].format(tries=tries, diffs=diffs)

        # Load and resize images
        left_img = Image.open(main_image_path).convert("RGB")
        right_img = Image.open(diff_image_path).convert("RGB")
        left_img, right_img = resize_images_same_height(left_img, right_img)

        # Load font (based on language_id)
        # Get language-specific font size, fallback to default if not found
        font_size = LANGUAGE_FONT_SIZES.get(language_id, cfg["title_size"])
        font_path = get_system_font_path(language_id)
        font = ImageFont.truetype(font_path, font_size)

        # Calculate dimensions
        line_height = get_line_height(font)
        header_height = int(line_height * 2 + cfg["pad"]) if cfg["auto_header"] else 260

        canvas_width = cfg["pad"] + left_img.width + cfg["gap"] + right_img.width + cfg["pad"]
        canvas_height = header_height + cfg["pad"] + max(left_img.height, right_img.height) + cfg["pad"]

        # Create canvas
        canvas = Image.new("RGB", (canvas_width, canvas_height), cfg["bg_color"])
        draw = ImageDraw.Draw(canvas)

        # Draw title text (centered)
        spans1 = parse_colored_spans(line1)
        spans2 = parse_colored_spans(line2)

        y_start = cfg["pad"] + (header_height - 2 * line_height) // 2
        y = draw_multicolor_centered_text(draw, canvas_width, y_start, spans1, font, line_height)
        draw_multicolor_centered_text(draw, canvas_width, y, spans2, font, line_height)

        # Paste images
        x_left = cfg["pad"]
        x_right = x_left + left_img.width + cfg["gap"]
        y_images = header_height

        canvas.paste(left_img, (x_left, y_images))
        canvas.paste(right_img, (x_right, y_images))

        # Save output
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(output_path)

        return {
            "success": True,
            "output_path": str(output_path),
            "language": lang["name"],
            "tries": tries,
            "diffs": diffs,
            "dimensions": {
                "width": canvas_width,
                "height": canvas_height
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "stage": "stitching"
        }


# ====================================================================================
# Convenience Function
# ====================================================================================

def create_final_image(
    image_id: str,
    images_dir: str = "images",
    language_id: int = 1
) -> Dict:
    """
    Create final stitched image from image_id.

    Args:
        image_id: Image ID (e.g., "betty_turnback_living_halloween_retro50s_0001")
        images_dir: Directory containing main and diff images
        language_id: Language ID (1-7)

    Returns:
        Dict with success status and paths
    """
    images_path = Path(images_dir)

    main_path = images_path / f"{image_id}_main.png"
    diff_path = images_path / f"{image_id}_diff.png"
    final_path = images_path / f"{image_id}_final.png"

    # Validate input files exist
    if not main_path.exists():
        return {"success": False, "error": f"Main image not found: {main_path}"}
    if not diff_path.exists():
        return {"success": False, "error": f"Diff image not found: {diff_path}"}

    # Stitch images
    return stitch_images(
        str(main_path),
        str(diff_path),
        str(final_path),
        language_id=language_id
    )


# ====================================================================================
# Testing
# ====================================================================================

if __name__ == "__main__":
    # Test with example
    result = create_final_image(
        image_id="betty_sitting_living_christmas_retro50s_0001",
        language_id=1  # English
    )

    if result["success"]:
        print(f"✅ Final image created: {result['output_path']}")
        print(f"   Language: {result['language']}")
        print(f"   Numbers: {result['tries']} tries, {result['diffs']} differences")
    else:
        print(f"❌ Error: {result['error']}")

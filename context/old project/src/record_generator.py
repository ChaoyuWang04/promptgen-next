"""Generation record module - creates minimal records for comparison image generation."""
from typing import Dict, Any, List, Optional
from datetime import datetime
from src.utils import save_generation_record, load_generation_record


def generate_record(
    image_id: str,
    prompt_cn: str,
    character: Dict[str, Any],
    theme: Dict[str, Any],
    selected_micro_props: List[str],
    # Phase 2: New dynamic parameter
    library_ids: Optional[Dict[str, str]] = None,
    # Legacy parameters for backward compatibility
    character_id: Optional[str] = None,
    pose_id: Optional[str] = None,
    scene_id: Optional[str] = None,
    theme_id: Optional[str] = None,
    style_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate minimal generation record for comparison image generation.

    Phase 2: Now supports both new (library_ids dict) and legacy (individual IDs) parameter formats.

    Args:
        image_id: Generated image ID
        prompt_cn: Complete Chinese prompt for main image
        character: Character data dict (for outfit_minor extraction)
        theme: Theme data dict (for decorative_props extraction)
        selected_micro_props: List of selected micro props from main image
        library_ids: NEW - Dictionary of library IDs {"character": "char_betty_v1", ...}
        character_id: LEGACY - Character library ID (deprecated, use library_ids)
        pose_id: LEGACY - Pose library ID (deprecated, use library_ids)
        scene_id: LEGACY - Scene library ID (deprecated, use library_ids)
        theme_id: LEGACY - Theme library ID (deprecated, use library_ids)
        style_id: LEGACY - Style library ID (deprecated, use library_ids)

    Returns:
        Generation record dictionary with structure:
        {
            "image_id": str,
            "library_ids": {"character": str, "pose": str, ...},  # NEW format
            "character_id": str,  # LEGACY format (backward compatible)
            "pose_id": str,
            ...
        }

    Raises:
        ValueError: If neither library_ids nor all legacy parameters are provided
    """
    from config.library_config import get_required_libraries

    # Phase 2: Determine which parameter format was used
    if library_ids:
        # New format: extract individual IDs from library_ids dict
        required_libs = get_required_libraries()
        extracted_ids = {}
        for lib_name in required_libs:
            key = f'{lib_name}_id'
            if lib_name not in library_ids:
                raise ValueError(f"Missing required library '{lib_name}' in library_ids")
            extracted_ids[key] = library_ids[lib_name]
    elif all([character_id, pose_id, scene_id, theme_id, style_id]):
        # Legacy format: use provided individual parameters
        library_ids = {
            'character': character_id,
            'pose': pose_id,
            'scene': scene_id,
            'theme': theme_id,
            'style': style_id
        }
        extracted_ids = {
            'character_id': character_id,
            'pose_id': pose_id,
            'scene_id': scene_id,
            'theme_id': theme_id,
            'style_id': style_id
        }
    else:
        raise ValueError(
            "Must provide either 'library_ids' dict or all five legacy parameters "
            "(character_id, pose_id, scene_id, theme_id, style_id)"
        )

    # Extract current outfit_minor state (colors only)
    outfit_minor_state = [
        {
            "element": item["element"],
            "current_color": item["original_color"]
        }
        for item in character.get("outfit_minor", [])
    ]

    # Build used_decorations
    # - from_theme: selected micro_props from theme library
    # - from_scene: empty for main image (will be populated in comparison image)
    used_decorations = {
        "from_theme": selected_micro_props,
        "from_scene": []
    }

    # Build record with BOTH new and legacy formats
    record = {
        "image_id": image_id,
        # NEW: Phase 2 dynamic format
        "library_ids": library_ids,
        # LEGACY: Backward compatible individual fields
        **extracted_ids,
        "prompt_cn": prompt_cn,
        "outfit_minor_state": outfit_minor_state,
        "used_decorations": used_decorations,
        # Status tracking fields
        "prompt_generated": False,
        "image_generated": False,
        "prompt_main_path": f"prompts/{image_id}_main.txt",
        "prompt_diff_path": f"prompts/{image_id}_diff.txt",
        "image_main_path": None,
        "image_diff_path": None,
        "final_generated": False,
        "final_image_path": None,
        "generated_at": datetime.now().isoformat(),
        "image_generated_at": None
    }

    return record


def save_record(record: Dict[str, Any]) -> str:
    """
    Save generation record to file.

    Args:
        record: Generation record dictionary

    Returns:
        Path to saved record file as string
    """
    image_id = record["image_id"]
    file_path = save_generation_record(record, image_id)
    return str(file_path)


def create_and_save_record(
    image_id: str,
    prompt_cn: str,
    character: Dict[str, Any],
    theme: Dict[str, Any],
    selected_micro_props: List[str],
    # Phase 2: New dynamic parameter
    library_ids: Optional[Dict[str, str]] = None,
    # Legacy parameters for backward compatibility
    character_id: Optional[str] = None,
    pose_id: Optional[str] = None,
    scene_id: Optional[str] = None,
    theme_id: Optional[str] = None,
    style_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to generate and save record in one step.

    Phase 2: Now supports both new (library_ids dict) and legacy (individual IDs) parameter formats.

    Args:
        image_id: Generated image ID
        prompt_cn: Complete Chinese prompt for main image
        character: Character data dict
        theme: Theme data dict
        selected_micro_props: List of selected micro props
        library_ids: NEW - Dictionary of library IDs {"character": "char_betty_v1", ...}
        character_id: LEGACY - Character library ID (deprecated, use library_ids)
        pose_id: LEGACY - Pose library ID (deprecated, use library_ids)
        scene_id: LEGACY - Scene library ID (deprecated, use library_ids)
        theme_id: LEGACY - Theme library ID (deprecated, use library_ids)
        style_id: LEGACY - Style library ID (deprecated, use library_ids)

    Returns:
        Generation record dictionary with added "record_path" field

    Raises:
        ValueError: If neither library_ids nor all legacy parameters are provided
    """
    record = generate_record(
        image_id=image_id,
        prompt_cn=prompt_cn,
        character=character,
        theme=theme,
        selected_micro_props=selected_micro_props,
        library_ids=library_ids,
        character_id=character_id,
        pose_id=pose_id,
        scene_id=scene_id,
        theme_id=theme_id,
        style_id=style_id
    )

    record_path = save_record(record)

    # Add record_path to returned dict for convenience
    record_with_path = record.copy()
    record_with_path["record_path"] = record_path

    return record_with_path


def update_prompt_status(image_id: str, prompt_main_path: str = None,
                        prompt_diff_path: str = None) -> Dict[str, Any]:
    """
    Update prompt generation status in the record.

    Args:
        image_id: Image ID
        prompt_main_path: Path to main prompt file (optional, uses default if None)
        prompt_diff_path: Path to diff prompt file (optional, uses default if None)

    Returns:
        Updated record dictionary
    """
    record = load_generation_record(image_id)

    record["prompt_generated"] = True
    if prompt_main_path:
        record["prompt_main_path"] = prompt_main_path
    if prompt_diff_path:
        record["prompt_diff_path"] = prompt_diff_path

    save_record(record)
    return record


def update_image_status(image_id: str, image_main_path: str = None,
                       image_diff_path: str = None) -> Dict[str, Any]:
    """
    Update image generation status in the record.

    Args:
        image_id: Image ID
        image_main_path: Path to generated main image
        image_diff_path: Path to generated diff image

    Returns:
        Updated record dictionary
    """
    record = load_generation_record(image_id)

    record["image_generated"] = True
    record["image_generated_at"] = datetime.now().isoformat()

    if image_main_path:
        record["image_main_path"] = image_main_path
    if image_diff_path:
        record["image_diff_path"] = image_diff_path

    save_record(record)
    return record


def get_records_by_status(prompt_generated: bool = None,
                         image_generated: bool = None) -> List[Dict[str, Any]]:
    """
    Filter records by status.

    Args:
        prompt_generated: Filter by prompt status (None = no filter)
        image_generated: Filter by image status (None = no filter)

    Returns:
        List of matching records
    """
    from pathlib import Path
    records_dir = Path('records')
    matching_records = []

    for record_file in records_dir.glob('*.json'):
        # Skip status tracking files
        if record_file.name in ['combination_status.json', 'sequence_tracker.json']:
            continue

        try:
            with open(record_file, 'r', encoding='utf-8') as f:
                import json
                record = json.load(f)

            # Check filters
            if prompt_generated is not None and record.get("prompt_generated") != prompt_generated:
                continue
            if image_generated is not None and record.get("image_generated") != image_generated:
                continue

            matching_records.append(record)
        except:
            continue

    return matching_records


# ====================================================================================
# Variant Management Functions (Multi-version support)
# ====================================================================================

def get_next_version(image_id: str) -> int:
    """
    Get the next version number for an image_id based on actually existing variants.

    IMPORTANT: This function now checks for file existence on disk, not just JSON records.
    If all image files have been deleted, this will return 1 (reset to start).

    Args:
        image_id: Image ID

    Returns:
        Next version number (1 if no valid variants exist, otherwise max_version + 1)
    """
    try:
        # Get only variants with actually existing files
        valid_variants = get_variants_with_filesystem_scan(image_id)

        if not valid_variants:
            return 1

        max_version = max(v["version"] for v in valid_variants)
        return max_version + 1
    except:
        return 1


def get_variants(image_id: str) -> List[Dict[str, Any]]:
    """
    Get all variants for an image_id.

    Args:
        image_id: Image ID

    Returns:
        List of variant dictionaries
    """
    try:
        record = load_generation_record(image_id)
        return record.get("variants", [])
    except:
        return []


def add_variant(
    image_id: str,
    version: int,
    paths_dict: Dict[str, str],
    template_id: str = None,
    prompt_cn: str = None
) -> Dict[str, Any]:
    """
    Add a new variant to the record.

    Args:
        image_id: Image ID
        version: Version number
        paths_dict: Dictionary with keys: "main", "diff", "final" (final is optional dict with lang codes)
        template_id: Template ID used for this variant (e.g., 'template_default_v1')
        prompt_cn: Rendered prompt for this variant (cache of the template rendering)

    Returns:
        Updated record dictionary

    Note:
        Each variant can now independently store template_id and prompt_cn,
        allowing A/B testing of different templates for the same combination.
    """
    record = load_generation_record(image_id)

    # Initialize variants array if not exists
    if "variants" not in record:
        record["variants"] = []

    # Check if version already exists
    existing_variant = None
    for v in record["variants"]:
        if v["version"] == version:
            existing_variant = v
            break

    # Create or update variant
    variant = existing_variant or {
        "version": version,
        "template_id": template_id or "template_default_v1",  # Default template
        "prompt_cn": prompt_cn or "",
        "image_main_path": None,
        "image_diff_path": None,
        "final_images": {},
        "generated_at": datetime.now().isoformat()
    }

    # Update template_id and prompt_cn if provided
    if template_id is not None:
        variant["template_id"] = template_id
    if prompt_cn is not None:
        variant["prompt_cn"] = prompt_cn

    # Update paths
    if "main" in paths_dict:
        variant["image_main_path"] = paths_dict["main"]
    if "diff" in paths_dict:
        variant["image_diff_path"] = paths_dict["diff"]
    if "final" in paths_dict:
        # Final can be either a dict of {lang: path} or a single path string
        if isinstance(paths_dict["final"], dict):
            variant["final_images"].update(paths_dict["final"])
        else:
            # Default to "en" if single path
            variant["final_images"]["en"] = paths_dict["final"]

    # Add or update variant in list
    if not existing_variant:
        record["variants"].append(variant)

    # Update legacy fields for backward compatibility (use latest version)
    latest_variant = max(record["variants"], key=lambda v: v["version"])
    record["image_main_path"] = latest_variant.get("image_main_path")
    record["image_diff_path"] = latest_variant.get("image_diff_path")
    if latest_variant.get("final_images"):
        # Use first final image as legacy field
        record["final_image_path"] = list(latest_variant["final_images"].values())[0]

    save_record(record)
    return record


def update_variant_final(image_id: str, version: int, language_code: str, path: str) -> Dict[str, Any]:
    """
    Update the final image path for a specific variant and language.

    Args:
        image_id: Image ID
        version: Version number
        language_code: Language code (e.g., "en", "ja", "zh")
        path: Path to final image

    Returns:
        Updated record dictionary
    """
    record = load_generation_record(image_id)

    # Find variant
    variant = None
    for v in record.get("variants", []):
        if v["version"] == version:
            variant = v
            break

    if not variant:
        raise ValueError(f"Variant version {version} not found for image_id {image_id}")

    # Update final image path
    if "final_images" not in variant:
        variant["final_images"] = {}

    variant["final_images"][language_code] = path

    # Update legacy field if this is the latest version
    if version == max(v["version"] for v in record["variants"]):
        record["final_image_path"] = path

    save_record(record)
    return record


def add_language_to_variant(image_id: str, version: int, language_code: str, file_path: str) -> bool:
    """
    Add a new language version to an existing variant's final_images dictionary.

    Args:
        image_id: Image ID
        version: Variant version number
        language_code: Language code (e.g., 'en', 'ja', 'zh')
        file_path: Path to the final image file

    Returns:
        True if successful, False otherwise
    """
    try:
        record = load_generation_record(image_id)
        if not record:
            print(f"Error: Record not found for {image_id}")
            return False

        # Find the variant
        variants = record.get('variants', [])
        variant_found = False

        for variant in variants:
            if variant.get('version') == version:
                # Add or update the language in final_images
                if 'final_images' not in variant:
                    variant['final_images'] = {}

                variant['final_images'][language_code] = file_path
                variant_found = True
                break

        if not variant_found:
            print(f"Error: Variant v{version} not found in record {image_id}")
            return False

        # Save updated record - FIXED: correct parameter order
        from src.utils import save_generation_record
        save_generation_record(record, image_id)
        print(f"✓ Added language '{language_code}' to variant v{version} of {image_id}")
        return True

    except Exception as e:
        print(f"Error adding language to variant: {e}")
        return False


def scan_variant_final_images(image_id: str, version: int) -> Dict[str, str]:
    """
    Scan filesystem for all final images of a specific variant version.

    This function scans the images/{image_id}/ directory for files matching
    the pattern v{version}_final_*.png and returns a dictionary mapping
    language codes to file paths.

    Args:
        image_id: Image ID
        version: Variant version number

    Returns:
        Dictionary mapping language codes to file paths
        Example: {"en": "images/.../v1_final_en.png", "ja": "images/.../v1_final_ja.png"}
    """
    from pathlib import Path

    final_images = {}
    image_dir = Path('images') / image_id

    if not image_dir.exists():
        return final_images

    # Scan for final images matching this version
    pattern = f"v{version}_final_*.png"
    for file_path in image_dir.glob(pattern):
        # Extract language code from filename
        # Format: v{version}_final_{lang}.png
        filename = file_path.stem  # e.g., "v1_final_en"
        parts = filename.split('_')

        if len(parts) >= 3 and parts[1] == 'final':
            language_code = parts[2]  # e.g., "en", "ja", "zh"
            final_images[language_code] = str(file_path)

    return final_images


def get_variants_with_filesystem_scan(image_id: str) -> List[Dict[str, Any]]:
    """
    Get all variants for an image_id, with final_images supplemented from filesystem.

    This function loads variants from the record JSON, then scans the filesystem
    to ensure all actually-existing final images are included in the final_images
    dictionary, even if they're not recorded in the JSON.

    IMPORTANT: Only returns variants where main and diff images actually exist on disk.
    This ensures the frontend doesn't try to display non-existent images.

    Args:
        image_id: Image ID

    Returns:
        List of variant dictionaries with complete final_images data
        (filtered to only include variants with existing main/diff files)
    """
    from pathlib import Path

    try:
        record = load_generation_record(image_id)
        variants = record.get("variants", [])

        valid_variants = []

        # Supplement each variant with filesystem scan and validate file existence
        for variant in variants:
            version = variant.get("version")
            if version is None:
                continue

            # Check if main and diff images actually exist
            image_main_path = variant.get("image_main_path", "")
            image_diff_path = variant.get("image_diff_path", "")

            main_exists = Path(image_main_path).exists() if image_main_path else False
            diff_exists = Path(image_diff_path).exists() if image_diff_path else False

            # Only include variants where both main and diff exist
            if not (main_exists and diff_exists):
                continue

            # Scan filesystem for actual final images
            scanned_finals = scan_variant_final_images(image_id, version)

            # Only include variants that have at least one final image
            # (If user deleted all final images, hide this variant)
            if not scanned_finals or len(scanned_finals) == 0:
                continue

            # Get currently recorded final_images
            recorded_finals = variant.get("final_images", {})

            # Merge: filesystem data takes precedence (it's the source of truth)
            merged_finals = {**recorded_finals, **scanned_finals}
            variant["final_images"] = merged_finals

            valid_variants.append(variant)

        return valid_variants
    except FileNotFoundError:
        return []
    except Exception as e:
        print(f"Error loading variants with filesystem scan: {e}")
        return []


if __name__ == "__main__":
    # Test record generation
    print("Testing record generator...")

    from src.data_loader import load_character, load_theme

    # Load test data
    character = load_character("char_betty_v1")
    theme = load_theme("theme_halloween_v1")

    # Simulate prompt generation result
    test_image_id = "betty_turnback_living_halloween_retro50s_0004"
    test_selected_props = ["蝙蝠剪纸", "橙色缎带", "小南瓜"]

    print("\n=== Test 1: New format (library_ids dict) ===")
    # Generate record using new format
    record_new = generate_record(
        image_id=test_image_id,
        prompt_cn="Test prompt content...",
        character=character,
        theme=theme,
        selected_micro_props=test_selected_props,
        library_ids={
            'character': 'char_betty_v1',
            'pose': 'pose_turn_back_smile_v1',
            'scene': 'scene_living_sofa_v1',
            'theme': 'theme_halloween_v1',
            'style': 'style_retro1950_flat_v1'
        }
    )

    print("\nGenerated Record (New Format):")
    print("=" * 80)
    import json
    print(json.dumps(record_new, indent=2, ensure_ascii=False))
    print("=" * 80)

    print("\n=== Test 2: Legacy format (individual parameters) ===")
    # Generate record using legacy format
    record_legacy = generate_record(
        image_id=test_image_id,
        prompt_cn="Test prompt content...",
        character=character,
        theme=theme,
        selected_micro_props=test_selected_props,
        character_id="char_betty_v1",
        pose_id="pose_turn_back_smile_v1",
        scene_id="scene_living_sofa_v1",
        theme_id="theme_halloween_v1",
        style_id="style_retro1950_flat_v1"
    )

    print("\nGenerated Record (Legacy Format):")
    print("=" * 80)
    print(json.dumps(record_legacy, indent=2, ensure_ascii=False))
    print("=" * 80)

    # Verify both formats produce equivalent results
    assert record_new['library_ids'] == record_legacy['library_ids'], "library_ids mismatch"
    assert record_new['character_id'] == record_legacy['character_id'], "character_id mismatch"
    print("\n✓ Both formats produce equivalent records")

    # Test saving
    print(f"\n=== Test 3: Saving record (new format) ===")
    record_with_path = create_and_save_record(
        image_id=test_image_id,
        prompt_cn="Test prompt content...",
        character=character,
        theme=theme,
        selected_micro_props=test_selected_props,
        library_ids={
            'character': 'char_betty_v1',
            'pose': 'pose_turn_back_smile_v1',
            'scene': 'scene_living_sofa_v1',
            'theme': 'theme_halloween_v1',
            'style': 'style_retro1950_flat_v1'
        }
    )

    print(f"✓ Record saved to: {record_with_path['record_path']}")

    # Verify record can be loaded back
    from src.utils import load_generation_record
    loaded_record = load_generation_record(test_image_id)
    print(f"✓ Record successfully loaded back from file")

    # Verify loaded record has both new and legacy formats
    assert 'library_ids' in loaded_record, "Missing 'library_ids' in loaded record"
    assert 'character_id' in loaded_record, "Missing 'character_id' in loaded record"
    print(f"✓ Loaded record contains both new (library_ids) and legacy (character_id) formats")

    print("\n✓ All record generator tests passed!")

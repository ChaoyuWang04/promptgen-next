"""Utility functions for the promptgen system."""
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from config.settings import RECORDS_DIR


# ============================================================================
# Phase 2: Dynamic Library System - New ID Generation Functions
# ============================================================================

def get_library_abbr(library_name: str, library_data: Dict) -> str:
    """
    Extract abbreviation from library data dynamically.
    Unified function replacing individual extract_*_abbr() functions.

    Args:
        library_name: Name of the library (e.g., 'character', 'pose', 'scene')
        library_data: Library data dictionary with fields

    Returns:
        Abbreviation string for use in image_id

    Examples:
        >>> char_data = {'name': 'betty', 'id': 'char_betty_v1'}
        >>> get_library_abbr('character', char_data)
        'betty'

        >>> pose_data = {'id': 'pose_turn_back_smile_v1'}
        >>> get_library_abbr('pose', pose_data)
        'turnback'
    """
    if library_name == 'character':
        # Characters use the 'name' field directly
        return library_data.get("name", "unknown")

    elif library_name == 'pose':
        # Poses: extract from ID pattern "pose_turn_back_smile_v1" -> "turnback"
        pose_id = library_data.get("id", "")
        without_prefix = pose_id.replace("pose_", "")
        without_version = re.sub(r'_v\d+$', '', without_prefix)

        # Take first 1-2 words
        words = without_version.split('_')
        if len(words) >= 2 and words[0] in ['turn']:
            # Special case: "turn_back" -> "turnback"
            return ''.join(words[:2])
        return words[0] if words else "unknown"

    elif library_name == 'scene':
        # Scenes: extract from ID pattern "scene_living_sofa_v1" -> "living"
        scene_id = library_data.get("id", "")
        without_prefix = scene_id.replace("scene_", "")
        without_version = re.sub(r'_v\d+$', '', without_prefix)
        words = without_version.split('_')
        return words[0] if words else "unknown"

    elif library_name == 'theme':
        # Themes: extract from ID pattern "theme_halloween_v1" -> "halloween"
        theme_id = library_data.get("id", "")

        # Manual mapping for special cases
        THEME_ABBR_MAP = {
            "theme_christmas_v1": "christmas",
        }

        if theme_id in THEME_ABBR_MAP:
            return THEME_ABBR_MAP[theme_id]

        without_prefix = theme_id.replace("theme_", "")
        without_version = re.sub(r'_v\d+$', '', without_prefix)
        words = without_version.split('_')
        return words[0] if words else "unknown"

    elif library_name == 'style':
        # Styles: handle retro patterns "retro_1950s_flat" -> "retro50s"
        style_id = library_data.get("style_id", "")
        if "1950" in style_id:
            return "retro50s"
        elif "1960" in style_id:
            return "retro60s"
        else:
            words = style_id.split('_')
            return words[0] if words else "unknown"

    else:
        # Generic fallback: try to extract from 'id' field
        lib_id = library_data.get("id", "")
        without_prefix = lib_id.replace(f"{library_name}_", "")
        without_version = re.sub(r'_v\d+$', '', without_prefix)
        words = without_version.split('_')
        return words[0] if words else "unknown"


def generate_dynamic_image_id(library_selections: Dict[str, Any], sequence: Optional[int] = None) -> str:
    """
    Generate unique image ID based on dynamic library selections.

    This is the Phase 2 core function that supports any number of libraries.

    Format: {abbr1}_{abbr2}_{abbr3}_{...}_{sequence}

    Args:
        library_selections: Dictionary mapping library names to library data dicts
            Example: {
                'character': {'name': 'betty', 'id': 'char_betty_v1', ...},
                'pose': {'id': 'pose_turn_back_smile_v1', ...},
                'scene': {'id': 'scene_living_sofa_v1', ...},
                'theme': {'id': 'theme_halloween_v1', ...},
                'style': {'style_id': 'retro_1950s_flat', ...}
            }
        sequence: Optional sequence number for testing. If None, auto-generates.

    Returns:
        Image ID string (e.g., "betty_turnback_living_halloween_retro50s_0001")

    Examples:
        >>> library_selections = {
        ...     'character': {'name': 'betty'},
        ...     'pose': {'id': 'pose_turn_back_smile_v1'},
        ...     'scene': {'id': 'scene_living_sofa_v1'},
        ...     'theme': {'id': 'theme_halloween_v1'},
        ...     'style': {'style_id': 'retro_1950s_flat'}
        ... }
        >>> generate_dynamic_image_id(library_selections)
        'betty_turnback_living_halloween_retro50s_0001'
    """
    from config.library_config import get_required_libraries

    # Get required libraries in correct order
    required_libs = get_required_libraries()

    # Extract abbreviations in order
    abbrs = []
    for lib_name in required_libs:
        if lib_name not in library_selections:
            raise ValueError(f"Missing required library '{lib_name}' in library_selections")

        lib_data = library_selections[lib_name]
        abbr = get_library_abbr(lib_name, lib_data)
        abbrs.append(abbr)

    # Get sequence number (auto-generate if not provided)
    if sequence is None:
        sequence = get_next_sequence_dynamic(library_selections)

    seq_str = f"{sequence:04d}"

    # Build image_id: {abbr1}_{abbr2}_{...}_{sequence}
    return '_'.join(abbrs) + f"_{seq_str}"


def parse_dynamic_image_id(image_id: str) -> Dict[str, str]:
    """
    Parse image ID into library abbreviations dictionary.

    WARNING: This function can only extract abbreviations, not full library IDs.
    Abbreviations may not be unique (e.g., multiple poses could have "sitting").
    Use this for display/debugging only, NOT for business logic.

    For business logic, always get library IDs from the generation record.

    Args:
        image_id: Image ID string (e.g., "betty_turnback_living_halloween_retro50s_0001")

    Returns:
        Dictionary mapping library names to abbreviations
        Example: {
            'character': 'betty',
            'pose': 'turnback',
            'scene': 'living',
            'theme': 'halloween',
            'style': 'retro50s',
            'sequence': '0001'
        }

    Raises:
        ValueError: If image_id format is invalid

    Examples:
        >>> parse_dynamic_image_id("betty_turnback_living_halloween_retro50s_0001")
        {'character': 'betty', 'pose': 'turnback', 'scene': 'living',
         'theme': 'halloween', 'style': 'retro50s', 'sequence': '0001'}
    """
    from config.library_config import get_required_libraries

    parts = image_id.split('_')
    required_libs = get_required_libraries()

    # Validate format: must have {num_libraries} + 1 (sequence) parts
    expected_parts = len(required_libs) + 1
    if len(parts) < expected_parts:
        raise ValueError(
            f"Invalid image_id format: expected {expected_parts} parts, got {len(parts)}. "
            f"Image ID: {image_id}"
        )

    # Parse abbreviations
    result = {}
    for i, lib_name in enumerate(required_libs):
        result[lib_name] = parts[i]

    # Parse sequence (last part)
    result['sequence'] = parts[-1]

    return result


def get_next_sequence_dynamic(library_selections: Dict[str, Any]) -> int:
    """
    Get next sequence number for given dynamic library selections.

    Generates a combo_key from library selections and returns the next sequence.

    Args:
        library_selections: Dictionary mapping library names to library data dicts

    Returns:
        Next sequence number (1-9999)

    Examples:
        >>> library_selections = {
        ...     'character': {'name': 'betty'},
        ...     'pose': {'id': 'pose_turn_back_smile_v1'},
        ...     'scene': {'id': 'scene_living_sofa_v1'},
        ...     'theme': {'id': 'theme_halloween_v1'},
        ...     'style': {'style_id': 'retro_1950s_flat'}
        ... }
        >>> get_next_sequence_dynamic(library_selections)
        1
    """
    from config.library_config import get_required_libraries

    # Get required libraries in correct order
    required_libs = get_required_libraries()

    # Extract abbreviations in order to form combo_key
    abbrs = []
    for lib_name in required_libs:
        if lib_name not in library_selections:
            raise ValueError(f"Missing required library '{lib_name}' in library_selections")

        lib_data = library_selections[lib_name]
        abbr = get_library_abbr(lib_name, lib_data)
        abbrs.append(abbr)

    # Generate combination key
    combo_key = '_'.join(abbrs)

    # Load existing sequences
    sequence_file = RECORDS_DIR / "sequence_tracker.json"
    if sequence_file.exists():
        with open(sequence_file, 'r', encoding='utf-8') as f:
            sequence_tracker = json.load(f)
    else:
        sequence_tracker = {}

    # Get current sequence and increment
    current_seq = sequence_tracker.get(combo_key, 0)
    next_seq = current_seq + 1

    # Update tracker
    sequence_tracker[combo_key] = next_seq

    # Save updated tracker
    sequence_file.parent.mkdir(parents=True, exist_ok=True)
    with open(sequence_file, 'w', encoding='utf-8') as f:
        json.dump(sequence_tracker, f, indent=2, ensure_ascii=False)

    return next_seq


# ============================================================================
# Legacy Functions - Kept for Backward Compatibility
# ============================================================================

def generate_image_id(character=None, pose=None, scene=None, theme=None, style=None,
                     library_selections: Optional[Dict[str, Any]] = None) -> str:
    """
    Generate unique image ID based on five library elements.

    LEGACY COMPATIBILITY WRAPPER - Prefer using generate_dynamic_image_id() directly.

    Supports both old and new calling styles:
    - Old style: pass character, pose, scene, theme, style as separate arguments
    - New style: pass library_selections dict

    Format: {character}_{pose}_{scene}_{theme}_{style}_{sequence}

    Args:
        character: (Legacy) Character data dict
        pose: (Legacy) Pose data dict
        scene: (Legacy) Scene data dict
        theme: (Legacy) Theme data dict
        style: (Legacy) Style data dict
        library_selections: (New) Dictionary mapping library names to data dicts

    Returns:
        Image ID string (e.g., "betty_turnback_living_halloween_retro50s_0001")

    Examples:
        # Old style (still supported)
        >>> image_id = generate_image_id(character_data, pose_data, scene_data, theme_data, style_data)

        # New style (recommended)
        >>> image_id = generate_image_id(library_selections={'character': char_data, ...})
    """
    if library_selections:
        # New style: use dynamic function directly
        return generate_dynamic_image_id(library_selections)
    else:
        # Old style: convert to library_selections format
        if not all([character, pose, scene, theme, style]):
            raise ValueError("Must provide either library_selections or all five legacy parameters")

        library_selections = {
            'character': character,
            'pose': pose,
            'scene': scene,
            'theme': theme,
            'style': style
        }
        return generate_dynamic_image_id(library_selections)


def extract_pose_abbr(pose_id: str) -> str:
    """
    Extract pose abbreviation from pose ID.

    Examples:
        "pose_turn_back_smile_v1" -> "turnback"
        "pose_sitting_hold_v1" -> "sitting"
    """
    # Remove "pose_" prefix and "_v{n}" suffix
    without_prefix = pose_id.replace("pose_", "")
    without_version = re.sub(r'_v\d+$', '', without_prefix)

    # Take first 1-2 words
    words = without_version.split('_')
    if len(words) >= 2 and words[0] in ['turn']:
        # Special case: "turn_back" -> "turnback"
        return ''.join(words[:2])
    return words[0]


def extract_scene_abbr(scene_id: str) -> str:
    """
    Extract scene abbreviation from scene ID.

    Examples:
        "scene_living_sofa_v1" -> "living"
        "scene_kitchen_counter_v1" -> "kitchen"
    """
    without_prefix = scene_id.replace("scene_", "")
    without_version = re.sub(r'_v\d+$', '', without_prefix)
    return without_version.split('_')[0]


def extract_theme_abbr(theme_id: str) -> str:
    """
    Extract theme abbreviation from theme ID.

    Examples:
        "theme_halloween_v1" -> "halloween"
        "theme_christmas_v1" -> "christmas"
    """
    # Manual mapping for special cases
    THEME_ABBR_MAP = {
        "theme_christmas_v1": "christmas",
    }

    if theme_id in THEME_ABBR_MAP:
        return THEME_ABBR_MAP[theme_id]

    without_prefix = theme_id.replace("theme_", "")
    without_version = re.sub(r'_v\d+$', '', without_prefix)
    return without_version.split('_')[0]


def extract_style_abbr(style_id: str) -> str:
    """
    Extract style abbreviation from style ID.

    Examples:
        "retro_1950s_flat" -> "retro50s"
    """
    if "1950" in style_id:
        return "retro50s"
    elif "1960" in style_id:
        return "retro60s"
    else:
        return style_id.split('_')[0]


def get_next_sequence(char_abbr: str, pose_abbr: str, scene_abbr: str,
                      theme_abbr: str, style_abbr: str) -> int:
    """
    Get next sequence number for given combination.

    DEPRECATED - Use get_next_sequence_dynamic() instead.
    This legacy function is kept for backward compatibility only.

    Args:
        char_abbr, pose_abbr, scene_abbr, theme_abbr, style_abbr: Abbreviations

    Returns:
        Next sequence number (1-9999)

    Note:
        This function still works but internally uses the new dynamic system.
        It assumes the fixed 5-library structure (character, pose, scene, theme, style).
    """
    # Convert abbreviations to library_selections format for dynamic function
    # We need to reconstruct minimal library data from abbreviations
    # This is a limitation of the legacy API

    library_selections = {
        'character': {'name': char_abbr},
        'pose': {'id': f'pose_{char_abbr}_v1'},  # Approximation
        'scene': {'id': f'scene_{char_abbr}_v1'},
        'theme': {'id': f'theme_{char_abbr}_v1'},
        'style': {'style_id': char_abbr}
    }

    # Actually, the combo_key is just the abbreviations joined by underscores
    # So we can directly use the sequence_tracker logic
    sequence_file = RECORDS_DIR / "sequence_tracker.json"

    # Load existing sequences
    if sequence_file.exists():
        with open(sequence_file, 'r', encoding='utf-8') as f:
            sequence_tracker = json.load(f)
    else:
        sequence_tracker = {}

    # Generate combination key (same format as before)
    combo_key = f"{char_abbr}_{pose_abbr}_{scene_abbr}_{theme_abbr}_{style_abbr}"

    # Get current sequence and increment
    current_seq = sequence_tracker.get(combo_key, 0)
    next_seq = current_seq + 1

    # Update tracker
    sequence_tracker[combo_key] = next_seq

    # Save updated tracker
    sequence_file.parent.mkdir(parents=True, exist_ok=True)
    with open(sequence_file, 'w', encoding='utf-8') as f:
        json.dump(sequence_tracker, f, indent=2, ensure_ascii=False)

    return next_seq


def save_prompt_to_file(prompt: str, filename: str, output_dir: Path = None) -> Path:
    """
    Save prompt text to file.

    Args:
        prompt: Prompt text
        filename: Output filename
        output_dir: Output directory (defaults to PROMPTS_DIR from settings)

    Returns:
        Path to saved file
    """
    if output_dir is None:
        from config.settings import PROMPTS_DIR
        output_dir = PROMPTS_DIR

    output_dir.mkdir(parents=True, exist_ok=True)
    file_path = output_dir / filename

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(prompt)

    return file_path


def save_generation_record(record: Dict[str, Any], image_id: str) -> Path:
    """
    Save generation record to JSON file.

    Args:
        record: Generation record dictionary
        image_id: Image ID (used as filename)

    Returns:
        Path to saved record file
    """
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    file_path = RECORDS_DIR / f"{image_id}.json"

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(record, f, indent=2, ensure_ascii=False)

    return file_path


def load_generation_record(image_id: str) -> Dict[str, Any]:
    """
    Load generation record from JSON file.

    Args:
        image_id: Image ID

    Returns:
        Generation record dictionary

    Raises:
        FileNotFoundError: If record doesn't exist
    """
    file_path = RECORDS_DIR / f"{image_id}.json"

    if not file_path.exists():
        raise FileNotFoundError(f"Generation record not found: {image_id}")

    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


if __name__ == "__main__":
    # Test utility functions
    print("Testing utility functions...")

    # Test ID abbreviation extraction
    assert extract_pose_abbr("pose_turn_back_smile_v1") == "turnback"
    assert extract_pose_abbr("pose_sitting_hold_v1") == "sitting"
    assert extract_scene_abbr("scene_living_sofa_v1") == "living"
    assert extract_theme_abbr("theme_halloween_v1") == "halloween"
    assert extract_style_abbr("retro_1950s_flat") == "retro50s"

    print("✓ All abbreviation tests passed")

    # Test sequence generation
    seq1 = get_next_sequence("betty", "turnback", "living", "halloween", "retro50s")
    seq2 = get_next_sequence("betty", "turnback", "living", "halloween", "retro50s")
    assert seq2 == seq1 + 1

    print(f"✓ Sequence generation test passed (seq1={seq1}, seq2={seq2})")

    print("\nAll utility function tests passed!")

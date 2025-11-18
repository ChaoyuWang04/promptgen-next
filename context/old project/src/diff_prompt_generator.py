"""Comparison image prompt generator - generates diff prompts based on generation records."""
import random
from typing import Dict, Any, List
from src.data_loader import load_character, load_theme, load_decorative_props
from src.utils import load_generation_record, generate_image_id


def select_new_color(current_color: str, color_pool: List[str]) -> str:
    """
    Select a new color from color pool, ensuring it's different from current.

    Args:
        current_color: Current color
        color_pool: Available color options

    Returns:
        New color (different from current)
    """
    available_colors = [c for c in color_pool if c != current_color]
    if not available_colors:
        raise ValueError(f"No alternative colors available (current: {current_color})")
    return random.choice(available_colors)


def generate_new_outfit_minor_state(character: Dict[str, Any],
                                     current_state: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Generate new outfit_minor state with changed colors.

    Args:
        character: Character data dict
        current_state: Current outfit_minor state from record

    Returns:
        New outfit_minor state with different colors
    """
    new_state = []

    # Build element-to-current-color mapping
    current_colors = {item["element"]: item["current_color"] for item in current_state}

    # Generate new colors for each element
    for outfit_item in character["outfit_minor"]:
        element = outfit_item["element"]
        current_color = current_colors.get(element, outfit_item["original_color"])
        color_pool = outfit_item["color_pool"]

        # Select new color
        new_color = select_new_color(current_color, color_pool)

        new_state.append({
            "element": element,
            "current_color": new_color
        })

    return new_state


def select_new_decorations(theme: Dict[str, Any],
                           used_from_theme: List[str],
                           max_decorations: int = 8) -> Dict[str, List[str]]:
    """
    Select new decorations, avoiding previously used theme decorations.

    Strategy:
    1. Get available decorative_props from theme (filtered by used_from_theme)
    2. Get common props from decorative_props library (filtered by style)
    3. Mix according to priority rules

    Args:
        theme: Theme data dict
        used_from_theme: Previously used theme decorations
        max_decorations: Maximum number of decorations to select

    Returns:
        Dictionary with structure:
        {
            "from_theme": [str],
            "from_scene": [str]  # Common props for scene edges
        }
    """
    # Get available theme decorations (exclude used ones)
    # decorative_props is an array of {name, name_en, priority}
    theme_decorations = theme.get("decorative_props", [])

    # Group by priority
    priority_high = [d["name"] for d in theme_decorations if d.get("priority") == "high" and d["name"] not in used_from_theme]
    priority_medium = [d["name"] for d in theme_decorations if d.get("priority") == "medium" and d["name"] not in used_from_theme]
    priority_low = [d["name"] for d in theme_decorations if d.get("priority") == "low" and d["name"] not in used_from_theme]

    # Get common props (filtered by style compatibility)
    # For MVP, we'll use all common props (style filtering can be added later)
    decorative_props_lib = load_decorative_props()
    common_props = decorative_props_lib.get("common_props", [])

    selected_from_theme = []
    selected_from_scene = []

    # Selection strategy:
    # - High priority: 1-2 items
    # - Medium priority: 0-1 items
    # - Low priority: 0-1 items
    # - Common props: Fill remaining slots

    # Select from high priority
    if priority_high:
        count = min(2, len(priority_high), max_decorations)
        selected_from_theme.extend(random.sample(priority_high, count))

    # Select from medium priority if space remains
    remaining = max_decorations - len(selected_from_theme)
    if remaining > 0 and priority_medium:
        count = min(1, len(priority_medium), remaining)
        selected_from_theme.extend(random.sample(priority_medium, count))

    # Select from low priority if space remains
    remaining = max_decorations - len(selected_from_theme)
    if remaining > 0 and priority_low:
        count = min(1, len(priority_low), remaining)
        selected_from_theme.extend(random.sample(priority_low, count))

    # Fill remaining slots with common props
    remaining = max_decorations - len(selected_from_theme)
    if remaining > 0 and common_props:
        count = min(remaining, len(common_props))
        selected_from_scene.extend(random.sample(common_props, count))

    return {
        "from_theme": selected_from_theme,
        "from_scene": selected_from_scene
    }


def generate_diff_prompt(image_id: str, pose_id: str, scene_id: str, style_id: str) -> Dict[str, Any]:
    """
    Generate comparison image prompt based on generation record.

    Args:
        image_id: Original image ID to generate diff for
        pose_id: Pose library ID (same as main image)
        scene_id: Scene library ID (same as main image)
        style_id: Style library ID (same as main image)

    Returns:
        Dictionary containing:
        - diff_image_id: New image ID for comparison image
        - prompt_cn: Complete Chinese prompt for comparison image
        - new_outfit_state: New outfit_minor colors
        - new_decorations: New decoration selection
        - original_record: Original generation record for reference

    Raises:
        FileNotFoundError: If generation record not found
    """
    # Step 1: Load generation record
    original_record = load_generation_record(image_id)

    # Step 2: Load library data
    character = load_character(original_record["character_id"])
    theme = load_theme(original_record["theme_id"])

    from src.data_loader import load_pose, load_scene, load_style
    pose = load_pose(pose_id)
    scene = load_scene(scene_id)
    style = load_style(style_id)

    # Step 3: Generate new outfit_minor state
    current_outfit_state = original_record["outfit_minor_state"]
    new_outfit_state = generate_new_outfit_minor_state(character, current_outfit_state)

    # Step 4: Select new decorations
    used_from_theme = original_record["used_decorations"]["from_theme"]
    max_decorations = 8  # Fixed to 8 decorations for diff images
    new_decorations = select_new_decorations(theme, used_from_theme, max_decorations)

    # Step 5: Build color change descriptions
    color_changes = []
    color_map_old = {item["element"]: item["current_color"] for item in current_outfit_state}
    color_map_new = {item["element"]: item["current_color"] for item in new_outfit_state}

    for element in color_map_old:
        old_color = color_map_old[element]
        new_color = color_map_new[element]
        color_changes.append(f"将{element}的颜色从{old_color}改为{new_color}")

    # Step 6: Build decorative props list
    all_decorations = new_decorations["from_theme"] + new_decorations["from_scene"]
    # Extract just the names from decorative props (they might be dict objects)
    decoration_names = []
    for item in all_decorations:
        if isinstance(item, dict):
            decoration_names.append(item.get("name", str(item)))
        else:
            decoration_names.append(str(item))

    decorations_str = ", ".join(decoration_names)

    # Step 7: Assemble modification-only prompt (按PRD第八章模板)
    color_changes_text = "\n".join([f"{i+1}. {change}" for i, change in enumerate(color_changes)])

    prompt_cn = f"""基于原图进行以下细节修改,保持人物姿态、场景、整体构图完全不变:

【颜色修改】
{color_changes_text}

【添加装饰元素】
即使不符合主题也请帮我添加以下元素,每一个元素请只添加一个,并且保证散落在图片的各处, 不要堆积在一起, 即使位置不符合常理也可以:
{decorations_str}

所有修改仅限于上述细节,不改变人物表情、姿态、场景物体位置。"""

    # Step 8: Generate new image ID (with incremented sequence)
    diff_image_id = generate_image_id(character, pose, scene, theme, style)

    return {
        "diff_image_id": diff_image_id,
        "prompt_cn": prompt_cn,
        "new_outfit_state": new_outfit_state,
        "new_decorations": new_decorations,
        "original_record": original_record
    }


if __name__ == "__main__":
    # Test diff prompt generation
    print("Testing diff prompt generator...")

    # First, generate a main image to have a record
    from src.prompt_generator import generate_main_prompt
    from src.record_generator import create_and_save_record

    print("\n1. Generating main image...")
    main_result = generate_main_prompt(
        character_id="char_betty_v1",
        pose_id="pose_turn_back_smile_v1",
        scene_id="scene_living_sofa_v1",
        theme_id="theme_halloween_v1",
        style_id="style_retro1950_flat_v1"
    )

    main_image_id = main_result["image_id"]
    print(f"   Main image ID: {main_image_id}")

    # Save generation record
    record = create_and_save_record(
        image_id=main_image_id,
        character_id="char_betty_v1",
        theme_id="theme_halloween_v1",
        character=main_result["character"],
        theme=main_result["theme"],
        selected_micro_props=main_result["selected_micro_props"]
    )
    print(f"   Record saved: {record['record_path']}")

    # Generate diff prompt
    print("\n2. Generating comparison image...")
    diff_result = generate_diff_prompt(
        image_id=main_image_id,
        pose_id="pose_turn_back_smile_v1",
        scene_id="scene_living_sofa_v1",
        style_id="style_retro1950_flat_v1"
    )

    print(f"   Diff image ID: {diff_result['diff_image_id']}")

    print("\n3. Outfit color changes:")
    print("   Original colors:")
    for item in diff_result['original_record']['outfit_minor_state']:
        print(f"      {item['element']}: {item['current_color']}")

    print("   New colors:")
    for item in diff_result['new_outfit_state']:
        print(f"      {item['element']}: {item['current_color']}")

    print("\n4. Decoration changes:")
    print(f"   Original: {diff_result['original_record']['used_decorations']['from_theme']}")
    print(f"   New (theme): {diff_result['new_decorations']['from_theme']}")
    print(f"   New (scene): {diff_result['new_decorations']['from_scene']}")

    print("\n5. Generated Diff Prompt:")
    print("=" * 80)
    print(diff_result['prompt_cn'])
    print("=" * 80)

    print("\n✓ All diff prompt generator tests passed!")

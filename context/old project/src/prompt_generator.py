"""Main image prompt generator - assembles prompts from library data."""
import random
from typing import Dict, Any, List, Optional
from src.data_loader import (
    load_character, load_pose, load_scene, load_theme, load_style
)
from src.utils import generate_image_id
# Avoid circular import: template_manager and template_engine are imported inside functions


def build_character_module(character: Dict[str, Any], scene: Dict[str, Any]) -> str:
    """
    Build character module of the prompt.

    Args:
        character: Character data
        scene: Scene data (for subject_ratio)

    Returns:
        Character module string
    """
    # Appearance core + outfit major
    base_desc = f"{character['appearance_core']}, {character['outfit_major']}"

    # Outfit minor (use original colors)
    outfit_minor_desc = ', '.join([
        item["description_template"].format(color=item["original_color"])
        for item in character["outfit_minor"]
    ])

    # Subject ratio from scene
    subject_ratio = scene["camera_preset"]["subject_ratio"]

    return (
        f"{base_desc}, {outfit_minor_desc}; "
        f"人物为画面主体, 占画面约{subject_ratio}, 身体任何部位不被遮挡"
    )


def build_pose_module(pose: Dict[str, Any]) -> str:
    """Build pose module of the prompt."""
    emotion_str = ', '.join(pose["emotion"])

    return (
        f"姿态参考 {pose['pose_name']}: "
        f"{pose['body_orientation']}; "
        f"{pose['head_orientation']}; "
        f"{pose['arm_position']}; "
        f"{pose['leg_position']}; "
        f"情绪 {emotion_str}"
    )


def build_scene_module(scene: Dict[str, Any]) -> str:
    """Build scene module of the prompt."""
    must_objects_str = ', '.join(scene["must_objects"])

    # Take up to 2 optional objects
    optional_objects = scene.get("optional_objects", [])
    optional_count = min(2, len(optional_objects))
    optional_str = ', '.join(random.sample(optional_objects, optional_count)) if optional_count > 0 else ""

    base = f"场景为 {scene['scene']}, 必备元素包含 {must_objects_str}"
    if optional_str:
        base += f"; 可在边缘加入 {optional_str}"

    return base


def build_theme_module(theme: Dict[str, Any], selected_micro_props: List[str]) -> str:
    """Build theme module of the prompt."""
    palette_str = ', '.join(theme["palette_core"])
    mood_str = ', '.join(theme["mood_words"])
    props_str = ', '.join(selected_micro_props)
    props_count = len(selected_micro_props)

    return (
        f"主题为 {theme['theme']}, "
        f"色彩基调 {palette_str}, "
        f"氛围 {mood_str}; "
        f"添加小装饰 {props_str} "
    )


def build_lighting_module(style: Dict[str, Any]) -> str:
    """Build lighting module of the prompt."""
    return f"自然柔和光线, {style['color_temp']}, 画面干净明亮, 与主题保持协调"


def build_style_module(style: Dict[str, Any]) -> str:
    """Build style module of the prompt."""
    inspirations_str = ', '.join(style["inspirations"])

    return (
        f"{style['era_style']}, "
        f"{style['render_technique']}, "
        f"线条 {style['line_weight']}, "
        f"明暗 {style['shade_level']}; "
        f"风格参考 {inspirations_str}; "
        f"风格一致性 {style['style_adapter_strength']}"
    )


def build_composition_module(scene: Dict[str, Any], character: Dict[str, Any],
                              theme: Dict[str, Any], style: Dict[str, Any]) -> str:
    """Build composition and constraints module of the prompt."""
    shot = scene["camera_preset"]["shot"]
    height = scene["camera_preset"]["height"]
    occlusion_guard_str = ', '.join(scene["occlusion_guard"])

    # Combine negative rules from character, theme, and style
    all_negative_rules = (
        character.get("negative_rules", []) +
        theme.get("exclusion_rules", []) +
        style.get("negative_style", [])
    )
    negative_str = ', '.join(all_negative_rules)

    return (
        f"{shot}, 相机高度 {height}; "
        f"遮挡守则 {occlusion_guard_str}; "
        f"禁止项 {negative_str}"
    )


def generate_main_prompt(character_id: str, pose_id: str, scene_id: str,
                         theme_id: str, style_id: str) -> Dict[str, Any]:
    """
    Generate complete main image prompt.

    Args:
        character_id: Character library ID
        pose_id: Pose library ID
        scene_id: Scene library ID
        theme_id: Theme library ID
        style_id: Style library ID

    Returns:
        Dictionary containing:
        - image_id: Generated image ID
        - prompt_cn: Complete Chinese prompt
        - character: Character data (for record generation)
        - theme: Theme data (for record generation)
        - selected_micro_props: Selected decorations (for record generation)
    """
    # Step 1: Load all library data
    character = load_character(character_id)
    pose = load_pose(pose_id)
    scene = load_scene(scene_id)
    theme = load_theme(theme_id)
    style = load_style(style_id)

    # Step 2: Randomly select micro_props (limited by max_micro_props)
    micro_props = theme.get("micro_props", [])
    max_count = theme.get("max_micro_props", 3)
    selection_count = min(max_count, len(micro_props))
    selected_micro_props = random.sample(micro_props, selection_count) if selection_count > 0 else []

    # Step 3: Build 7 modules
    module_1 = build_character_module(character, scene)
    module_2 = build_pose_module(pose)
    module_3 = build_scene_module(scene)
    module_4 = build_theme_module(theme, selected_micro_props)
    module_5 = build_lighting_module(style)
    module_6 = build_style_module(style)
    module_7 = build_composition_module(scene, character, theme, style)

    # Step 4: Assemble complete prompt
    prompt_cn = "\n\n".join([
        f"人物:{module_1}",
        f"姿态:{module_2}",
        f"场景:{module_3}",
        f"主题:{module_4}",
        f"光照:{module_5}",
        f"画风:{module_6}",
        f"构图:{module_7}"
    ])

    # Step 5: Generate image ID
    image_id = generate_image_id(character, pose, scene, theme, style)

    return {
        "image_id": image_id,
        "prompt_cn": prompt_cn,
        "character": character,
        "theme": theme,
        "selected_micro_props": selected_micro_props
    }


def generate_main_prompt_with_template(
    character_id: str,
    pose_id: str,
    scene_id: str,
    theme_id: str,
    style_id: str,
    template_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate main image prompt using a template.

    This function uses the TemplateEngine to render prompts based on user-selected
    templates, providing flexibility in prompt structure.

    Args:
        character_id: Character library ID
        pose_id: Pose library ID
        scene_id: Scene library ID
        theme_id: Theme library ID
        style_id: Style library ID
        template_id: Template ID (e.g., 'template_default_v1').
                    If None, uses the default template.

    Returns:
        Dictionary containing:
        - image_id: Generated image ID
        - prompt_cn: Complete Chinese prompt (rendered from template)
        - template_id: Template ID used for generation
        - character: Character data (for record generation)
        - theme: Theme data (for record generation)
        - selected_micro_props: Selected decorations (for record generation)

    Note:
        When template_id='template_default_v1', the output is 100% identical to
        generate_main_prompt() under the same random seed.
    """
    # Import here to avoid circular import
    from src.template_manager import get_template_manager
    from src.template_engine import render_template

    # Step 1: Load all library data (same as original function)
    character = load_character(character_id)
    pose = load_pose(pose_id)
    scene = load_scene(scene_id)
    theme = load_theme(theme_id)
    style = load_style(style_id)

    # Step 2: Randomly select micro_props (for record keeping)
    micro_props = theme.get("micro_props", [])
    max_count = theme.get("max_micro_props", 3)
    selection_count = min(max_count, len(micro_props))
    selected_micro_props = random.sample(micro_props, selection_count) if selection_count > 0 else []

    # Step 3: Get template
    manager = get_template_manager()
    if template_id is None:
        template_id = manager.get_default_template_id()

    template_data = manager.get_template(template_id)
    template_content = template_data['template']

    # Step 4: Render template using TemplateEngine
    prompt_cn = render_template(
        template=template_content,
        character_id=character_id,
        pose_id=pose_id,
        scene_id=scene_id,
        theme_id=theme_id,
        style_id=style_id
    )

    # Step 5: Generate image ID (same as original function)
    image_id = generate_image_id(character, pose, scene, theme, style)

    return {
        "image_id": image_id,
        "prompt_cn": prompt_cn,
        "template_id": template_id,  # Include template_id in result
        "character": character,
        "theme": theme,
        "selected_micro_props": selected_micro_props
    }


if __name__ == "__main__":
    # Test prompt generation
    print("Testing prompt generator...")

    result = generate_main_prompt(
        character_id="char_betty_v1",
        pose_id="pose_turn_back_smile_v1",
        scene_id="scene_living_sofa_v1",
        theme_id="theme_halloween_v1",
        style_id="style_retro1950_flat_v1"
    )

    print(f"\nGenerated Image ID: {result['image_id']}")
    print(f"\nGenerated Prompt (Chinese):\n")
    print("=" * 80)
    print(result['prompt_cn'])
    print("=" * 80)

    print(f"\nSelected micro props: {result['selected_micro_props']}")

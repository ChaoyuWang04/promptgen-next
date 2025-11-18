"""Data loader module for loading and caching library data."""
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from config.library_config import LIBRARY_CONFIG, get_all_library_paths


class LibraryCache:
    """Cache for library data to avoid repeated file reads."""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, library_name: str) -> Optional[Dict[str, Any]]:
        """Get cached library data."""
        return self._cache.get(library_name)

    def set(self, library_name: str, data: Dict[str, Any]) -> None:
        """Set cached library data."""
        self._cache[library_name] = data

    def clear(self) -> None:
        """Clear all cached data."""
        self._cache.clear()


# Global cache instance
_cache = LibraryCache()


def load_json_file(file_path: Path) -> Dict[str, Any]:
    """
    Load and parse JSON file.

    Args:
        file_path: Path to JSON file

    Returns:
        Parsed JSON data as dictionary

    Raises:
        FileNotFoundError: If file doesn't exist
        json.JSONDecodeError: If file is not valid JSON
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Library file not found: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_library(library_name: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
    """
    Load library data from JSON file with caching.

    Args:
        library_name: Name of the library (character, pose, scene, theme, style, decorative_props)
        use_cache: Whether to use cached data if available

    Returns:
        Library data dictionary, or None if library doesn't exist

    Raises:
        FileNotFoundError: If library file doesn't exist
    """
    if library_name not in LIBRARY_CONFIG:
        print(f"Warning: Unknown library name: {library_name}")
        return None

    # Check cache first
    if use_cache:
        cached_data = _cache.get(library_name)
        if cached_data is not None:
            return cached_data

    # Load from file
    library_paths = get_all_library_paths()
    file_path = library_paths[library_name]
    data = load_json_file(file_path)

    # Cache the data
    _cache.set(library_name, data)

    return data


def load_character(character_id: str) -> Dict[str, Any]:
    """
    Load specific character by ID.

    Args:
        character_id: Character ID (e.g., "char_betty_v1")

    Returns:
        Character data dictionary

    Raises:
        KeyError: If character_id not found
    """
    characters = load_library("character")
    if character_id not in characters:
        raise KeyError(
            f"Character not found: {character_id}. "
            f"Available: {list(characters.keys())}"
        )
    return characters[character_id]


def load_pose(pose_id: str) -> Dict[str, Any]:
    """Load specific pose by ID."""
    poses = load_library("pose")
    if pose_id not in poses:
        raise KeyError(
            f"Pose not found: {pose_id}. "
            f"Available: {list(poses.keys())}"
        )
    return poses[pose_id]


def load_scene(scene_id: str) -> Dict[str, Any]:
    """Load specific scene by ID."""
    scenes = load_library("scene")
    if scene_id not in scenes:
        raise KeyError(
            f"Scene not found: {scene_id}. "
            f"Available: {list(scenes.keys())}"
        )
    return scenes[scene_id]


def load_theme(theme_id: str) -> Dict[str, Any]:
    """Load specific theme by ID."""
    themes = load_library("theme")
    if theme_id not in themes:
        raise KeyError(
            f"Theme not found: {theme_id}. "
            f"Available: {list(themes.keys())}"
        )
    return themes[theme_id]


def load_style(style_id: str) -> Dict[str, Any]:
    """Load specific style by ID."""
    styles = load_library("style")
    if style_id not in styles:
        raise KeyError(
            f"Style not found: {style_id}. "
            f"Available: {list(styles.keys())}"
        )
    return styles[style_id]


def load_decorative_props() -> Dict[str, Any]:
    """Load decorative props library."""
    return load_library("decorative_props")


def get_all_characters() -> Dict[str, str]:
    """
    Get all available characters.

    Returns:
        Dictionary of character_id -> character_name
    """
    characters = load_library("character")
    return {char_id: char["name"] for char_id, char in characters.items()}


def get_all_poses() -> Dict[str, str]:
    """Get all available poses."""
    poses = load_library("pose")
    return {pose_id: pose["pose_name"] for pose_id, pose in poses.items()}


def get_all_scenes() -> Dict[str, str]:
    """Get all available scenes."""
    scenes = load_library("scene")
    return {scene_id: scene["scene"] for scene_id, scene in scenes.items()}


def get_all_themes() -> Dict[str, str]:
    """Get all available themes."""
    themes = load_library("theme")
    return {theme_id: theme["theme"] for theme_id, theme in themes.items()}


def get_all_styles() -> Dict[str, str]:
    """Get all available styles."""
    styles = load_library("style")
    return {style_id: style["era_style"] for style_id, style in styles.items()}


def load_all_libraries() -> Dict[str, Dict[str, Any]]:
    """
    Load all library data (dynamically based on LIBRARY_CONFIG).

    Returns:
        Dictionary with structure:
        {
            'character': {...},
            'pose': {...},
            'scene': {...},
            'theme': {...},
            'style': {...},
            'decorative_props': {...}
        }
    """
    libraries = {}

    for library_name in LIBRARY_CONFIG.keys():
        data = load_library(library_name)
        if data is not None:
            libraries[library_name] = data
        else:
            print(f"警告: 库 {library_name} 加载失败")

    return libraries


def clear_cache() -> None:
    """Clear all cached library data."""
    _cache.clear()


def validate_library_data() -> Dict[str, bool]:
    """
    Validate all library data can be loaded.

    Returns:
        Dictionary of library_name -> is_valid
    """
    results = {}

    for library_name in LIBRARY_CONFIG.keys():
        try:
            load_library(library_name, use_cache=False)
            results[library_name] = True
        except Exception as e:
            print(f"Error loading {library_name}: {e}")
            results[library_name] = False

    return results


def load_libraries_by_type(library_type: str) -> Dict[str, Any]:
    """
    根据类型加载所有库

    Args:
        library_type: 'main' 或 'diff'

    Returns:
        {库名: 库数据} 字典
    """
    result = {}
    for library_name, config in LIBRARY_CONFIG.items():
        if config['type'] == library_type:
            data = load_library(library_name)
            if data is not None:
                result[library_name] = data

    return result


def get_library_metadata(library_name: str) -> Optional[Dict]:
    """
    获取库的元数据（不加载实际数据）

    Args:
        library_name: 库名称

    Returns:
        库的配置元数据
    """
    from config.library_config import get_library_config
    return get_library_config(library_name)


def validate_library_structure(library_name: str) -> List[str]:
    """
    验证库数据的完整性和合法性

    Args:
        library_name: 库名称

    Returns:
        错误列表，空列表表示验证通过
    """
    from config.library_config import validate_library_structure as validate_struct

    data = load_library(library_name)
    if data is None:
        return [f"库 {library_name} 加载失败"]

    return validate_struct(library_name, data)


if __name__ == "__main__":
    # Test loading all libraries
    print("Testing library loader...")

    validation_results = validate_library_data()

    print("\nValidation Results:")
    for lib, is_valid in validation_results.items():
        status = "✓" if is_valid else "✗"
        print(f"{status} {lib}")

    print("\nAvailable Characters:", get_all_characters())
    print("Available Poses:", get_all_poses())
    print("Available Scenes:", get_all_scenes())
    print("Available Themes:", get_all_themes())
    print("Available Styles:", get_all_styles())

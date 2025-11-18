"""
Template engine for flexible prompt generation.

Supports two types of syntax:
1. {{field}} - Direct field access (e.g., {{character.appearance_core}})
2. {{@module:name}} - Call predefined modules (e.g., {{@module:character}})

Features:
- Automatic field formatting for arrays and objects
- Filters: {{field | join}}, {{field | join: ', '}}
- Real-time preview with selected library IDs
- Metadata API for autocomplete

Field Definitions (Phase 2 - Auto-Generated):
- Field metadata is AUTOMATICALLY generated from library_config.py Schema definitions
- No manual maintenance required - fields sync with actual library structures
- Run tools/validate_template_fields.py to verify consistency
- Updated: 2025-11-13 (Phase 2 Metadata System)
"""

import re
import random
from typing import Dict, Any, List, Optional
from src.data_loader import (
    load_character, load_pose, load_scene, load_theme, load_style
)
from src.prompt_generator import (
    build_character_module,
    build_pose_module,
    build_scene_module,
    build_theme_module,
    build_lighting_module,
    build_style_module,
    build_composition_module
)


class TemplateEngine:
    """Template rendering engine with support for fields and modules."""

    # Regex patterns
    VARIABLE_PATTERN = re.compile(r'\{\{([^}]+)\}\}')
    MODULE_PATTERN = re.compile(r'@module:(\w+)')
    FILTER_PATTERN = re.compile(r'([^|]+)(?:\s*\|\s*(.+))?')

    def __init__(self):
        """Initialize template engine."""
        self.context = {}
        self.selected_micro_props = []

    def render_template(
        self,
        template: str,
        character_id: str,
        pose_id: str,
        scene_id: str,
        theme_id: str,
        style_id: str
    ) -> str:
        """
        Render template with library data.

        Args:
            template: Template string with {{}} placeholders
            character_id: Character library ID
            pose_id: Pose library ID
            scene_id: Scene library ID
            theme_id: Theme library ID
            style_id: Style library ID

        Returns:
            Rendered prompt string
        """
        # Load all library data
        character = load_character(character_id)
        pose = load_pose(pose_id)
        scene = load_scene(scene_id)
        theme = load_theme(theme_id)
        style = load_style(style_id)

        # Randomly select micro_props (for theme module)
        micro_props = theme.get("micro_props", [])
        max_count = theme.get("max_micro_props", 3)
        selection_count = min(max_count, len(micro_props))
        self.selected_micro_props = random.sample(micro_props, selection_count) if selection_count > 0 else []

        # Build context
        self.context = {
            'character': character,
            'pose': pose,
            'scene': scene,
            'theme': theme,
            'style': style
        }

        # Find and replace all {{...}} patterns
        def replace_match(match):
            expression = match.group(1).strip()
            return self._evaluate_expression(expression)

        result = self.VARIABLE_PATTERN.sub(replace_match, template)
        return result

    def _evaluate_expression(self, expression: str) -> str:
        """
        Evaluate a single expression (field or module call).

        Examples:
            character.appearance_core
            @module:character
            pose.emotion | join
            scene.must_objects | join: ', '
        """
        # Check if it's a module call
        module_match = self.MODULE_PATTERN.match(expression)
        if module_match:
            module_name = module_match.group(1)
            return self._call_module(module_name)

        # Parse field and filters
        filter_match = self.FILTER_PATTERN.match(expression)
        if not filter_match:
            return f"{{{{ERROR: Invalid expression '{expression}'}}}}"

        field_path = filter_match.group(1).strip()
        filter_spec = filter_match.group(2).strip() if filter_match.group(2) else None

        # Get field value
        value = self._get_field_value(field_path)

        # Apply filters
        if filter_spec:
            value = self._apply_filter(value, filter_spec)

        return self._format_value(value)

    def _call_module(self, module_name: str) -> str:
        """
        Call predefined module from prompt_generator.

        Args:
            module_name: One of: character, pose, scene, theme, lighting, style, composition

        Returns:
            Module output string
        """
        character = self.context['character']
        pose = self.context['pose']
        scene = self.context['scene']
        theme = self.context['theme']
        style = self.context['style']

        if module_name == 'character':
            return build_character_module(character, scene)
        elif module_name == 'pose':
            return build_pose_module(pose)
        elif module_name == 'scene':
            return build_scene_module(scene)
        elif module_name == 'theme':
            return build_theme_module(theme, self.selected_micro_props)
        elif module_name == 'lighting':
            return build_lighting_module(style)
        elif module_name == 'style':
            return build_style_module(style)
        elif module_name == 'composition':
            return build_composition_module(scene, character, theme, style)
        else:
            return f"{{{{ERROR: Unknown module '{module_name}'}}}}"

    def _get_field_value(self, field_path: str) -> Any:
        """
        Get field value from context using dot notation.

        Examples:
            character.appearance_core → context['character']['appearance_core']
            scene.camera_preset.subject_ratio → context['scene']['camera_preset']['subject_ratio']
        """
        parts = field_path.split('.')
        if len(parts) < 2:
            return f"{{{{ERROR: Invalid field path '{field_path}'}}}}"

        library_name = parts[0]
        if library_name not in self.context:
            return f"{{{{ERROR: Unknown library '{library_name}'}}}}"

        value = self.context[library_name]
        for part in parts[1:]:
            if isinstance(value, dict):
                if part not in value:
                    return f"{{{{ERROR: Field '{part}' not found in {library_name}}}}}"
                value = value[part]
            else:
                return f"{{{{ERROR: Cannot access '{part}' on non-dict value}}}}"

        return value

    def _apply_filter(self, value: Any, filter_spec: str) -> Any:
        """
        Apply filter to value.

        Supported filters:
            join - Join array with ', '
            join: 'separator' - Join array with custom separator
        """
        # Parse filter name and arguments
        parts = filter_spec.split(':', 1)
        filter_name = parts[0].strip()
        filter_arg = parts[1].strip().strip('\'"') if len(parts) > 1 else None

        if filter_name == 'join':
            if isinstance(value, list):
                separator = filter_arg if filter_arg else ', '
                return separator.join(str(item) for item in value)
            else:
                return value
        else:
            return f"{{{{ERROR: Unknown filter '{filter_name}'}}}}"

    def _format_value(self, value: Any) -> str:
        """
        Format value for output.

        - String: Return as-is
        - Number: Convert to string
        - List: Join with ', '
        - Dict: Return JSON string
        - None: Return empty string
        """
        if value is None:
            return ''
        elif isinstance(value, str):
            return value
        elif isinstance(value, (int, float)):
            return str(value)
        elif isinstance(value, list):
            # Auto-join arrays
            return ', '.join(str(item) for item in value)
        elif isinstance(value, dict):
            # For dicts, return a formatted string
            return str(value)
        else:
            return str(value)

    @staticmethod
    def get_available_variables() -> List[Dict[str, Any]]:
        """
        Get all available variables for autocomplete.

        Field metadata is automatically generated from library_config.py Schema definitions.
        This ensures field definitions always match actual library structures.

        Returns:
            List of variable metadata with keys:
            - label: Variable name (e.g., 'character.appearance_core')
            - type: 'field' or 'module'
            - library: Library name (e.g., 'character')
            - field: Field name (e.g., 'appearance_core')
            - desc: Human-readable description
            - value_type: Data type ('string', 'array', 'object', 'number')
        """
        from config.library_config import LIBRARY_CONFIG

        variables = []

        # Step 1: Add predefined module variables
        modules = [
            {'name': 'character', 'desc': '人物模块 - 完整的人物描述逻辑'},
            {'name': 'pose', 'desc': '姿态模块 - 完整的姿态描述逻辑'},
            {'name': 'scene', 'desc': '场景模块 - 场景和物体描述(含随机选择)'},
            {'name': 'theme', 'desc': '主题模块 - 主题色彩和装饰物(含随机选择)'},
            {'name': 'lighting', 'desc': '光照模块 - 光照设置'},
            {'name': 'style', 'desc': '画风模块 - 画风和渲染技术'},
            {'name': 'composition', 'desc': '构图模块 - 相机设置和负面规则'}
        ]

        for module in modules:
            variables.append({
                'label': f"@module:{module['name']}",
                'type': 'module',
                'library': module['name'],
                'field': None,
                'desc': module['desc'],
                'value_type': 'module'
            })

        # Step 2: Auto-generate field variables from Schema (only for main libraries)
        for library_name, config in LIBRARY_CONFIG.items():
            # Only generate fields for main image libraries (not decorative_props)
            if config['type'] != 'main':
                continue

            schema = config.get('schema', {})
            properties = schema.get('properties', {})

            # Recursively extract all fields from Schema
            field_vars = TemplateEngine._generate_variables_from_schema(
                library_name=library_name,
                properties=properties,
                prefix=library_name
            )
            variables.extend(field_vars)

        return variables

    @staticmethod
    def _generate_variables_from_schema(
        library_name: str,
        properties: Dict[str, Any],
        prefix: str,
        depth: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Recursively generate variable definitions from Schema properties.

        Args:
            library_name: Library name (e.g., 'character')
            properties: Schema properties dictionary
            prefix: Variable name prefix (e.g., 'character' or 'scene.camera_preset')
            depth: Current recursion depth (max 2 to prevent deep nesting)

        Returns:
            List of variable metadata dictionaries
        """
        if depth > 2:  # Prevent infinite recursion
            return []

        variables = []

        for field_name, field_schema in properties.items():
            field_type = field_schema.get('type', 'unknown')
            description = field_schema.get('description', f'{field_name}字段')

            # Full variable name (e.g., 'character.appearance_core')
            variable_name = f"{prefix}.{field_name}"

            # Basic types: string, number, boolean, integer
            if field_type in ['string', 'number', 'boolean', 'integer']:
                variables.append({
                    'label': variable_name,
                    'type': 'field',
                    'library': library_name,
                    'field': field_name,
                    'desc': description,
                    'value_type': field_type
                })

            # Array type
            elif field_type == 'array':
                variables.append({
                    'label': variable_name,
                    'type': 'field',
                    'library': library_name,
                    'field': field_name,
                    'desc': description,
                    'value_type': 'array'
                })

                # If array items are objects, recursively expand (e.g., outfit_minor)
                items_schema = field_schema.get('items', {})
                if items_schema.get('type') == 'object':
                    item_properties = items_schema.get('properties', {})
                    # Generate nested fields like 'character.outfit_minor[].element'
                    nested_vars = TemplateEngine._generate_variables_from_schema(
                        library_name=library_name,
                        properties=item_properties,
                        prefix=f"{variable_name}[]",
                        depth=depth + 1
                    )
                    variables.extend(nested_vars)

            # Object type (e.g., camera_preset)
            elif field_type == 'object':
                variables.append({
                    'label': variable_name,
                    'type': 'field',
                    'library': library_name,
                    'field': field_name,
                    'desc': description,
                    'value_type': 'object'
                })

                # Recursively expand object properties (e.g., camera_preset.shot)
                nested_properties = field_schema.get('properties', {})
                nested_vars = TemplateEngine._generate_variables_from_schema(
                    library_name=library_name,
                    properties=nested_properties,
                    prefix=variable_name,
                    depth=depth + 1
                )
                variables.extend(nested_vars)

        return variables

    @staticmethod
    def validate_template(template: str) -> Dict[str, Any]:
        """
        Validate template syntax.

        Returns:
            {
                'valid': bool,
                'errors': List[str],
                'warnings': List[str]
            }
        """
        errors = []
        warnings = []

        # Find all {{...}} patterns
        matches = TemplateEngine.VARIABLE_PATTERN.findall(template)

        for expression in matches:
            expression = expression.strip()

            # Check if it's a module call
            if expression.startswith('@module:'):
                module_name = expression.replace('@module:', '')
                valid_modules = ['character', 'pose', 'scene', 'theme', 'lighting', 'style', 'composition']
                if module_name not in valid_modules:
                    errors.append(f"Unknown module: {module_name}")
            else:
                # Check field syntax
                parts = expression.split('|')
                field_path = parts[0].strip()

                # Validate field path
                if '.' not in field_path:
                    errors.append(f"Invalid field path: {field_path} (must be library.field)")
                else:
                    library_name = field_path.split('.')[0]
                    valid_libraries = ['character', 'pose', 'scene', 'theme', 'style']
                    if library_name not in valid_libraries:
                        errors.append(f"Unknown library: {library_name}")

                # Validate filter if present
                if len(parts) > 1:
                    filter_spec = parts[1].strip()
                    filter_name = filter_spec.split(':')[0].strip()
                    valid_filters = ['join']
                    if filter_name not in valid_filters:
                        warnings.append(f"Unknown filter: {filter_name} (will be ignored)")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }


# Singleton instance
_template_engine = TemplateEngine()


def render_template(template: str, character_id: str, pose_id: str,
                    scene_id: str, theme_id: str, style_id: str) -> str:
    """Convenience function to render template."""
    return _template_engine.render_template(
        template, character_id, pose_id, scene_id, theme_id, style_id
    )


def get_available_variables() -> List[Dict[str, Any]]:
    """Convenience function to get available variables."""
    return TemplateEngine.get_available_variables()


def validate_template(template: str) -> Dict[str, Any]:
    """Convenience function to validate template."""
    return TemplateEngine.validate_template(template)


if __name__ == "__main__":
    # Test template engine
    print("Testing template engine...\n")

    # Test 1: Default template (using all modules)
    default_template = """人物:{{@module:character}}

姿态:{{@module:pose}}

场景:{{@module:scene}}

主题:{{@module:theme}}

光照:{{@module:lighting}}

画风:{{@module:style}}

构图:{{@module:composition}}"""

    print("=" * 80)
    print("Test 1: Default template (all modules)")
    print("=" * 80)
    result = render_template(
        default_template,
        character_id="char_betty_v1",
        pose_id="pose_turn_back_smile_v1",
        scene_id="scene_living_sofa_v1",
        theme_id="theme_halloween_v1",
        style_id="style_retro1950_flat_v1"
    )
    print(result)

    # Test 2: Custom template (using fields)
    custom_template = """描述: {{character.appearance_core}}, {{character.outfit_major}}, 在{{scene.scene}}里

姿态: {{pose.body_orientation}}, {{pose.emotion | join}}

风格: {{style.era_style}}, {{style.render_technique}}

主题: {{theme.theme}}, 色调 {{theme.palette_core | join: ' & '}}"""

    print("\n" + "=" * 80)
    print("Test 2: Custom template (using fields)")
    print("=" * 80)
    result2 = render_template(
        custom_template,
        character_id="char_betty_v1",
        pose_id="pose_turn_back_smile_v1",
        scene_id="scene_living_sofa_v1",
        theme_id="theme_halloween_v1",
        style_id="style_retro1950_flat_v1"
    )
    print(result2)

    # Test 3: Validation
    print("\n" + "=" * 80)
    print("Test 3: Template validation")
    print("=" * 80)
    validation = validate_template(default_template)
    print(f"Valid: {validation['valid']}")
    print(f"Errors: {validation['errors']}")
    print(f"Warnings: {validation['warnings']}")

    # Test 4: Get available variables
    print("\n" + "=" * 80)
    print("Test 4: Available variables (first 10)")
    print("=" * 80)
    variables = get_available_variables()
    for var in variables[:10]:
        print(f"- {var['label']} ({var['value_type']}): {var['desc']}")
    print(f"... and {len(variables) - 10} more variables")

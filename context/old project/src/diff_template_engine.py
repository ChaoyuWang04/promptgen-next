"""
Diff template engine for flexible comparison image prompt generation.

Supports diff-specific variables:
1. {{main.*}} - Original image record fields (image_id, character_id, theme_id)
2. {{outfit_state.*}} - Current outfit_minor state (element, current_color)
3. {{new_outfit_state.*}} - New outfit_minor state for comparison
4. {{decorations.*}} - Currently used decorations (from_theme, from_scene)
5. {{new_decorations.*}} - New decorations for comparison
6. {{pose.*}}, {{scene.*}}, {{style.*}} - Standard library fields

Features:
- Array iteration with index access ({{outfit_state.0.element}})
- Join filters: {{new_outfit_state | join}}, {{new_decorations.from_theme | join: ', '}}
- Automatic color change description generation
- Supports both diff-specific and standard template variables

Week 3 Day 3 Implementation
"""

import re
from typing import Dict, Any, List, Optional


class DiffTemplateEngine:
    """Template rendering engine for diff (comparison image) prompts."""

    # Regex patterns
    VARIABLE_PATTERN = re.compile(r'\{\{([^}]+)\}\}')
    FILTER_PATTERN = re.compile(r'([^|]+)(?:\s*\|\s*(.+))?')

    def __init__(self):
        """Initialize diff template engine."""
        self.context = {}

    def render_diff_template(
        self,
        template: str,
        main_record: Dict[str, Any],
        outfit_state: List[Dict[str, str]],
        new_outfit_state: List[Dict[str, str]],
        decorations: Dict[str, List[str]],
        new_decorations: Dict[str, List[str]],
        pose: Dict[str, Any],
        scene: Dict[str, Any],
        style: Dict[str, Any]
    ) -> str:
        """
        Render diff template with diff-specific context.

        Args:
            template: Template string with {{}} placeholders
            main_record: Original image generation record
            outfit_state: Current outfit_minor state [{"element": "鞋子", "current_color": "红色"}, ...]
            new_outfit_state: New outfit_minor state for diff
            decorations: Used decorations {"from_theme": [...], "from_scene": [...]}
            new_decorations: New decorations for diff
            pose: Pose library data
            scene: Scene library data
            style: Style library data

        Returns:
            Rendered diff prompt string
        """
        # Build color change descriptions (matching original generator format)
        color_changes = []
        if outfit_state and new_outfit_state:
            # Build lookup maps
            color_map_old = {item['element']: item['current_color'] for item in outfit_state}
            color_map_new = {item['element']: item['current_color'] for item in new_outfit_state}

            # Generate change descriptions
            for element in color_map_old:
                old_color = color_map_old[element]
                new_color = color_map_new.get(element, old_color)
                color_changes.append({
                    'element': element,
                    'old_color': old_color,
                    'new_color': new_color,
                    'description': f"将{element}的颜色从{old_color}改为{new_color}"
                })

        # Combine all decorations (matching original generator format)
        all_decorations = []
        if new_decorations:
            all_decorations.extend(new_decorations.get('from_theme', []))
            all_decorations.extend(new_decorations.get('from_scene', []))

        # Build diff-specific context
        self.context = {
            'main': {
                'image_id': main_record.get('image_id', ''),
                'character_id': main_record.get('character_id', ''),
                'theme_id': main_record.get('theme_id', '')
            },
            'outfit_state': outfit_state,
            'new_outfit_state': new_outfit_state,
            'color_changes': color_changes,  # Pre-computed color change descriptions
            'decorations': decorations,
            'new_decorations': new_decorations,
            'all_decorations': all_decorations,  # Combined from_theme + from_scene
            'pose': pose,
            'scene': scene,
            'style': style
        }

        # Find and replace all {{...}} patterns
        def replace_match(match):
            # Don't strip expression - preserve spaces in filter arguments
            expression = match.group(1)
            return self._evaluate_expression(expression)

        result = self.VARIABLE_PATTERN.sub(replace_match, template)
        return result

    def _evaluate_expression(self, expression: str) -> str:
        """
        Evaluate a single expression (field or filter).

        Examples:
            main.image_id
            outfit_state.0.element
            new_outfit_state | join
            new_decorations.from_theme | join: ', '
        """
        # Parse field and filters
        filter_match = self.FILTER_PATTERN.match(expression)
        if not filter_match:
            return f"{{{{ERROR: Invalid expression '{expression}'}}}}"

        field_path = filter_match.group(1).strip()
        # Don't strip filter_spec here - preserve spaces in filter arguments
        filter_spec = filter_match.group(2) if filter_match.group(2) else None

        # Get field value
        value = self._get_field_value(field_path)

        # Apply filters
        if filter_spec:
            value = self._apply_filter(value, filter_spec)

        return self._format_value(value)

    def _get_field_value(self, field_path: str) -> Any:
        """
        Get value from context by field path.

        Supports:
            main.image_id
            outfit_state.0.element
            new_decorations.from_theme
            pose.emotion
        """
        parts = field_path.split('.')
        value = self.context

        for part in parts:
            if value is None:
                return None

            # Handle array index access (e.g., outfit_state.0)
            if isinstance(value, list):
                try:
                    index = int(part)
                    value = value[index] if 0 <= index < len(value) else None
                except (ValueError, IndexError):
                    return None
            # Handle dict key access
            elif isinstance(value, dict):
                value = value.get(part)
            else:
                return None

        return value

    def _apply_filter(self, value: Any, filter_spec: str) -> Any:
        """
        Apply filter to value.

        Supported filters:
            join - Join array elements
            join: ', ' - Join with custom separator
        """
        filter_parts = filter_spec.split(':', 1)
        filter_name = filter_parts[0].strip()
        # Only strip leading spaces from argument (keep trailing spaces as part of separator)
        filter_arg = filter_parts[1].lstrip() if len(filter_parts) > 1 else None
        filter_arg = filter_arg.strip('"\'') if filter_arg else None

        if filter_name == 'join':
            if not isinstance(value, list):
                return value

            # Special handling for different array types
            if value and isinstance(value[0], dict):
                # Handle color_changes array (pre-computed descriptions)
                if 'description' in value[0]:
                    separator = filter_arg if filter_arg else '\n'
                    return separator.join([
                        f"{i+1}. {item['description']}"
                        for i, item in enumerate(value)
                    ])
                # Handle outfit_state arrays
                elif 'element' in value[0] and 'current_color' in value[0]:
                    separator = filter_arg if filter_arg else '\n'
                    return separator.join([
                        f"{i+1}. 将{item['element']}的颜色改为{item['current_color']}"
                        for i, item in enumerate(value)
                    ])

            # Regular join for simple arrays (handle mixed string/dict items)
            separator = filter_arg if filter_arg else ', '
            formatted_items = []
            for item in value:
                if isinstance(item, dict):
                    # Extract 'name' field from dict (for decorative_props)
                    formatted_items.append(item.get('name', str(item)))
                else:
                    formatted_items.append(str(item))
            return separator.join(formatted_items)

        return value

    def _format_value(self, value: Any) -> str:
        """
        Format value for template output.

        Args:
            value: Value to format

        Returns:
            String representation
        """
        if value is None:
            return ''

        if isinstance(value, str):
            return value

        if isinstance(value, (int, float)):
            return str(value)

        if isinstance(value, list):
            # Format list of dicts (like outfit_state)
            if value and isinstance(value[0], dict):
                return ', '.join([str(item) for item in value])
            # Format simple list
            return ', '.join([str(item) for item in value])

        if isinstance(value, dict):
            # Format dict as key=value pairs
            return ', '.join([f"{k}={v}" for k, v in value.items()])

        return str(value)


def render_diff_template(
    template: str,
    main_record: Dict[str, Any],
    outfit_state: List[Dict[str, str]],
    new_outfit_state: List[Dict[str, str]],
    decorations: Dict[str, List[str]],
    new_decorations: Dict[str, List[str]],
    pose: Dict[str, Any],
    scene: Dict[str, Any],
    style: Dict[str, Any]
) -> str:
    """
    Convenience function for rendering diff templates.

    Args:
        template: Template string
        main_record: Original image record
        outfit_state: Current outfit state
        new_outfit_state: New outfit state
        decorations: Used decorations
        new_decorations: New decorations
        pose: Pose library data
        scene: Scene library data
        style: Style library data

    Returns:
        Rendered diff prompt
    """
    engine = DiffTemplateEngine()
    return engine.render_diff_template(
        template=template,
        main_record=main_record,
        outfit_state=outfit_state,
        new_outfit_state=new_outfit_state,
        decorations=decorations,
        new_decorations=new_decorations,
        pose=pose,
        scene=scene,
        style=style
    )

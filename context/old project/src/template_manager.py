"""Template management module for handling prompt templates."""
import json
import re
import fcntl
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional


class TemplateManager:
    """
    Manages prompt templates stored in schemes/system/ (read-only) and schemes/user/ (read-write) directories.

    Templates are JSON files with the following structure:
    {
        "template_id": "template_default_v1",
        "name": "官方默认模板 v1",
        "description": "使用全部7个预定义模块...",
        "is_default": true,
        "template": "人物:{{@module:character}}\\n\\n姿态:{{@module:pose}}..."
    }
    """

    # Security constants
    TEMPLATE_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,64}$')
    MAX_TEMPLATE_SIZE = 1 * 1024 * 1024  # 1MB
    SYSTEM_TEMPLATE_IDS = frozenset(['template_default_v1', 'template_simple_v1'])

    def __init__(self, system_dir: Optional[Path] = None, user_dir: Optional[Path] = None):
        """
        Initialize the TemplateManager.

        Args:
            system_dir: Path to system templates directory. Defaults to 'schemes/system'.
            user_dir: Path to user templates directory. Defaults to 'schemes/user'.
        """
        base_dir = Path(__file__).parent.parent / 'schemes'

        self.system_dir = Path(system_dir) if system_dir else base_dir / 'system'
        self.user_dir = Path(user_dir) if user_dir else base_dir / 'user'

        # For backward compatibility
        self.templates_dir = self.system_dir

        # Ensure user directory exists
        self.user_dir.mkdir(parents=True, exist_ok=True)

        self._cache: Dict[str, Dict] = {}  # Template cache {template_id: template_data}

    def list_templates(self) -> List[Dict]:
        """
        List all available templates from both system and user directories.

        Returns:
            List of template metadata dictionaries:
            [
                {
                    "id": "template_default_v1",
                    "name": "官方默认模板 v1",
                    "description": "使用全部7个预定义模块...",
                    "is_default": True,
                    "is_system": True
                },
                ...
            ]
        """
        templates = []

        # Load system templates
        if self.system_dir.exists():
            for template_file in self.system_dir.glob('*.json'):
                try:
                    with open(template_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                        # Support both scheme_id (old) and template_id (new) for backward compatibility
                        template_id = data.get('template_id') or data.get('scheme_id')

                        # Only include valid template files
                        if template_id and 'template' in data:
                            templates.append({
                                'id': template_id,
                                'name': data.get('name', template_id),
                                'description': data.get('description', ''),
                                'is_default': data.get('is_default', False),
                                'is_system': True
                            })
                except (json.JSONDecodeError, IOError) as e:
                    print(f"Warning: Failed to load system template {template_file}: {e}")
                    continue

        # Load user templates
        if self.user_dir.exists():
            for template_file in self.user_dir.glob('*.json'):
                try:
                    with open(template_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)

                        template_id = data.get('template_id')

                        # Only include valid template files
                        if template_id and 'template' in data:
                            templates.append({
                                'id': template_id,
                                'name': data.get('name', template_id),
                                'description': data.get('description', ''),
                                'is_default': False,
                                'is_system': False
                            })
                except (json.JSONDecodeError, IOError) as e:
                    print(f"Warning: Failed to load user template {template_file}: {e}")
                    continue

        # Sort: system templates first (default first), then user templates
        templates.sort(key=lambda t: (not t['is_system'], not t['is_default'], t['name']))

        return templates

    def get_template(self, template_id: str) -> Dict:
        """
        Get a specific template by ID from either system or user directory.

        Args:
            template_id: Template identifier (e.g., 'template_default_v1')

        Returns:
            Complete template dictionary:
            {
                "template_id": "template_default_v1",
                "name": "官方默认模板 v1",
                "description": "...",
                "is_default": True,
                "template": "人物:{{@module:character}}..."
            }

        Raises:
            FileNotFoundError: If template not found
        """
        # Check cache first
        if template_id in self._cache:
            return self._cache[template_id]

        # Try user directory first, then system directory
        template_file = None
        for directory in [self.user_dir, self.system_dir]:
            candidate = directory / f"{template_id}.json"
            if candidate.exists():
                template_file = candidate
                break

        if template_file is None:
            raise FileNotFoundError(f"Template not found: {template_id}")

        try:
            with open(template_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

                # Support both scheme_id (old) and template_id (new) for backward compatibility
                actual_id = data.get('template_id') or data.get('scheme_id')

                # Validate required fields
                if not actual_id or 'template' not in data:
                    raise ValueError(f"Invalid template file: {template_id}")

                # Cache the template
                self._cache[template_id] = data

                return data
        except (json.JSONDecodeError, IOError) as e:
            raise IOError(f"Failed to load template {template_id}: {e}")

    def get_default_template_id(self) -> str:
        """
        Get the default template ID.

        Returns:
            'template_default_v1'
        """
        return 'template_default_v1'

    def get_template_content(self, template_id: str) -> str:
        """
        Get the template string content only.

        Args:
            template_id: Template identifier

        Returns:
            Template string (e.g., "人物:{{@module:character}}...")
        """
        template_data = self.get_template(template_id)
        return template_data['template']

    def clear_cache(self):
        """Clear the template cache. Useful for testing or reloading templates."""
        self._cache.clear()

    def template_exists(self, template_id: str) -> bool:
        """
        Check if a template exists in either system or user directory.

        Args:
            template_id: Template identifier

        Returns:
            True if template exists, False otherwise
        """
        # Check both directories
        for directory in [self.user_dir, self.system_dir]:
            if (directory / f"{template_id}.json").exists():
                return True
        return False

    # ============================================================
    # CRUD Operations (User Templates Only)
    # ============================================================

    def generate_template_id(self) -> str:
        """
        Generate a unique template ID for user templates.

        Returns:
            Unique template ID in format: user_template_YYYYMMDD_NNN
            Example: user_template_20251112_001
        """
        today = datetime.now().strftime('%Y%m%d')
        prefix = f"user_template_{today}_"

        # Find existing templates with same date prefix
        existing_numbers = []
        for template_file in self.user_dir.glob(f"{prefix}*.json"):
            try:
                # Extract number from filename like "user_template_20251112_001.json"
                number_part = template_file.stem.split('_')[-1]
                if number_part.isdigit():
                    existing_numbers.append(int(number_part))
            except (IndexError, ValueError):
                continue

        # Generate next number
        next_number = max(existing_numbers, default=0) + 1

        return f"{prefix}{next_number:03d}"

    def _validate_template_id(self, template_id: str) -> None:
        """
        Validate template ID for security.

        Args:
            template_id: Template ID to validate

        Raises:
            ValueError: If template ID is invalid or contains dangerous characters
        """
        # Check format (alphanumeric, underscore, dash only)
        if not self.TEMPLATE_ID_PATTERN.match(template_id):
            raise ValueError(
                f"Invalid template_id format: '{template_id}'. "
                f"Must be 3-64 characters, alphanumeric + underscore/dash only. "
                f"Examples: 'template_custom_001', 'user_template_20251112_001'"
            )

        # Check for path traversal attempts
        if '..' in template_id or '/' in template_id or '\\' in template_id:
            raise ValueError(
                f"Invalid template_id: '{template_id}'. "
                f"Path traversal characters (.., /, \\) are not allowed."
            )

    def _validate_template_data(self, data: Dict) -> None:
        """
        Validate template data structure.

        Args:
            data: Template data dictionary

        Raises:
            ValueError: If template data is invalid
        """
        # Check required fields
        required_fields = ['template_id', 'name', 'template']
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            raise ValueError(
                f"Missing required fields: {', '.join(missing_fields)}. "
                f"Required: {required_fields}"
            )

        # Check template size
        template_content = data['template']
        if len(template_content) > self.MAX_TEMPLATE_SIZE:
            raise ValueError(
                f"Template too large: {len(template_content)} bytes. "
                f"Maximum allowed: {self.MAX_TEMPLATE_SIZE} bytes (1MB)"
            )

    def save_template(self, name: str, description: str, template: str) -> str:
        """
        Create a new user template.

        Args:
            name: Template display name
            description: Template description (optional)
            template: Template content string

        Returns:
            Generated template_id

        Raises:
            ValueError: If validation fails
            OSError: If file operation fails
        """
        # Generate unique ID
        template_id = self.generate_template_id()

        # Validate ID and data
        self._validate_template_id(template_id)

        # Build template data
        now = datetime.utcnow().isoformat() + 'Z'
        data = {
            'template_id': template_id,
            'name': name,
            'description': description or '',
            'is_default': False,
            'created_at': now,
            'updated_at': now,
            'template': template
        }

        # Validate data
        self._validate_template_data(data)

        # Save to user directory
        file_path = self.user_dir / f"{template_id}.json"

        try:
            # Write to file with file lock to prevent concurrent writes
            with open(file_path, 'w', encoding='utf-8') as f:
                try:
                    fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                    json.dump(data, f, ensure_ascii=False, indent=2)
                    f.flush()
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)

        except OSError as e:
            # Clean up on failure
            if file_path.exists():
                file_path.unlink()
            raise OSError(f"Failed to save template: {e}")

        # Clear cache to ensure fresh data
        self._cache.pop(template_id, None)

        return template_id

    def update_template(self, template_id: str, name: Optional[str] = None,
                       description: Optional[str] = None, template: Optional[str] = None) -> None:
        """
        Update an existing user template.

        Args:
            template_id: Template ID to update
            name: New template name (optional)
            description: New description (optional)
            template: New template content (optional)

        Raises:
            FileNotFoundError: If template not found
            PermissionError: If trying to modify system template
            ValueError: If validation fails
        """
        # Validate ID
        self._validate_template_id(template_id)

        # Check if it's a system template (read-only)
        system_file = self.system_dir / f"{template_id}.json"
        user_file = self.user_dir / f"{template_id}.json"

        if system_file.exists() and not user_file.exists():
            raise PermissionError(
                f"Cannot modify system template: {template_id}. "
                f"System templates are read-only."
            )

        if not user_file.exists():
            raise FileNotFoundError(f"User template not found: {template_id}")

        # Load existing data
        with open(user_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Update fields (only if provided)
        if name is not None:
            data['name'] = name
        if description is not None:
            data['description'] = description
        if template is not None:
            data['template'] = template

        # Update timestamp
        data['updated_at'] = datetime.utcnow().isoformat() + 'Z'

        # Validate updated data
        self._validate_template_data(data)

        # Save back to file
        with open(user_file, 'w', encoding='utf-8') as f:
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                json.dump(data, f, ensure_ascii=False, indent=2)
                f.flush()
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

        # Clear cache
        self._cache.pop(template_id, None)

    def delete_template(self, template_id: str) -> None:
        """
        Delete a user template.

        Args:
            template_id: Template ID to delete

        Raises:
            FileNotFoundError: If template not found
            PermissionError: If trying to delete system template
        """
        # Validate ID
        self._validate_template_id(template_id)

        # Check if it's a system template (cannot delete)
        if template_id in self.SYSTEM_TEMPLATE_IDS:
            raise PermissionError(
                f"Cannot delete system template: {template_id}. "
                f"System templates are protected."
            )

        system_file = self.system_dir / f"{template_id}.json"
        if system_file.exists():
            raise PermissionError(
                f"Cannot delete system template: {template_id}"
            )

        # Try to delete from user directory
        user_file = self.user_dir / f"{template_id}.json"
        if not user_file.exists():
            raise FileNotFoundError(f"User template not found: {template_id}")

        # Delete file
        user_file.unlink()

        # Clear cache
        self._cache.pop(template_id, None)


# Module-level singletons for convenient access (separate instances for main and diff)
_manager_instances: Dict[str, Optional[TemplateManager]] = {
    'main': None,
    'diff': None
}


def get_template_manager(template_type: str = 'main') -> TemplateManager:
    """
    Get the singleton TemplateManager instance for the specified template type.

    Args:
        template_type: Type of templates ('main' or 'diff'). Defaults to 'main'.

    Returns:
        TemplateManager instance configured for the specified template type.

    Raises:
        ValueError: If template_type is not 'main' or 'diff'.
    """
    if template_type not in ['main', 'diff']:
        raise ValueError(f"Invalid template_type: {template_type}. Must be 'main' or 'diff'.")

    global _manager_instances

    if _manager_instances[template_type] is None:
        # Set up directories based on template type
        base_dir = Path(__file__).parent.parent / 'schemes'

        if template_type == 'main':
            system_dir = base_dir / 'system'
            user_dir = base_dir / 'user'
        else:  # template_type == 'diff'
            system_dir = base_dir / 'system_diff'
            user_dir = base_dir / 'user_diff'

        _manager_instances[template_type] = TemplateManager(
            system_dir=system_dir,
            user_dir=user_dir
        )

    return _manager_instances[template_type]

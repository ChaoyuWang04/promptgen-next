"""
Library Configuration Manager

Safely manipulates config/library_config.py using Python AST (Abstract Syntax Tree).
This ensures we don't break Python syntax when adding/modifying/removing library configurations.

Features:
- Add new library configurations
- Update existing library metadata
- Remove library configurations
- Automatic backup before modifications
- Syntax validation after changes
- Rollback on errors

Author: Phase 4 Implementation
Date: 2025-11-14
"""

import ast
import shutil
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Union
from datetime import datetime
import json


class LibraryConfigManager:
    """Manages library_config.py modifications using AST manipulation."""

    def __init__(self, config_file_path: Optional[Path] = None):
        """
        Initialize the config manager.

        Args:
            config_file_path: Path to library_config.py (defaults to config/library_config.py)
        """
        if config_file_path is None:
            # Default to project root's config/library_config.py
            project_root = Path(__file__).parent.parent
            config_file_path = project_root / 'config' / 'library_config.py'

        self.config_file = Path(config_file_path)

        if not self.config_file.exists():
            raise FileNotFoundError(f"Config file not found: {self.config_file}")

    def add_library_config(self, library_name: str, config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Add a new library configuration to library_config.py.

        Args:
            library_name: Name of the library (e.g., 'weather')
            config: Configuration dictionary containing:
                - path: str (JSON file path relative to data/)
                - type: str ('main' or 'diff')
                - required: bool
                - display_name: str
                - display_field: str
                - description: str (optional)
                - order: int
                - structure_type: str ('standard' or 'nested_array')
                - schema: Dict (JSON Schema)

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        try:
            # Step 1: Create backup
            backup_path = self._create_backup()

            # Step 2: Read current config file
            with open(self.config_file, 'r', encoding='utf-8') as f:
                source_code = f.read()

            # Step 3: Parse to AST
            try:
                tree = ast.parse(source_code)
            except SyntaxError as e:
                return False, f"Config file has syntax errors: {str(e)}"

            # Step 4: Find LIBRARY_CONFIG assignment
            config_node = self._find_library_config_node(tree)
            if config_node is None:
                return False, "Could not find LIBRARY_CONFIG in config file"

            # Step 5: Check if library already exists
            if self._library_exists_in_dict(config_node.value, library_name):
                return False, f"Library '{library_name}' already exists in configuration"

            # Step 6: Create new config entry as AST node
            new_entry_node = self._create_config_entry_ast(library_name, config)

            # Step 7: Add to LIBRARY_CONFIG dict
            if isinstance(config_node.value, ast.Dict):
                config_node.value.keys.append(ast.Constant(value=library_name))
                config_node.value.values.append(new_entry_node)
            else:
                return False, "LIBRARY_CONFIG is not a dictionary"

            # Step 8: Convert AST back to source code
            new_source = ast.unparse(tree)

            # Step 9: Validate by parsing again
            try:
                ast.parse(new_source)
            except SyntaxError as e:
                # Rollback
                self._rollback_from_backup(backup_path)
                return False, f"Generated code has syntax errors: {str(e)}"

            # Step 10: Write to file
            with open(self.config_file, 'w', encoding='utf-8') as f:
                f.write(new_source)

            return True, None

        except Exception as e:
            # Rollback on any error
            if 'backup_path' in locals():
                self._rollback_from_backup(backup_path)
            return False, f"Unexpected error: {str(e)}"

    def update_library_config(self, library_name: str, updates: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Update an existing library configuration.

        Args:
            library_name: Name of the library to update
            updates: Dictionary of fields to update (e.g., {'display_name': '新名称', 'order': 7})

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        try:
            # Step 1: Create backup
            backup_path = self._create_backup()

            # Step 2: Read and parse
            with open(self.config_file, 'r', encoding='utf-8') as f:
                source_code = f.read()

            tree = ast.parse(source_code)

            # Step 3: Find LIBRARY_CONFIG
            config_node = self._find_library_config_node(tree)
            if config_node is None:
                return False, "Could not find LIBRARY_CONFIG"

            # Step 4: Find the library's config dict
            library_dict_node = self._find_library_in_dict(config_node.value, library_name)
            if library_dict_node is None:
                return False, f"Library '{library_name}' not found in configuration"

            # Step 5: Update fields in the dict
            self._update_dict_fields(library_dict_node, updates)

            # Step 6: Convert back to source
            new_source = ast.unparse(tree)

            # Step 7: Validate
            try:
                ast.parse(new_source)
            except SyntaxError as e:
                self._rollback_from_backup(backup_path)
                return False, f"Generated code has syntax errors: {str(e)}"

            # Step 8: Write
            with open(self.config_file, 'w', encoding='utf-8') as f:
                f.write(new_source)

            return True, None

        except Exception as e:
            if 'backup_path' in locals():
                self._rollback_from_backup(backup_path)
            return False, f"Unexpected error: {str(e)}"

    def remove_library_config(self, library_name: str) -> Tuple[bool, Optional[str]]:
        """
        Remove a library configuration from library_config.py.

        Args:
            library_name: Name of the library to remove

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        try:
            # Step 1: Create backup
            backup_path = self._create_backup()

            # Step 2: Read and parse
            with open(self.config_file, 'r', encoding='utf-8') as f:
                source_code = f.read()

            tree = ast.parse(source_code)

            # Step 3: Find LIBRARY_CONFIG
            config_node = self._find_library_config_node(tree)
            if config_node is None:
                return False, "Could not find LIBRARY_CONFIG"

            # Step 4: Find and remove the library entry
            if isinstance(config_node.value, ast.Dict):
                keys = config_node.value.keys
                values = config_node.value.values

                # Find index of the library
                index_to_remove = None
                for i, key in enumerate(keys):
                    if isinstance(key, ast.Constant) and key.value == library_name:
                        index_to_remove = i
                        break

                if index_to_remove is None:
                    return False, f"Library '{library_name}' not found in configuration"

                # Remove the key-value pair
                keys.pop(index_to_remove)
                values.pop(index_to_remove)
            else:
                return False, "LIBRARY_CONFIG is not a dictionary"

            # Step 5: Convert back to source
            new_source = ast.unparse(tree)

            # Step 6: Validate
            try:
                ast.parse(new_source)
            except SyntaxError as e:
                self._rollback_from_backup(backup_path)
                return False, f"Generated code has syntax errors: {str(e)}"

            # Step 7: Write
            with open(self.config_file, 'w', encoding='utf-8') as f:
                f.write(new_source)

            return True, None

        except Exception as e:
            if 'backup_path' in locals():
                self._rollback_from_backup(backup_path)
            return False, f"Unexpected error: {str(e)}"

    def validate_config_structure(self, config: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate that a config dictionary has all required fields.

        Args:
            config: Configuration dictionary to validate

        Returns:
            Tuple of (is_valid: bool, errors: List[str])
        """
        errors = []

        required_fields = [
            'path', 'type', 'required', 'display_name',
            'display_field', 'order', 'structure_type', 'schema'
        ]

        for field in required_fields:
            if field not in config:
                errors.append(f"Missing required field: {field}")

        # Validate field types
        if 'path' in config and not isinstance(config['path'], str):
            errors.append("Field 'path' must be a string")

        if 'type' in config and config['type'] not in ['main', 'diff']:
            errors.append("Field 'type' must be 'main' or 'diff'")

        if 'required' in config and not isinstance(config['required'], bool):
            errors.append("Field 'required' must be a boolean")

        if 'order' in config and not isinstance(config['order'], int):
            errors.append("Field 'order' must be an integer")

        if 'structure_type' in config and config['structure_type'] not in ['standard', 'nested_array']:
            errors.append("Field 'structure_type' must be 'standard' or 'nested_array'")

        if 'schema' in config and not isinstance(config['schema'], dict):
            errors.append("Field 'schema' must be a dictionary (JSON Schema)")

        return len(errors) == 0, errors

    def get_library_names(self) -> List[str]:
        """
        Get list of all library names currently in the config.

        Returns:
            List of library names
        """
        with open(self.config_file, 'r', encoding='utf-8') as f:
            source_code = f.read()

        tree = ast.parse(source_code)
        config_node = self._find_library_config_node(tree)

        if config_node is None or not isinstance(config_node.value, ast.Dict):
            return []

        library_names = []
        for key in config_node.value.keys:
            if isinstance(key, ast.Constant):
                library_names.append(key.value)

        return library_names

    # ========== Private Helper Methods ==========

    def _create_backup(self) -> Path:
        """Create a timestamped backup of the config file."""
        backup_dir = self.config_file.parent.parent / 'backups'
        backup_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"library_config_{timestamp}.bak"
        backup_path = backup_dir / backup_filename

        shutil.copy2(self.config_file, backup_path)

        return backup_path

    def _rollback_from_backup(self, backup_path: Path) -> None:
        """Restore config file from backup."""
        if backup_path.exists():
            shutil.copy2(backup_path, self.config_file)

    def _find_library_config_node(self, tree: ast.Module) -> Optional[Union[ast.Assign, ast.AnnAssign]]:
        """Find the LIBRARY_CONFIG assignment node in the AST.

        Supports both simple assignments (ast.Assign) and type-annotated
        assignments (ast.AnnAssign) like: LIBRARY_CONFIG: Dict[str, Dict] = {...}
        """
        for node in ast.walk(tree):
            # Check for simple assignment: LIBRARY_CONFIG = {...}
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == 'LIBRARY_CONFIG':
                        return node
            # Check for annotated assignment: LIBRARY_CONFIG: Type = {...}
            elif isinstance(node, ast.AnnAssign):
                if isinstance(node.target, ast.Name) and node.target.id == 'LIBRARY_CONFIG':
                    return node
        return None

    def _library_exists_in_dict(self, dict_node: ast.Dict, library_name: str) -> bool:
        """Check if a library name already exists in the config dict."""
        for key in dict_node.keys:
            if isinstance(key, ast.Constant) and key.value == library_name:
                return True
        return False

    def _find_library_in_dict(self, dict_node: ast.Dict, library_name: str) -> Optional[ast.Dict]:
        """Find a library's configuration dict node."""
        for i, key in enumerate(dict_node.keys):
            if isinstance(key, ast.Constant) and key.value == library_name:
                return dict_node.values[i]
        return None

    def _create_config_entry_ast(self, library_name: str, config: Dict[str, Any]) -> ast.Dict:
        """
        Create an AST Dict node for a library configuration.

        This converts a Python dict into an AST representation.
        """
        keys = []
        values = []

        for key, value in config.items():
            keys.append(ast.Constant(value=key))
            values.append(self._python_to_ast(value))

        return ast.Dict(keys=keys, values=values)

    def _python_to_ast(self, value: Any) -> ast.expr:
        """
        Convert a Python value to an AST expression node.

        Handles: str, int, bool, dict, list, None
        """
        if value is None:
            return ast.Constant(value=None)
        elif isinstance(value, (str, int, float, bool)):
            return ast.Constant(value=value)
        elif isinstance(value, dict):
            keys = [ast.Constant(value=k) for k in value.keys()]
            values = [self._python_to_ast(v) for v in value.values()]
            return ast.Dict(keys=keys, values=values)
        elif isinstance(value, list):
            elts = [self._python_to_ast(item) for item in value]
            return ast.List(elts=elts, ctx=ast.Load())
        else:
            # Fallback: convert to string representation
            return ast.Constant(value=str(value))

    def _update_dict_fields(self, dict_node: ast.Dict, updates: Dict[str, Any]) -> None:
        """
        Update fields in an AST Dict node.

        Modifies the dict_node in place.
        """
        for update_key, update_value in updates.items():
            # Find the key in the dict
            key_index = None
            for i, key in enumerate(dict_node.keys):
                if isinstance(key, ast.Constant) and key.value == update_key:
                    key_index = i
                    break

            if key_index is not None:
                # Update existing field
                dict_node.values[key_index] = self._python_to_ast(update_value)
            else:
                # Add new field
                dict_node.keys.append(ast.Constant(value=update_key))
                dict_node.values.append(self._python_to_ast(update_value))


def validate_library_name(name: str) -> Tuple[bool, Optional[str]]:
    """
    Validate that a library name is valid.

    Rules:
    - Lowercase letters, numbers, underscores only
    - Must start with a letter
    - Length 3-20 characters
    - Not a Python keyword

    Args:
        name: Library name to validate

    Returns:
        Tuple of (is_valid: bool, error_message: Optional[str])
    """
    import keyword

    if not name:
        return False, "Library name cannot be empty"

    if len(name) < 3:
        return False, "Library name must be at least 3 characters"

    if len(name) > 20:
        return False, "Library name must be at most 20 characters"

    if not name[0].isalpha():
        return False, "Library name must start with a letter"

    if not all(c.islower() or c.isdigit() or c == '_' for c in name):
        return False, "Library name can only contain lowercase letters, numbers, and underscores"

    if keyword.iskeyword(name):
        return False, f"'{name}' is a Python keyword and cannot be used"

    # Check against reserved names
    reserved = ['library', 'config', 'settings', 'data', 'src', 'web', 'api']
    if name in reserved:
        return False, f"'{name}' is a reserved name and cannot be used"

    return True, None

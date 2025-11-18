"""
Library Dependency Scanner

Scans the system for all references to a specific library before deletion.
This ensures we can provide accurate counts and safely perform cascade deletes.

Scans:
- records/*.json - Check library_ids field
- prompts/*.txt - Parse image_id for library abbreviation
- images/* - Match image_id patterns in directory names
- combination_status.json - Count affected combinations

Author: Phase 4 Implementation
Date: 2025-11-14
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Set, Optional, Any
from collections import defaultdict


class LibraryDependencyScanner:
    """Scans for all dependencies on a specific library."""

    def __init__(self, project_root: Optional[Path] = None):
        """
        Initialize the dependency scanner.

        Args:
            project_root: Path to project root (defaults to parent of src/)
        """
        if project_root is None:
            project_root = Path(__file__).parent.parent

        self.project_root = Path(project_root)
        self.records_dir = self.project_root / 'records'
        self.prompts_dir = self.project_root / 'prompts'
        self.images_dir = self.project_root / 'images'
        self.combo_status_file = self.project_root / 'combination_status.json'

    def scan_library_references(self, library_name: str) -> Dict[str, Any]:
        """
        Scan for all references to a library across the system.

        Args:
            library_name: Name of the library (e.g., 'character', 'weather')

        Returns:
            Dictionary with structure:
            {
                'has_dependencies': bool,
                'counts': {
                    'records': int,
                    'prompts': int,
                    'images': int,
                    'combinations': int
                },
                'affected_files': {
                    'records': List[str],  # record IDs
                    'prompts': List[str],  # prompt file names
                    'images': List[str]    # image directory names
                },
                'sample_records': List[str]  # First 5 record IDs for preview
            }
        """
        result = {
            'has_dependencies': False,
            'counts': {
                'records': 0,
                'prompts': 0,
                'images': 0,
                'combinations': 0
            },
            'affected_files': {
                'records': [],
                'prompts': [],
                'images': []
            },
            'sample_records': []
        }

        # Scan records
        affected_records = self._scan_records(library_name)
        result['counts']['records'] = len(affected_records)
        result['affected_files']['records'] = affected_records
        result['sample_records'] = affected_records[:5]  # First 5 for preview

        # Scan prompts
        affected_prompts = self._scan_prompts(library_name, affected_records)
        result['counts']['prompts'] = len(affected_prompts)
        result['affected_files']['prompts'] = affected_prompts

        # Scan images
        affected_images = self._scan_images(library_name, affected_records)
        result['counts']['images'] = len(affected_images)
        result['affected_files']['images'] = affected_images

        # Scan combinations
        affected_combos = self._scan_combinations(library_name)
        result['counts']['combinations'] = affected_combos

        # Check if any dependencies exist
        result['has_dependencies'] = any([
            result['counts']['records'] > 0,
            result['counts']['prompts'] > 0,
            result['counts']['images'] > 0,
            result['counts']['combinations'] > 0
        ])

        return result

    def cascade_delete_library_data(self, library_name: str, affected_files: Dict[str, List[str]]) -> Dict[str, Any]:
        """
        Delete all data dependent on a library.

        Args:
            library_name: Name of the library to delete
            affected_files: Dictionary from scan_library_references()['affected_files']

        Returns:
            Dictionary with deletion results:
            {
                'success': bool,
                'deleted_counts': {
                    'records': int,
                    'prompts': int,
                    'images': int
                },
                'errors': List[str]
            }
        """
        result = {
            'success': True,
            'deleted_counts': {
                'records': 0,
                'prompts': 0,
                'images': 0
            },
            'errors': []
        }

        # Delete records
        for record_id in affected_files['records']:
            try:
                record_file = self.records_dir / f"{record_id}.json"
                if record_file.exists():
                    record_file.unlink()
                    result['deleted_counts']['records'] += 1
            except Exception as e:
                result['errors'].append(f"Failed to delete record {record_id}: {str(e)}")
                result['success'] = False

        # Delete prompts
        for prompt_file in affected_files['prompts']:
            try:
                prompt_path = self.prompts_dir / prompt_file
                if prompt_path.exists():
                    prompt_path.unlink()
                    result['deleted_counts']['prompts'] += 1
            except Exception as e:
                result['errors'].append(f"Failed to delete prompt {prompt_file}: {str(e)}")
                result['success'] = False

        # Delete image directories
        for image_dir in affected_files['images']:
            try:
                image_path = self.images_dir / image_dir
                if image_path.exists() and image_path.is_dir():
                    # Delete all files in the directory first
                    for file in image_path.iterdir():
                        file.unlink()
                    # Then delete the directory
                    image_path.rmdir()
                    result['deleted_counts']['images'] += 1
            except Exception as e:
                result['errors'].append(f"Failed to delete image directory {image_dir}: {str(e)}")
                result['success'] = False

        # Update combination_status.json
        try:
            self._update_combination_status(library_name)
        except Exception as e:
            result['errors'].append(f"Failed to update combination_status.json: {str(e)}")
            result['success'] = False

        return result

    # ========== Private Helper Methods ==========

    def _scan_records(self, library_name: str) -> List[str]:
        """
        Scan records directory for files that reference the library.

        Returns:
            List of record IDs (image_ids) that use this library
        """
        if not self.records_dir.exists():
            return []

        affected_records = []
        library_id_field = f"{library_name}_id"  # e.g., "character_id", "weather_id"

        for record_file in self.records_dir.glob('*.json'):
            try:
                with open(record_file, 'r', encoding='utf-8') as f:
                    record = json.load(f)

                # Check both new format (library_ids) and legacy format (character_id, pose_id, etc.)
                has_reference = False

                # Check library_ids (new format)
                if 'library_ids' in record and isinstance(record['library_ids'], dict):
                    if library_name in record['library_ids']:
                        has_reference = True

                # Check legacy format
                if library_id_field in record:
                    has_reference = True

                if has_reference:
                    image_id = record_file.stem  # filename without .json
                    affected_records.append(image_id)

            except (json.JSONDecodeError, KeyError):
                # Skip malformed files
                continue

        return affected_records

    def _scan_prompts(self, library_name: str, affected_records: List[str]) -> List[str]:
        """
        Scan prompts directory for files related to affected records.

        Args:
            library_name: Library name
            affected_records: List of image_ids from _scan_records()

        Returns:
            List of prompt filenames
        """
        if not self.prompts_dir.exists():
            return []

        affected_prompts = []

        for image_id in affected_records:
            # Each record may have main and diff prompts
            main_prompt = f"{image_id}_main.txt"
            diff_prompt = f"{image_id}_diff.txt"

            if (self.prompts_dir / main_prompt).exists():
                affected_prompts.append(main_prompt)

            if (self.prompts_dir / diff_prompt).exists():
                affected_prompts.append(diff_prompt)

        return affected_prompts

    def _scan_images(self, library_name: str, affected_records: List[str]) -> List[str]:
        """
        Scan images directory for directories related to affected records.

        Args:
            library_name: Library name
            affected_records: List of image_ids from _scan_records()

        Returns:
            List of image directory names
        """
        if not self.images_dir.exists():
            return []

        affected_images = []

        for image_id in affected_records:
            image_dir = self.images_dir / image_id
            if image_dir.exists() and image_dir.is_dir():
                affected_images.append(image_id)

        return affected_images

    def _scan_combinations(self, library_name: str) -> int:
        """
        Scan combination_status.json to count affected combinations.

        Args:
            library_name: Library name

        Returns:
            Count of combinations that use this library
        """
        if not self.combo_status_file.exists():
            return 0

        try:
            with open(self.combo_status_file, 'r', encoding='utf-8') as f:
                combo_status = json.load(f)

            affected_count = 0
            library_id_field = f"{library_name}_id"

            for combo_key, combo_data in combo_status.items():
                # Check if combination references this library
                if library_id_field in combo_data:
                    affected_count += 1

            return affected_count

        except (json.JSONDecodeError, KeyError):
            return 0

    def _update_combination_status(self, library_name: str) -> None:
        """
        Remove combinations that reference the deleted library from combination_status.json.

        Args:
            library_name: Library name
        """
        if not self.combo_status_file.exists():
            return

        with open(self.combo_status_file, 'r', encoding='utf-8') as f:
            combo_status = json.load(f)

        library_id_field = f"{library_name}_id"

        # Filter out combinations that use this library
        updated_combo_status = {
            combo_key: combo_data
            for combo_key, combo_data in combo_status.items()
            if library_id_field not in combo_data
        }

        # Write back to file
        with open(self.combo_status_file, 'w', encoding='utf-8') as f:
            json.dump(updated_combo_status, f, indent=2, ensure_ascii=False)


def get_library_usage_summary(project_root: Optional[Path] = None) -> Dict[str, Dict[str, int]]:
    """
    Get a summary of how many records use each library.

    Useful for understanding library usage before deletion.

    Args:
        project_root: Path to project root

    Returns:
        Dictionary mapping library_name -> {'records': count, 'prompts': count, 'images': count}
    """
    scanner = LibraryDependencyScanner(project_root)

    # Load all libraries from config
    try:
        from config.library_config import LIBRARY_CONFIG
        library_names = list(LIBRARY_CONFIG.keys())
    except ImportError:
        # Fallback: scan common library names
        library_names = ['character', 'pose', 'scene', 'theme', 'style', 'decorative_props']

    usage_summary = {}

    for lib_name in library_names:
        result = scanner.scan_library_references(lib_name)
        usage_summary[lib_name] = {
            'records': result['counts']['records'],
            'prompts': result['counts']['prompts'],
            'images': result['counts']['images'],
            'combinations': result['counts']['combinations']
        }

    return usage_summary

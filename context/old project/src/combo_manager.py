"""Combination manager - enumerate and track all possible library combinations."""
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Set, Optional
from itertools import product  # Phase 2: Dynamic enumeration support
from src.data_loader import load_all_libraries, load_library


class CombinationManager:
    """Manages all possible library combinations and their generation status."""

    def __init__(self, status_file: str = 'records/combination_status.json'):
        """
        Initialize combination manager.

        Args:
            status_file: Path to combination status JSON file
        """
        self.status_file = Path(status_file)
        self.status_data = self._load_status()

    def _load_status(self) -> Dict:
        """Load combination status from file."""
        if self.status_file.exists():
            with open(self.status_file, 'r', encoding='utf-8') as f:
                return json.load(f)

        # Initialize empty status
        return {
            'combinations': {},  # combo_key -> status data
            'stats': {
                'total': 0,
                'generated': 0,
                'pending': 0,
                'failed': 0
            },
            'last_sync': None
        }

    def _save_status(self):
        """Save status to file."""
        # Ensure records directory exists
        self.status_file.parent.mkdir(parents=True, exist_ok=True)

        with open(self.status_file, 'w', encoding='utf-8') as f:
            json.dump(self.status_data, f, ensure_ascii=False, indent=2)

    def enumerate_all_combinations(self) -> List[Dict]:
        """
        Enumerate all possible library combinations.

        Phase 2: Now uses dynamic enumeration with itertools.product()
        instead of hardcoded 5-layer nested loops.

        Returns:
            List of combination dictionaries, with keys like:
            - character_id (for backward compatibility)
            - pose_id
            - scene_id
            - theme_id
            - style_id
            OR dynamically based on library_config

        Examples:
            >>> manager = CombinationManager()
            >>> combos = manager.enumerate_all_combinations()
            >>> len(combos)  # With current 5 libraries
            54
        """
        from config.library_config import get_required_libraries

        # Get required libraries in order
        required_libs = get_required_libraries()

        # Load all libraries and get their IDs
        lib_ids = {}
        for lib_name in required_libs:
            lib_data = load_library(lib_name)
            lib_ids[lib_name] = list(lib_data.keys())

        # Use itertools.product() for dynamic Cartesian product
        # This replaces the hardcoded 5-layer nested loops
        combinations = []
        for combo_values in product(*[lib_ids[lib] for lib in required_libs]):
            # Build combination dictionary with dynamic keys
            combo = {}
            for lib_name, lib_id in zip(required_libs, combo_values):
                # Use legacy key format for backward compatibility
                combo[f'{lib_name}_id'] = lib_id

            combinations.append(combo)

        return combinations

    def enumerate_combinations_with_filter(self, library_filter: Optional[Dict] = None) -> List[Dict]:
        """
        Enumerate combinations with optional library filtering.

        Phase 2: Now uses dynamic enumeration with itertools.product()
        and supports any number of libraries dynamically.

        This method supports selective generation to save API tokens by allowing
        users to specify which library items to include. For any library not specified
        or set to None, all items from that library will be used.

        Args:
            library_filter: Optional dictionary with library filters:
                {
                    'character_ids': ['char_betty_v1', 'char_wilma_v1'] or None,
                    'pose_ids': None,  # None means use all poses
                    'scene_ids': ['scene_living_sofa_v1'],
                    'theme_ids': None,
                    'style_ids': ['style_retro1950_flat_v1']
                }

        Returns:
            List of filtered combination dictionaries, each containing:
            - character_id (backward compatible key format)
            - pose_id
            - scene_id
            - theme_id
            - style_id
            OR dynamically based on library_config

        Examples:
            >>> # Generate only Wilma in Halloween theme
            >>> filter = {'character_ids': ['char_wilma_v1'], 'theme_ids': ['theme_halloween_v1']}
            >>> combos = manager.enumerate_combinations_with_filter(filter)
            >>> # Result: Wilma × all_poses × all_scenes × Halloween × all_styles

            >>> # No filter = all combinations
            >>> combos = manager.enumerate_combinations_with_filter(None)
        """
        from config.library_config import get_required_libraries

        # Get required libraries in order
        required_libs = get_required_libraries()

        # Build candidate IDs for each library (with filtering)
        lib_ids = {}
        for lib_name in required_libs:
            filter_key = f'{lib_name}_ids'

            if library_filter and filter_key in library_filter and library_filter[filter_key]:
                # Use filtered IDs
                lib_ids[lib_name] = library_filter[filter_key]
            else:
                # Use all IDs from the library
                lib_data = load_library(lib_name)
                lib_ids[lib_name] = list(lib_data.keys())

        # Use itertools.product() for dynamic Cartesian product
        # This replaces the hardcoded 5-layer nested loops
        combinations = []
        for combo_values in product(*[lib_ids[lib] for lib in required_libs]):
            # Build combination dictionary with dynamic keys
            combo = {}
            for lib_name, lib_id in zip(required_libs, combo_values):
                # Use legacy key format for backward compatibility
                combo[f'{lib_name}_id'] = lib_id

            combinations.append(combo)

        return combinations

    def get_combo_key(self, combo: Dict) -> str:
        """
        Generate unique key for combination.

        Phase 2: Now dynamically builds key based on library_config order
        instead of hardcoded 5 library sequence.

        Args:
            combo: Combination dictionary with keys like 'character_id', 'pose_id', etc.

        Returns:
            Unique key string (e.g., "char_betty_v1|pose_turn_back_smile_v1|...")

        Examples:
            >>> combo = {
            ...     'character_id': 'char_betty_v1',
            ...     'pose_id': 'pose_turn_back_smile_v1',
            ...     'scene_id': 'scene_living_sofa_v1',
            ...     'theme_id': 'theme_halloween_v1',
            ...     'style_id': 'style_retro1950_flat_v1'
            ... }
            >>> manager.get_combo_key(combo)
            'char_betty_v1|pose_turn_back_smile_v1|scene_living_sofa_v1|theme_halloween_v1|style_retro1950_flat_v1'
        """
        from config.library_config import get_required_libraries

        # Get required libraries in correct order
        required_libs = get_required_libraries()

        # Build key by joining library IDs in order
        parts = []
        for lib_name in required_libs:
            key = f'{lib_name}_id'
            if key in combo:
                parts.append(combo[key])
            else:
                # Fallback: try without '_id' suffix for compatibility
                parts.append(combo.get(lib_name, ''))

        return '|'.join(parts)

    def sync_combinations(self) -> Dict:
        """
        Sync status with current library state.
        Identifies new combinations that haven't been generated yet.

        Returns:
            Dictionary containing:
            - total: Total number of possible combinations
            - new_count: Number of new combinations found
            - new_combinations: List of new combination dicts
            - stats: Updated statistics
        """
        all_combos = self.enumerate_all_combinations()
        existing_keys = set(self.status_data['combinations'].keys())

        new_combos = []
        for combo in all_combos:
            key = self.get_combo_key(combo)
            if key not in existing_keys:
                self.status_data['combinations'][key] = {
                    'status': 'pending',
                    'combo': combo,
                    'generated_at': None,
                    'image_id': None,
                    'error': None,
                    # Status tracking
                    'prompt_generated': False,
                    'image_generated': False
                }
                new_combos.append(combo)

        # Update stats and timestamp
        self._update_stats()
        self.status_data['last_sync'] = datetime.now().isoformat()
        self._save_status()

        return {
            'total': len(all_combos),
            'new_count': len(new_combos),
            'new_combinations': new_combos,
            'stats': self.status_data['stats']
        }

    def get_pending_combinations(self) -> List[Dict]:
        """
        Get all pending combinations.

        Returns:
            List of pending combination dictionaries
        """
        pending = []
        for key, data in self.status_data['combinations'].items():
            if data['status'] == 'pending':
                pending.append(data['combo'])
        return pending

    def get_generated_combinations(self) -> List[Dict]:
        """
        Get all generated combinations.

        Returns:
            List of generated combination dictionaries with image_id
        """
        generated = []
        for key, data in self.status_data['combinations'].items():
            if data['status'] == 'generated':
                generated.append({
                    'combo': data['combo'],
                    'image_id': data['image_id'],
                    'generated_at': data['generated_at']
                })
        return generated

    def mark_as_generated(self, combo: Dict, image_id: str):
        """
        Mark combination as generated.

        Args:
            combo: Combination dictionary
            image_id: Generated image ID
        """
        key = self.get_combo_key(combo)
        if key in self.status_data['combinations']:
            self.status_data['combinations'][key]['status'] = 'generated'
            self.status_data['combinations'][key]['image_id'] = image_id
            self.status_data['combinations'][key]['generated_at'] = datetime.now().isoformat()
            self.status_data['combinations'][key]['error'] = None
            self._update_stats()
            self._save_status()

    def mark_as_failed(self, combo: Dict, error: str):
        """
        Mark combination as failed.

        Args:
            combo: Combination dictionary
            error: Error message
        """
        key = self.get_combo_key(combo)
        if key in self.status_data['combinations']:
            self.status_data['combinations'][key]['status'] = 'failed'
            self.status_data['combinations'][key]['error'] = error
            self._update_stats()
            self._save_status()

    def _update_stats(self):
        """Update statistics based on current combinations."""
        stats = {'total': 0, 'generated': 0, 'pending': 0, 'failed': 0}

        for data in self.status_data['combinations'].values():
            stats['total'] += 1
            stats[data['status']] += 1

        self.status_data['stats'] = stats

    def get_stats(self) -> Dict:
        """
        Get current statistics.

        Returns:
            Statistics dictionary
        """
        return self.status_data['stats']

    def reset_failed(self):
        """Reset all failed combinations to pending."""
        count = 0
        for key, data in self.status_data['combinations'].items():
            if data['status'] == 'failed':
                data['status'] = 'pending'
                data['error'] = None
                count += 1

        self._update_stats()
        self._save_status()
        return count

    def update_prompt_status(self, combo: Dict, generated: bool = True):
        """
        Update prompt generation status for a combination.

        Args:
            combo: Combination dictionary
            generated: Whether prompt has been generated
        """
        key = self.get_combo_key(combo)
        if key in self.status_data['combinations']:
            self.status_data['combinations'][key]['prompt_generated'] = generated
            self._save_status()

    def update_image_status(self, combo: Dict, generated: bool = True):
        """
        Update image generation status for a combination.

        Args:
            combo: Combination dictionary
            generated: Whether image has been generated
        """
        key = self.get_combo_key(combo)
        if key in self.status_data['combinations']:
            self.status_data['combinations'][key]['image_generated'] = generated
            self._save_status()

    def get_combinations_by_status(self, prompt_generated: bool = None,
                                   image_generated: bool = None) -> List[Dict]:
        """
        Get combinations filtered by status.

        Args:
            prompt_generated: Filter by prompt status (None = no filter)
            image_generated: Filter by image status (None = no filter)

        Returns:
            List of matching combination dictionaries with full data
        """
        matching = []
        for key, data in self.status_data['combinations'].items():
            # Check prompt status filter
            if prompt_generated is not None:
                if data.get('prompt_generated', False) != prompt_generated:
                    continue

            # Check image status filter
            if image_generated is not None:
                if data.get('image_generated', False) != image_generated:
                    continue

            matching.append({
                'key': key,
                'combo': data['combo'],
                'status': data['status'],
                'prompt_generated': data.get('prompt_generated', False),
                'image_generated': data.get('image_generated', False),
                'image_id': data.get('image_id'),
                'generated_at': data.get('generated_at'),
                'error': data.get('error')
            })

        return matching


if __name__ == "__main__":
    # Test combination manager
    print("Testing Combination Manager...")

    manager = CombinationManager()

    # Sync combinations
    print("\nSyncing combinations with library...")
    result = manager.sync_combinations()
    print(f"Total combinations: {result['total']}")
    print(f"New combinations found: {result['new_count']}")
    print(f"Statistics: {result['stats']}")

    # Get pending combinations
    pending = manager.get_pending_combinations()
    print(f"\nPending combinations: {len(pending)}")
    if pending:
        print(f"First pending: {pending[0]}")

    print("\n✓ Combination manager test completed")

"""Batch prompt generator - generate all pending combinations."""
import time
from pathlib import Path
from typing import Dict, Callable, Optional
from src.combo_manager import CombinationManager
from src.prompt_generator import generate_main_prompt
from src.diff_prompt_generator import generate_diff_prompt
from src.record_generator import create_and_save_record, update_prompt_status


def extract_library_ids_from_combo(combo: Dict) -> Dict[str, str]:
    """
    Phase 2: Dynamically extract library IDs from combination dictionary.

    Converts combo format {'character_id': 'xxx', 'pose_id': 'yyy', ...}
    to library_ids format {'character': 'xxx', 'pose': 'yyy', ...}

    Args:
        combo: Combination dictionary with keys like 'character_id', 'pose_id', etc.

    Returns:
        Dictionary mapping library names to IDs (without '_id' suffix)

    Example:
        >>> combo = {'character_id': 'char_betty_v1', 'pose_id': 'pose_turn_back_smile_v1'}
        >>> extract_library_ids_from_combo(combo)
        {'character': 'char_betty_v1', 'pose': 'pose_turn_back_smile_v1'}
    """
    from config.library_config import get_required_libraries

    required_libs = get_required_libraries()
    library_ids = {}

    for lib_name in required_libs:
        key = f'{lib_name}_id'
        if key in combo:
            library_ids[lib_name] = combo[key]
        else:
            raise ValueError(f"Missing required library key '{key}' in combo: {combo}")

    return library_ids


class BatchGenerator:
    """Batch generation coordinator for pending combinations."""

    def __init__(self, prompts_dir: str = 'prompts'):
        """Initialize batch generator.

        Args:
            prompts_dir: Directory to save prompt files
        """
        self.combo_manager = CombinationManager()
        self.prompts_dir = Path(prompts_dir)
        self.prompts_dir.mkdir(parents=True, exist_ok=True)

    def _save_prompt_to_file(self, image_id: str, prompt_text: str, prompt_type: str = 'main') -> str:
        """
        Save prompt text to file.

        Args:
            image_id: Image ID
            prompt_text: Prompt text to save
            prompt_type: 'main' or 'diff'

        Returns:
            Path to saved file
        """
        filename = f"{image_id}_{prompt_type}.txt"
        filepath = self.prompts_dir / filename

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(prompt_text)

        return str(filepath)

    def generate_all_pending(
        self,
        progress_callback: Optional[Callable[[int, int], None]] = None,
        delay_ms: int = 0,
        template_id: Optional[str] = None
    ) -> Dict:
        """
        Generate all pending combinations with complete prompts (main + diff).

        Args:
            progress_callback: Function(current, total) to report progress
            delay_ms: Delay between generations in milliseconds (for rate limiting)
            template_id: Optional template ID to use for all generations (defaults to system default)

        Returns:
            Dictionary containing:
            - success: Number of successful generations
            - failed: Number of failed generations
            - errors: List of error details
            - duration: Total time in seconds
        """
        pending = self.combo_manager.get_pending_combinations()
        total = len(pending)

        results = {
            'success': 0,
            'failed': 0,
            'errors': [],
            'generated_ids': []
        }

        start_time = time.time()

        for idx, combo in enumerate(pending):
            # Use generate_single() for complete generation (main + diff prompts)
            result = self.generate_single(combo, template_id=template_id)

            if result['success']:
                results['success'] += 1
                results['generated_ids'].append(result['image_id'])
            else:
                results['failed'] += 1
                results['errors'].append({
                    'combo': combo,
                    'error': result.get('error', 'Unknown error')
                })

            # Report progress
            if progress_callback:
                progress_callback(idx + 1, total)

            # Rate limiting delay
            if delay_ms > 0 and idx < total - 1:
                time.sleep(delay_ms / 1000.0)

        # Calculate duration
        results['duration'] = time.time() - start_time

        return results

    def generate_single(self, combo: Dict, template_id: Optional[str] = None) -> Dict:
        """
        Generate a single combination with main and diff prompts.

        Phase 2: Now dynamically extracts library IDs instead of hardcoding 5 parameters.

        Args:
            combo: Combination dictionary with keys like 'character_id', 'pose_id', etc.
            template_id: Optional template ID to use for generation (defaults to system default)

        Returns:
            Dictionary containing:
            - success: Boolean
            - image_id: Generated image ID (if successful)
            - prompt_main_path: Path to main prompt file
            - prompt_diff_path: Path to diff prompt file
            - error: Error message (if failed)
        """
        try:
            # Phase 2: Dynamically extract library IDs from combo
            library_ids = extract_library_ids_from_combo(combo)

            # Step 1: Generate main prompt (with optional template)
            if template_id:
                # Use template-based generation
                from prompt_generator import generate_main_prompt_with_template
                main_result = generate_main_prompt_with_template(
                    **{f'{k}_id': v for k, v in library_ids.items()},
                    template_id=template_id
                )
            else:
                # Use default generation (still uses legacy parameter names for now)
                main_result = generate_main_prompt(
                    **{f'{k}_id': v for k, v in library_ids.items()}
                )

            image_id = main_result['image_id']

            # Step 2: Save generation record (NEW: using library_ids dict)
            create_and_save_record(
                image_id=image_id,
                prompt_cn=main_result['prompt_cn'],
                character=main_result['character'],
                theme=main_result['theme'],
                selected_micro_props=main_result['selected_micro_props'],
                library_ids=library_ids  # Phase 2: NEW dynamic format
            )

            # Step 3: Save main prompt to file
            main_prompt_path = self._save_prompt_to_file(
                image_id, main_result['prompt_cn'], 'main'
            )

            # Step 4: Generate diff prompt (still uses individual IDs for now)
            # Note: diff_prompt_generator.py will be updated in a future phase if needed
            diff_result = generate_diff_prompt(
                image_id=image_id,
                pose_id=library_ids.get('pose'),
                scene_id=library_ids.get('scene'),
                style_id=library_ids.get('style')
            )

            # Step 5: Save diff prompt to file
            diff_prompt_path = self._save_prompt_to_file(
                image_id, diff_result['prompt_cn'], 'diff'
            )

            # Step 6: Update prompt generation status in record
            update_prompt_status(
                image_id=image_id,
                prompt_main_path=main_prompt_path,
                prompt_diff_path=diff_prompt_path
            )

            # Step 7: Update combination status
            self.combo_manager.mark_as_generated(combo, image_id)
            self.combo_manager.update_prompt_status(combo, generated=True)

            return {
                'success': True,
                'image_id': image_id,
                'prompt_main_path': main_prompt_path,
                'prompt_diff_path': diff_prompt_path,
                'prompt_main_cn': main_result['prompt_cn'],
                'prompt_diff_cn': diff_result['prompt_cn']
            }

        except Exception as e:
            # Mark as failed
            error_msg = str(e)
            self.combo_manager.mark_as_failed(combo, error_msg)

            return {
                'success': False,
                'error': error_msg
            }

    def retry_failed(self, progress_callback: Optional[Callable[[int, int], None]] = None) -> Dict:
        """
        Retry all failed combinations.

        Args:
            progress_callback: Function(current, total) to report progress

        Returns:
            Results dictionary similar to generate_all_pending
        """
        # Reset failed to pending
        reset_count = self.combo_manager.reset_failed()

        if reset_count == 0:
            return {
                'success': 0,
                'failed': 0,
                'errors': [],
                'generated_ids': [],
                'duration': 0,
                'message': 'No failed combinations to retry'
            }

        # Generate all pending (which now includes the reset failed ones)
        return self.generate_all_pending(progress_callback)


if __name__ == "__main__":
    # Test batch generator
    print("Testing Batch Generator...")

    generator = BatchGenerator()

    # Define progress callback
    def print_progress(current, total):
        percent = (current / total) * 100
        print(f"Progress: {current}/{total} ({percent:.1f}%)")

    # Get pending count
    pending = generator.combo_manager.get_pending_combinations()
    print(f"\nFound {len(pending)} pending combinations")

    if pending:
        print("\nGenerating all pending combinations...")
        results = generator.generate_all_pending(progress_callback=print_progress)

        print("\n=== Generation Results ===")
        print(f"Success: {results['success']}")
        print(f"Failed: {results['failed']}")
        print(f"Duration: {results['duration']:.2f}s")

        if results['errors']:
            print("\nErrors:")
            for error in results['errors'][:5]:  # Show first 5 errors
                print(f"  - {error['error']}")

    print("\n✓ Batch generator test completed")

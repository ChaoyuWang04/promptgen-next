"""Image generation module - Multi-provider image generation with automatic fallback."""
import os
import time
import json
from pathlib import Path
from typing import Dict, List, Optional, Callable
from datetime import datetime
from dotenv import load_dotenv
from PIL import Image

from src.provider_manager import ProviderManager
from src.record_generator import get_records_by_status, update_image_status
from src.combo_manager import CombinationManager
from src.stitch_generator import stitch_images

# Load environment variables
load_dotenv()


class ImageGenerator:
    """Multi-provider image generator with automatic fallback support."""

    def __init__(self, output_dir: str = None, provider_order: List[str] = None):
        """
        Initialize image generator with multi-provider support.

        Args:
            output_dir: Directory to save generated images (defaults to env IMAGE_OUTPUT_DIR)
            provider_order: Provider优先级列表 (如 ['gemini', 'openai', 'stability'])
                          如果不提供,从环境变量IMAGE_PROVIDERS读取
        """
        self.max_retries = 1  # Retry once as per requirements
        self.request_delay = int(os.getenv('REQUEST_DELAY_MS', '2000'))

        self.output_dir = Path(output_dir or os.getenv('IMAGE_OUTPUT_DIR', 'images'))
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.combo_manager = CombinationManager()

        # Initialize ProviderManager
        self.provider_manager = ProviderManager(provider_order)

        print(f"\nImageGenerator initialized with providers: {self.provider_manager.get_available_providers()}")

    def generate_images_for_record(self, image_id: str,
                                   main_prompt: str,
                                   diff_prompt: str,
                                   language_id: int = 1,
                                   version: int = 1,
                                   retry_count: int = 0,
                                   forced_provider: str = None,
                                   progress_callback: Optional[Callable] = None) -> Dict:
        """
        Generate both main and diff images for a record using two-turn generation.

        Round 1: Generate main image from main_prompt
        Round 2: Generate diff image using diff_prompt + main image as context
        Round 3: Stitch main + diff into final image with text overlay

        IMPORTANT: 强制同provider约束 - Round 1和Round 2必须使用相同的provider

        Args:
            image_id: Image ID for the record
            main_prompt: Main image prompt text
            diff_prompt: Diff image prompt text
            language_id: Language ID for final image text (1-7, default: 1=English)
            version: Version number for variant (default: 1)
            retry_count: Current retry attempt number
            forced_provider: 强制使用指定provider (用于重试时保持一致性)
            progress_callback: Optional callback to report progress

        Returns:
            Dictionary containing:
            - success: Boolean
            - version: Version number
            - provider_used: 使用的provider名称
            - main_path: Path to generated main image (if successful)
            - diff_path: Path to generated diff image (if successful)
            - final_path: Path to stitched final image (if successful)
            - error: Error details (if failed)
        """
        try:
            # Check if any provider is available
            if not self.provider_manager.get_available_providers():
                return {
                    'success': False,
                    'error': {
                        'stage': 'init',
                        'message': 'No image generation providers available. Please configure API keys in .env file.',
                        'failed_at': datetime.now().isoformat(),
                        'retry_count': retry_count
                    }
                }

            # Get language code from stitch_generator
            from src.stitch_generator import LANGUAGE_CODE
            lang_code = LANGUAGE_CODE.get(language_id, "en")

            # Create subfolder for this image_id
            image_dir = self.output_dir / image_id
            image_dir.mkdir(parents=True, exist_ok=True)

            # Round 1: Generate main image
            print(f"[{image_id}] Generating main image (v{version})...")
            main_output_path = image_dir / f"v{version}_main.png"

            # Wrap provider callback to add Round 1 info
            def round1_callback(provider_detail):
                if progress_callback:
                    progress_callback({
                        'round': 1,
                        'round_name': 'Round 1: 生成主图',
                        'provider': provider_detail.get('provider'),
                        'attempt': provider_detail.get('attempt'),
                        'total_attempts': provider_detail.get('total_attempts'),
                        'message': provider_detail.get('message')
                    })

            if forced_provider:
                # 重试时使用指定的provider
                main_result = self.provider_manager.generate_with_provider(
                    provider_name=forced_provider,
                    prompt=main_prompt,
                    base_image=None,
                    progress_callback=round1_callback
                )
            else:
                # 首次生成，使用fallback策略
                main_result = self.provider_manager.generate_with_fallback(
                    prompt=main_prompt,
                    base_image=None,
                    progress_callback=round1_callback
                )

            if not main_result['success']:
                # 返回包含详细Provider错误信息的对象，不抛异常
                error_details = main_result.get('error', {})
                return {
                    'success': False,
                    'error': {
                        'stage': 'main',
                        'message': error_details.get('message', 'Main image generation failed') if isinstance(error_details, dict) else str(error_details),
                        'failed_at': datetime.now().isoformat(),
                        'retry_count': retry_count,
                        'provider_used': None,
                        'provider_errors': error_details.get('provider_errors', []) if isinstance(error_details, dict) else [],
                        'error_code': error_details.get('code') if isinstance(error_details, dict) else None
                    },
                    'attempts': main_result.get('attempts', [])  # 传递Provider尝试历史
                }

            # Save main image
            main_result['image'].save(str(main_output_path))
            print(f"[{image_id}] Main image saved to {main_output_path}")

            # 记录使用的provider
            provider_used = main_result['provider_used']
            print(f"[{image_id}] Provider used: {provider_used}")

            # Round 2: Generate diff image with main image as context
            # 强制使用相同provider确保风格一致性
            print(f"[{image_id}] Generating diff image (v{version}) using {provider_used}...")
            diff_output_path = image_dir / f"v{version}_diff.png"

            # Wrap provider callback to add Round 2 info
            def round2_callback(provider_detail):
                if progress_callback:
                    progress_callback({
                        'round': 2,
                        'round_name': 'Round 2: 生成对比图',
                        'provider': provider_detail.get('provider'),
                        'attempt': provider_detail.get('attempt'),
                        'total_attempts': provider_detail.get('total_attempts'),
                        'message': provider_detail.get('message')
                    })

            # Load the just-generated main image
            base_image = Image.open(str(main_output_path))

            # 强制使用相同provider
            diff_result = self.provider_manager.generate_with_provider(
                provider_name=provider_used,
                prompt=diff_prompt,
                base_image=base_image,
                progress_callback=round2_callback
            )

            if not diff_result['success']:
                # 返回包含详细Provider错误信息的对象
                error_details = diff_result.get('error', {})
                return {
                    'success': False,
                    'error': {
                        'stage': 'diff',
                        'message': error_details.get('message', 'Diff image generation failed') if isinstance(error_details, dict) else str(error_details),
                        'failed_at': datetime.now().isoformat(),
                        'retry_count': retry_count,
                        'provider_used': provider_used,
                        'provider_errors': error_details.get('provider_errors', []) if isinstance(error_details, dict) else [],
                        'error_code': error_details.get('code') if isinstance(error_details, dict) else None
                    },
                    'attempts': diff_result.get('attempts', [])
                }

            # Save diff image
            diff_result['image'].save(str(diff_output_path))
            print(f"[{image_id}] Diff image saved to {diff_output_path}")

            # Round 3: Stitch main + diff into final image
            print(f"[{image_id}] Stitching final image (v{version}, lang={lang_code})...")
            final_output_path = image_dir / f"v{version}_final_{lang_code}.png"

            # Report Round 3 progress
            if progress_callback:
                progress_callback({
                    'round': 3,
                    'round_name': 'Round 3: 拼接图片',
                    'provider': provider_used,  # Not really using provider, but keep for consistency
                    'attempt': 1,
                    'total_attempts': 1,
                    'message': '拼接图片中...'
                })

            stitch_result = stitch_images(
                main_image_path=str(main_output_path),
                diff_image_path=str(diff_output_path),
                output_path=str(final_output_path),
                language_id=language_id
            )

            if stitch_result['success']:
                print(f"[{image_id}] Final image saved to {final_output_path}")
                print(f"  Language: {stitch_result['language']}, Tries: {stitch_result['tries']}, Diffs: {stitch_result['diffs']}")
            else:
                print(f"[{image_id}] Warning: Stitch failed - {stitch_result.get('error', 'Unknown error')}")
                # Don't fail the entire generation if stitch fails
                # Main and diff are still valid

            return {
                'success': True,
                'version': version,
                'provider_used': provider_used,
                'language_code': lang_code,
                'main_path': str(main_output_path),
                'diff_path': str(diff_output_path),
                'final_path': str(final_output_path) if stitch_result['success'] else None,
                'final_generated': stitch_result['success'],
                'stitch_details': stitch_result if stitch_result['success'] else None,
                'provider_attempts': main_result.get('attempts', [])
            }

        except Exception as e:
            error_msg = str(e)
            print(f"[{image_id}] Error: {error_msg}")

            # Determine which stage failed
            stage = 'diff' if main_output_path.exists() else 'main'

            # Retry logic
            if retry_count < self.max_retries:
                print(f"[{image_id}] Retrying ({retry_count + 1}/{self.max_retries})...")
                time.sleep(self.request_delay / 1000.0 * (retry_count + 1))

                # 重试时如果之前成功过，强制使用相同provider
                retry_forced_provider = forced_provider or (provider_used if 'provider_used' in locals() else None)

                return self.generate_images_for_record(
                    image_id, main_prompt, diff_prompt, language_id, version,
                    retry_count + 1, retry_forced_provider
                )

            return {
                'success': False,
                'error': {
                    'stage': stage,
                    'message': error_msg,
                    'failed_at': datetime.now().isoformat(),
                    'retry_count': retry_count,
                    'provider_used': provider_used if 'provider_used' in locals() else None
                }
            }

    def generate_single_record(self, image_id: str, language_id: int = 1,
                              version: int = None, generate_new_variant: bool = False,
                              forced_provider: str = None,
                              progress_callback: Optional[Callable] = None) -> Dict:
        """
        Generate images for a single record by reading prompts from files.

        Args:
            image_id: The image ID to generate
            language_id: Language ID for final image text (1-7, default: 1=English)
            version: Specific version number (None = auto-determine based on generate_new_variant)
            generate_new_variant: If True, create new variant; if False, overwrite current/create v1
            forced_provider: Force use of specific provider (e.g., 'gemini', 'bytedance', None=auto)
            progress_callback: Optional callback to report progress

        Returns:
            Generation result dictionary
        """
        try:
            from src.record_generator import get_next_version, add_variant

            # Determine version number
            if version is None:
                if generate_new_variant:
                    # Get next version number
                    version = get_next_version(image_id)
                else:
                    # Use version 1 (will overwrite if exists)
                    version = 1

            # Read prompts from files
            main_prompt_path = Path(f"prompts/{image_id}_main.txt")
            diff_prompt_path = Path(f"prompts/{image_id}_diff.txt")

            if not main_prompt_path.exists():
                return {
                    'success': False,
                    'error': {
                        'stage': 'init',
                        'message': f'Main prompt file not found: {main_prompt_path}',
                        'failed_at': datetime.now().isoformat(),
                        'retry_count': 0
                    }
                }

            if not diff_prompt_path.exists():
                return {
                    'success': False,
                    'error': {
                        'stage': 'init',
                        'message': f'Diff prompt file not found: {diff_prompt_path}',
                        'failed_at': datetime.now().isoformat(),
                        'retry_count': 0
                    }
                }

            with open(main_prompt_path, 'r', encoding='utf-8') as f:
                main_prompt = f.read().strip()

            with open(diff_prompt_path, 'r', encoding='utf-8') as f:
                diff_prompt = f.read().strip()

            # Generate images with version number
            result = self.generate_images_for_record(
                image_id, main_prompt, diff_prompt, language_id, version,
                retry_count=0,
                forced_provider=forced_provider,
                progress_callback=progress_callback
            )

            # Update record with variant information
            if result['success']:
                # Update variant record
                paths_dict = {
                    "main": result['main_path'],
                    "diff": result['diff_path'],
                    "provider_used": result['provider_used']
                }
                if result.get('final_path'):
                    paths_dict["final"] = {result['language_code']: result['final_path']}

                add_variant(image_id, version, paths_dict)

                # Also update legacy success status
                self._update_record_success(image_id, result)
            else:
                self._update_record_failure(image_id, result['error'])

            return result

        except Exception as e:
            error = {
                'stage': 'init',
                'message': str(e),
                'failed_at': datetime.now().isoformat(),
                'retry_count': 0
            }
            self._update_record_failure(image_id, error)
            return {
                'success': False,
                'error': error
            }

    def _update_record_success(self, image_id: str, result: Dict):
        """Update record file with successful generation."""
        record_path = Path(f"records/{image_id}.json")

        if record_path.exists():
            with open(record_path, 'r', encoding='utf-8') as f:
                record = json.load(f)

            record['image_generated'] = True
            record['image_generation_failed'] = False
            record['image_main_path'] = result['main_path']
            record['image_diff_path'] = result['diff_path']
            record['image_generated_at'] = datetime.now().isoformat()

            # 记录使用的provider
            record['provider_used'] = result.get('provider_used')
            if result.get('provider_attempts'):
                record['provider_attempts'] = result['provider_attempts']

            # Update final image info
            record['final_generated'] = result.get('final_generated', False)
            if result.get('final_path'):
                record['final_image_path'] = result['final_path']
            if result.get('stitch_details'):
                record['stitch_details'] = result['stitch_details']

            # Clear error if exists
            if 'image_generation_error' in record:
                del record['image_generation_error']

            with open(record_path, 'w', encoding='utf-8') as f:
                json.dump(record, f, indent=2, ensure_ascii=False)

    def _update_record_failure(self, image_id: str, error: Dict):
        """Update record file with failed generation."""
        record_path = Path(f"records/{image_id}.json")

        if record_path.exists():
            with open(record_path, 'r', encoding='utf-8') as f:
                record = json.load(f)

            record['image_generated'] = False
            record['image_generation_failed'] = True
            record['image_generation_error'] = error

            with open(record_path, 'w', encoding='utf-8') as f:
                json.dump(record, f, indent=2, ensure_ascii=False)

    def generate_batch(self, filter_status: str = 'prompt_only',
                      language_id: int = 1,
                      progress_callback: Optional[Callable[[int, int, str], None]] = None,
                      library_filter: Optional[Dict] = None) -> Dict:
        """
        Generate images for multiple records with optional library filtering.

        Args:
            filter_status: Filter for records to process
                - 'prompt_only': Records with prompt but no image
                - 'all_pending': All records without images
                - 'failed': Retry failed image generation
            language_id: Language ID for final image text (1-7, default: 1=English)
            progress_callback: Function(current, total, image_id) to report progress
            library_filter: Optional library filtering to save API tokens
                {
                    'character_ids': ['char_betty_v1'] or None,
                    'pose_ids': None,  # None = use all
                    'scene_ids': ['scene_living_sofa_v1'],
                    'theme_ids': None,
                    'style_ids': ['style_retro1950_flat_v1']
                }

        Returns:
            Dictionary containing:
            - success_count: Number of successful generations
            - failed_count: Number of failed generations
            - errors: List of error details
            - duration: Total time in seconds
            - provider_stats: Provider使用统计
        """
        start_time = time.time()

        # Get records to process
        if filter_status == 'failed':
            # Get records with failed status
            records = self._get_failed_records()
        elif filter_status == 'prompt_only':
            records = get_records_by_status(prompt_generated=True, image_generated=False)
            # Filter out failed ones unless specifically retrying
            records = [r for r in records if not r.get('image_generation_failed')]
        elif filter_status == 'all_pending':
            records = get_records_by_status(image_generated=False)
        else:
            records = []

        # Apply library filtering if specified
        if library_filter:
            filtered_combos = self.combo_manager.enumerate_combinations_with_filter(library_filter)

            # Build set of filtered image_ids from combinations
            filtered_image_ids = set()
            for combo in filtered_combos:
                key = self.combo_manager.get_combo_key(combo)
                combo_data = self.combo_manager.status_data['combinations'].get(key)
                if combo_data and combo_data.get('image_id'):
                    filtered_image_ids.add(combo_data['image_id'])

            # Filter records to only include filtered image_ids
            records = [r for r in records if r['image_id'] in filtered_image_ids]

        total = len(records)
        results = {
            'success_count': 0,
            'failed_count': 0,
            'errors': [],
            'generated_ids': [],
            'provider_usage': {}
        }

        for idx, record in enumerate(records):
            image_id = record['image_id']

            # Wrap progress callback to pass both batch and round progress
            def record_progress_callback(status_detail):
                if progress_callback:
                    progress_callback(idx + 1, total, image_id, status_detail)

            # Generate images for this record
            result = self.generate_single_record(
                image_id,
                language_id,
                progress_callback=record_progress_callback
            )

            if result['success']:
                results['success_count'] += 1
                results['generated_ids'].append(image_id)

                # 统计provider使用
                provider_used = result.get('provider_used', 'unknown')
                results['provider_usage'][provider_used] = results['provider_usage'].get(provider_used, 0) + 1

                # Update combination status
                combo = {
                    'character_id': record['character_id'],
                    'pose_id': record['pose_id'],
                    'scene_id': record['scene_id'],
                    'theme_id': record['theme_id'],
                    'style_id': record['style_id']
                }
                self.combo_manager.update_image_status(combo, generated=True)
            else:
                results['failed_count'] += 1
                results['errors'].append({
                    'image_id': image_id,
                    'error': result['error']
                })

            # Rate limiting
            if idx < total - 1:
                time.sleep(self.request_delay / 1000.0)

        results['duration'] = time.time() - start_time
        return results
    def get_generation_stats(self) -> Dict:
        """
        Get statistics about image generation status.

        Returns:
            Dictionary with statistics including provider stats
        """
        all_records = get_records_by_status()
        prompt_only = get_records_by_status(prompt_generated=True, image_generated=False)
        completed = get_records_by_status(prompt_generated=True, image_generated=True)
        failed = self._get_failed_records()

        return {
            'total_records': len(all_records),
            'prompt_generated': len([r for r in all_records if r.get('prompt_generated')]),
            'image_generated': len(completed),
            'image_failed': len(failed),
            'pending_generation': len(prompt_only) - len(failed),
            'completion_rate': (len(completed) / len(all_records) * 100) if all_records else 0,
            'provider_stats': self.provider_manager.get_provider_stats()
        }

    def get_provider_health(self) -> Dict:
        """
        Get health status of all providers.

        Returns:
            Dictionary with provider health information
        """
        return self.provider_manager.check_provider_health()


if __name__ == "__main__":
    # Test image generator
    print("Testing Multi-Provider Image Generator...")

    generator = ImageGenerator()

    # Get stats
    print("\nGeneration Statistics:")
    stats = generator.get_generation_stats()
    for key, value in stats.items():
        if key != 'provider_stats':
            print(f"  {key}: {value}")

    # Provider health check
    print("\nProvider Health Check:")
    health = generator.get_provider_health()
    print(f"  Healthy providers: {health['healthy']}/{health['total']}")
    for provider_name, details in health['details'].items():
        status = "✓" if details['healthy'] else "✗"
        print(f"  {status} {provider_name}: {details['validation']}")

    print("\n✓ Image generator initialization test completed")
    print(f"\nAvailable providers: {generator.provider_manager.get_available_providers()}")

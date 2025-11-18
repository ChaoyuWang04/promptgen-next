"""Sync manager - ensures consistency between records, prompts, and combination status."""
import json
from pathlib import Path
from typing import Dict, List
from src.combo_manager import CombinationManager
from src.utils import load_generation_record
from src.prompt_generator import generate_main_prompt
from src.diff_prompt_generator import generate_diff_prompt
from src.image_generator import ImageGenerator


class SyncManager:
    """Manages synchronization and consistency across all data sources."""

    def __init__(self, records_dir: str = 'records', prompts_dir: str = 'prompts', images_dir: str = 'images'):
        """
        Initialize sync manager.

        Args:
            records_dir: Directory containing record JSON files
            prompts_dir: Directory containing prompt text files
            images_dir: Directory containing generated images
        """
        self.records_dir = Path(records_dir)
        self.prompts_dir = Path(prompts_dir)
        self.images_dir = Path(images_dir)
        self.combo_manager = CombinationManager()
        self.image_generator = ImageGenerator()

    def check_sync_status(self) -> Dict:
        """
        Check synchronization status across all data sources.

        Returns:
            Dictionary containing:
            - total_records: Total number of records
            - inconsistencies: List of inconsistency details
            - summary: Summary statistics
        """
        inconsistencies = []

        # Get all record files
        record_files = list(self.records_dir.glob('*.json'))
        record_files = [f for f in record_files if f.name not in [
            'combination_status.json', 'sequence_tracker.json'
        ]]

        for record_file in record_files:
            try:
                with open(record_file, 'r', encoding='utf-8') as f:
                    record = json.load(f)

                image_id = record.get('image_id')
                issues = []

                # Check 1: Prompt files existence vs prompt_generated flag
                prompt_main_exists = (self.prompts_dir / f"{image_id}_main.txt").exists()
                prompt_diff_exists = (self.prompts_dir / f"{image_id}_diff.txt").exists()
                prompt_generated = record.get('prompt_generated', False)

                if (prompt_main_exists and prompt_diff_exists) and not prompt_generated:
                    issues.append("Prompt files exist but prompt_generated=False")
                elif not (prompt_main_exists and prompt_diff_exists) and prompt_generated:
                    missing = []
                    if not prompt_main_exists:
                        missing.append("main")
                    if not prompt_diff_exists:
                        missing.append("diff")
                    issues.append(f"prompt_generated=True but missing {', '.join(missing)} prompt file(s)")

                # Check 2: Combination status consistency
                combo = {
                    'character_id': record.get('character_id'),
                    'pose_id': record.get('pose_id'),
                    'scene_id': record.get('scene_id'),
                    'theme_id': record.get('theme_id'),
                    'style_id': record.get('style_id')
                }
                combo_key = self.combo_manager.get_combo_key(combo)

                if combo_key in self.combo_manager.status_data['combinations']:
                    combo_data = self.combo_manager.status_data['combinations'][combo_key]

                    # Check prompt status consistency
                    if combo_data.get('prompt_generated') != prompt_generated:
                        issues.append(
                            f"Record prompt_generated={prompt_generated} but "
                            f"combo status={combo_data.get('prompt_generated')}"
                        )

                    # Check image status consistency
                    record_image_gen = record.get('image_generated', False)
                    combo_image_gen = combo_data.get('image_generated', False)
                    if record_image_gen != combo_image_gen:
                        issues.append(
                            f"Record image_generated={record_image_gen} but "
                            f"combo status={combo_image_gen}"
                        )
                else:
                    issues.append("Record exists but not found in combination_status.json")

                if issues:
                    inconsistencies.append({
                        'image_id': image_id,
                        'issues': issues
                    })

            except Exception as e:
                inconsistencies.append({
                    'image_id': record_file.stem,
                    'issues': [f"Error reading record: {str(e)}"]
                })

        # Generate summary
        total_records = len(record_files)
        inconsistent_count = len(inconsistencies)

        return {
            'total_records': total_records,
            'inconsistencies': inconsistencies,
            'summary': {
                'consistent': total_records - inconsistent_count,
                'inconsistent': inconsistent_count,
                'consistency_rate': ((total_records - inconsistent_count) / total_records * 100)
                    if total_records > 0 else 100
            }
        }

    def repair_inconsistencies(self, dry_run: bool = True) -> Dict:
        """
        Repair detected inconsistencies by regenerating missing files.

        Args:
            dry_run: If True, only report what would be fixed without making changes

        Returns:
            Dictionary containing:
            - repaired_count: Number of repairs made
            - repairs: List of repair details
            - stats: Statistics of regenerated files
        """
        status = self.check_sync_status()
        repairs = []
        stats = {
            'main_prompts_regenerated': 0,
            'diff_prompts_regenerated': 0,
            'images_regenerated': 0,
            'flags_updated': 0
        }

        for item in status['inconsistencies']:
            image_id = item['image_id']
            repair_actions = []

            try:
                record = load_generation_record(image_id)

                # Check file existence
                prompt_main_exists = (self.prompts_dir / f"{image_id}_main.txt").exists()
                prompt_diff_exists = (self.prompts_dir / f"{image_id}_diff.txt").exists()
                image_main_exists = (self.images_dir / f"{image_id}_main.png").exists()
                image_diff_exists = (self.images_dir / f"{image_id}_diff.png").exists()

                # Repair 1: Regenerate missing prompt files
                if not prompt_main_exists:
                    if not dry_run:
                        success = self._regenerate_prompt_main(record)
                        if success:
                            repair_actions.append("Regenerated main prompt file")
                            stats['main_prompts_regenerated'] += 1
                        else:
                            repair_actions.append("Failed to regenerate main prompt")
                    else:
                        repair_actions.append("Would regenerate main prompt file")

                if not prompt_diff_exists:
                    if not dry_run:
                        success = self._regenerate_prompt_diff(record)
                        if success:
                            repair_actions.append("Regenerated diff prompt file")
                            stats['diff_prompts_regenerated'] += 1
                        else:
                            repair_actions.append("Failed to regenerate diff prompt")
                    else:
                        repair_actions.append("Would regenerate diff prompt file")

                # Repair 2: Update prompt_generated flag
                both_prompts_exist = (self.prompts_dir / f"{image_id}_main.txt").exists() and \
                                    (self.prompts_dir / f"{image_id}_diff.txt").exists()

                if both_prompts_exist != record.get('prompt_generated', False):
                    if not dry_run:
                        record['prompt_generated'] = both_prompts_exist
                        self._save_record(image_id, record)
                        repair_actions.append(f"Updated prompt_generated={both_prompts_exist}")
                        stats['flags_updated'] += 1
                    else:
                        repair_actions.append(f"Would update prompt_generated={both_prompts_exist}")

                # Repair 3: Regenerate missing image files (if prompts exist)
                if both_prompts_exist and record.get('image_generated', False):
                    if not image_main_exists or not image_diff_exists:
                        if not dry_run:
                            success = self._regenerate_images(image_id)
                            if success:
                                repair_actions.append("Regenerated image files")
                                stats['images_regenerated'] += 1
                            else:
                                repair_actions.append("Failed to regenerate images")
                        else:
                            repair_actions.append("Would regenerate image files")

                # Repair 4: Update image_generated flag
                both_images_exist = image_main_exists and image_diff_exists
                if both_images_exist != record.get('image_generated', False):
                    if not dry_run:
                        record['image_generated'] = both_images_exist
                        self._save_record(image_id, record)
                        repair_actions.append(f"Updated image_generated={both_images_exist}")
                        stats['flags_updated'] += 1
                    else:
                        repair_actions.append(f"Would update image_generated={both_images_exist}")

                # Repair 5: Sync with combination status
                combo = {
                    'character_id': record.get('character_id'),
                    'pose_id': record.get('pose_id'),
                    'scene_id': record.get('scene_id'),
                    'theme_id': record.get('theme_id'),
                    'style_id': record.get('style_id')
                }

                if not dry_run:
                    self.combo_manager.update_prompt_status(
                        combo, record.get('prompt_generated', False)
                    )
                    self.combo_manager.update_image_status(
                        combo, record.get('image_generated', False)
                    )
                    repair_actions.append("Synced combination_status")
                else:
                    repair_actions.append("Would sync combination_status")

                if repair_actions:
                    repairs.append({
                        'image_id': image_id,
                        'actions': repair_actions
                    })

            except Exception as e:
                repairs.append({
                    'image_id': image_id,
                    'actions': [f"Error: {str(e)}"]
                })

        return {
            'repaired_count': len(repairs),
            'repairs': repairs,
            'stats': stats,
            'dry_run': dry_run
        }

    def _save_record(self, image_id: str, record: Dict):
        """Save record to file."""
        record_path = self.records_dir / f"{image_id}.json"
        with open(record_path, 'w', encoding='utf-8') as f:
            json.dump(record, f, ensure_ascii=False, indent=2)

    def _regenerate_prompt_main(self, record: Dict) -> bool:
        """
        Regenerate main prompt file from record.

        Args:
            record: Generation record containing combination info

        Returns:
            True if successful, False otherwise
        """
        try:
            # Extract IDs from record
            character_id = record.get('character_id')
            pose_id = record.get('pose_id')
            scene_id = record.get('scene_id')
            theme_id = record.get('theme_id')
            style_id = record.get('style_id')

            # Generate prompt
            result = generate_main_prompt(
                character_id, pose_id, scene_id, theme_id, style_id
            )

            # Save prompt file
            image_id = result['image_id']
            prompt_cn = result['prompt_cn']
            prompt_file = self.prompts_dir / f"{image_id}_main.txt"
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(prompt_cn)

            return True

        except Exception as e:
            print(f"Error regenerating main prompt: {e}")
            return False

    def _regenerate_prompt_diff(self, record: Dict) -> bool:
        """
        Regenerate diff prompt file from record.

        Args:
            record: Generation record containing image_id

        Returns:
            True if successful, False otherwise
        """
        try:
            image_id = record.get('image_id')
            pose_id = record.get('pose_id')
            scene_id = record.get('scene_id')
            style_id = record.get('style_id')

            # Generate diff prompt
            result = generate_diff_prompt(image_id, pose_id, scene_id, style_id)

            # Save diff prompt file
            diff_prompt = result['prompt_cn']
            prompt_file = self.prompts_dir / f"{image_id}_diff.txt"
            with open(prompt_file, 'w', encoding='utf-8') as f:
                f.write(diff_prompt)

            return True

        except Exception as e:
            print(f"Error regenerating diff prompt: {e}")
            return False

    def _regenerate_images(self, image_id: str) -> bool:
        """
        Regenerate image files from prompts.

        Args:
            image_id: Image ID to regenerate

        Returns:
            True if successful, False otherwise
        """
        try:
            # Read prompts
            main_prompt_file = self.prompts_dir / f"{image_id}_main.txt"
            diff_prompt_file = self.prompts_dir / f"{image_id}_diff.txt"

            if not main_prompt_file.exists() or not diff_prompt_file.exists():
                print(f"Cannot regenerate images: prompt files missing for {image_id}")
                return False

            with open(main_prompt_file, 'r', encoding='utf-8') as f:
                main_prompt = f.read()

            with open(diff_prompt_file, 'r', encoding='utf-8') as f:
                diff_prompt = f.read()

            # Generate images
            # Note: This will only work if Gemini API is configured
            results = self.image_generator.generate_batch([{
                'image_id': image_id,
                'main_prompt': main_prompt,
                'diff_prompt': diff_prompt
            }])

            # Check if generation was successful
            if results and results.get('generated', 0) > 0:
                return True
            else:
                print(f"Image generation failed or API not configured for {image_id}")
                return False

        except Exception as e:
            print(f"Error regenerating images: {e}")
            return False

    def generate_sync_report(self) -> str:
        """
        Generate a human-readable sync report.

        Returns:
            Formatted report string
        """
        status = self.check_sync_status()

        report = []
        report.append("="*80)
        report.append("数据同步状态报告")
        report.append("="*80)
        report.append("")
        report.append(f"总记录数: {status['total_records']}")
        report.append(f"一致性记录: {status['summary']['consistent']}")
        report.append(f"不一致记录: {status['summary']['inconsistent']}")
        report.append(f"一致性率: {status['summary']['consistency_rate']:.2f}%")
        report.append("")

        if status['inconsistencies']:
            report.append("发现的不一致问题:")
            report.append("-"*80)
            for item in status['inconsistencies'][:10]:  # Show first 10
                report.append(f"\nImage ID: {item['image_id']}")
                for issue in item['issues']:
                    report.append(f"  - {issue}")

            if len(status['inconsistencies']) > 10:
                report.append(f"\n... 还有 {len(status['inconsistencies']) - 10} 个不一致问题")
        else:
            report.append("✓ 所有数据一致，无需修复")

        report.append("")
        report.append("="*80)

        return "\n".join(report)

    def check_variants_consistency(self) -> Dict:
        """
        检查variants数组完整性

        验证每个record的variants数组中声明的文件是否真实存在，
        以及文件系统中是否有未记录的版本。

        Returns:
            Dictionary containing:
            - total_records: Total records checked
            - inconsistencies: List of variant inconsistencies
            - orphan_images: Images in filesystem not recorded in variants
            - missing_files: Files declared in variants but not found
        """
        inconsistencies = []
        orphan_images = []
        missing_files = []

        # Get all record files
        record_files = list(self.records_dir.glob('*.json'))
        record_files = [f for f in record_files if f.name not in [
            'combination_status.json', 'sequence_tracker.json'
        ]]

        for record_file in record_files:
            try:
                with open(record_file, 'r', encoding='utf-8') as f:
                    record = json.load(f)

                image_id = record.get('image_id')
                variants = record.get('variants', [])
                issues = []

                # Get image directory
                image_dir = self.images_dir / image_id
                if not image_dir.exists():
                    if variants:
                        issues.append(f"Variants array has {len(variants)} entries but image directory doesn't exist")
                    continue

                # Track which files are declared in variants
                declared_files = set()
                for variant in variants:
                    version = variant.get('version')
                    if not version:
                        issues.append("Variant missing 'version' field")
                        continue

                    # Check main image
                    main_path = variant.get('image_main_path')
                    if main_path:
                        declared_files.add(Path(main_path).name)
                        if not Path(main_path).exists():
                            missing_files.append({
                                'image_id': image_id,
                                'file': main_path,
                                'type': 'main',
                                'version': version
                            })
                            issues.append(f"v{version} main image declared but not found: {main_path}")
                    else:
                        issues.append(f"v{version} missing image_main_path")

                    # Check diff image
                    diff_path = variant.get('image_diff_path')
                    if diff_path:
                        declared_files.add(Path(diff_path).name)
                        if not Path(diff_path).exists():
                            missing_files.append({
                                'image_id': image_id,
                                'file': diff_path,
                                'type': 'diff',
                                'version': version
                            })
                            issues.append(f"v{version} diff image declared but not found: {diff_path}")
                    else:
                        issues.append(f"v{version} missing image_diff_path")

                    # Check final images (7 languages)
                    final_images = variant.get('final_images', {})
                    expected_langs = ['en', 'fr', 'ja', 'ko', 'de', 'es', 'zh']
                    for lang in expected_langs:
                        if lang in final_images:
                            final_path = final_images[lang]
                            declared_files.add(Path(final_path).name)
                            if not Path(final_path).exists():
                                missing_files.append({
                                    'image_id': image_id,
                                    'file': final_path,
                                    'type': 'final',
                                    'version': version,
                                    'language': lang
                                })
                                issues.append(f"v{version} final image ({lang}) declared but not found: {final_path}")

                # Check for orphan files in filesystem not declared in variants
                if image_dir.exists():
                    for img_file in image_dir.glob('*.png'):
                        if img_file.name not in declared_files:
                            orphan_images.append({
                                'image_id': image_id,
                                'file': str(img_file),
                                'filename': img_file.name
                            })
                            issues.append(f"Orphan image file not in variants: {img_file.name}")

                if issues:
                    inconsistencies.append({
                        'image_id': image_id,
                        'issues': issues
                    })

            except Exception as e:
                inconsistencies.append({
                    'image_id': record_file.stem,
                    'issues': [f"Error checking variants: {str(e)}"]
                })

        return {
            'total_records': len(record_files),
            'inconsistencies': inconsistencies,
            'orphan_images': orphan_images,
            'missing_files': missing_files,
            'summary': {
                'records_with_issues': len(inconsistencies),
                'total_orphan_images': len(orphan_images),
                'total_missing_files': len(missing_files)
            }
        }

    def detect_orphan_files(self) -> Dict:
        """
        检测孤立文件

        查找没有对应record的prompt文件和图片文件夹。

        Returns:
            Dictionary containing:
            - orphan_prompts: Prompt files without corresponding records
            - orphan_image_dirs: Image directories without corresponding records
            - total_orphans: Total orphan files/directories found
        """
        orphan_prompts = []
        orphan_image_dirs = []

        # Get all valid image_ids from records
        valid_image_ids = set()
        record_files = list(self.records_dir.glob('*.json'))
        for record_file in record_files:
            if record_file.name not in ['combination_status.json', 'sequence_tracker.json']:
                try:
                    with open(record_file, 'r', encoding='utf-8') as f:
                        record = json.load(f)
                        image_id = record.get('image_id')
                        if image_id:
                            valid_image_ids.add(image_id)
                except Exception as e:
                    print(f"Warning: Error reading {record_file.name}: {e}")

        # Check orphan prompts
        for prompt_file in self.prompts_dir.glob('*.txt'):
            # Extract image_id from filename (e.g., "betty_sitting_..._0001_main.txt")
            filename = prompt_file.stem  # Remove .txt
            if filename.endswith('_main'):
                image_id = filename[:-5]  # Remove "_main"
            elif filename.endswith('_diff'):
                image_id = filename[:-5]  # Remove "_diff"
            else:
                continue

            if image_id not in valid_image_ids:
                orphan_prompts.append({
                    'file': str(prompt_file),
                    'filename': prompt_file.name,
                    'image_id': image_id,
                    'size_bytes': prompt_file.stat().st_size
                })

        # Check orphan image directories
        for image_dir in self.images_dir.glob('*'):
            if image_dir.is_dir():
                image_id = image_dir.name
                if image_id not in valid_image_ids:
                    # Count files in directory
                    file_count = len(list(image_dir.glob('*.png')))
                    total_size = sum(f.stat().st_size for f in image_dir.glob('*.png'))

                    orphan_image_dirs.append({
                        'directory': str(image_dir),
                        'image_id': image_id,
                        'file_count': file_count,
                        'total_size_bytes': total_size,
                        'total_size_mb': round(total_size / (1024 * 1024), 2)
                    })

        return {
            'orphan_prompts': orphan_prompts,
            'orphan_image_dirs': orphan_image_dirs,
            'summary': {
                'total_orphan_prompts': len(orphan_prompts),
                'total_orphan_image_dirs': len(orphan_image_dirs),
                'total_orphans': len(orphan_prompts) + len(orphan_image_dirs),
                'orphan_images_size_mb': sum(d['total_size_mb'] for d in orphan_image_dirs)
            }
        }

    def check_field_integrity(self) -> Dict:
        """
        检查字段完整性

        验证record必需字段和数据结构完整性。

        Returns:
            Dictionary containing:
            - total_records: Total records checked
            - issues: List of field integrity issues
            - summary: Summary statistics
        """
        issues = []
        required_fields = [
            'image_id', 'character_id', 'pose_id', 'scene_id',
            'theme_id', 'style_id', 'prompt_generated', 'image_generated'
        ]

        # Get all record files
        record_files = list(self.records_dir.glob('*.json'))
        record_files = [f for f in record_files if f.name not in [
            'combination_status.json', 'sequence_tracker.json'
        ]]

        for record_file in record_files:
            try:
                with open(record_file, 'r', encoding='utf-8') as f:
                    record = json.load(f)

                image_id = record.get('image_id', record_file.stem)
                record_issues = []

                # Check required fields
                for field in required_fields:
                    if field not in record:
                        record_issues.append(f"Missing required field: {field}")
                    elif record[field] is None:
                        record_issues.append(f"Required field is null: {field}")

                # Check outfit_minor_state structure
                if 'outfit_minor_state' in record:
                    outfit_state = record['outfit_minor_state']
                    if not isinstance(outfit_state, list):
                        record_issues.append("outfit_minor_state must be a list")
                    else:
                        for idx, item in enumerate(outfit_state):
                            if not isinstance(item, dict):
                                record_issues.append(f"outfit_minor_state[{idx}] must be a dict")
                                continue
                            if 'element' not in item:
                                record_issues.append(f"outfit_minor_state[{idx}] missing 'element' field")
                            if 'current_color' not in item:
                                record_issues.append(f"outfit_minor_state[{idx}] missing 'current_color' field")

                # Check used_decorations structure
                if 'used_decorations' in record:
                    decorations = record['used_decorations']
                    if not isinstance(decorations, dict):
                        record_issues.append("used_decorations must be a dict")
                    else:
                        if 'from_theme' not in decorations:
                            record_issues.append("used_decorations missing 'from_theme' field")
                        elif not isinstance(decorations['from_theme'], list):
                            record_issues.append("used_decorations.from_theme must be a list")

                        if 'from_scene' not in decorations:
                            record_issues.append("used_decorations missing 'from_scene' field")
                        elif not isinstance(decorations['from_scene'], list):
                            record_issues.append("used_decorations.from_scene must be a list")

                # Check variants array structure
                if 'variants' in record:
                    variants = record['variants']
                    if not isinstance(variants, list):
                        record_issues.append("variants must be a list")
                    else:
                        for idx, variant in enumerate(variants):
                            if not isinstance(variant, dict):
                                record_issues.append(f"variants[{idx}] must be a dict")
                                continue

                            # Check required variant fields
                            variant_required = ['version', 'generated_at']
                            for field in variant_required:
                                if field not in variant:
                                    record_issues.append(f"variants[{idx}] missing required field: {field}")

                            # Check final_images structure
                            if 'final_images' in variant:
                                final_images = variant['final_images']
                                if not isinstance(final_images, dict):
                                    record_issues.append(f"variants[{idx}].final_images must be a dict")

                # Check provider_attempts structure (if exists)
                if 'provider_attempts' in record:
                    attempts = record['provider_attempts']
                    if not isinstance(attempts, list):
                        record_issues.append("provider_attempts must be a list")
                    else:
                        for idx, attempt in enumerate(attempts):
                            if not isinstance(attempt, dict):
                                record_issues.append(f"provider_attempts[{idx}] must be a dict")
                                continue
                            attempt_required = ['provider', 'success', 'attempted_at']
                            for field in attempt_required:
                                if field not in attempt:
                                    record_issues.append(f"provider_attempts[{idx}] missing field: {field}")

                if record_issues:
                    issues.append({
                        'image_id': image_id,
                        'issues': record_issues
                    })

            except json.JSONDecodeError as e:
                issues.append({
                    'image_id': record_file.stem,
                    'issues': [f"JSON decode error: {str(e)}"]
                })
            except Exception as e:
                issues.append({
                    'image_id': record_file.stem,
                    'issues': [f"Error checking field integrity: {str(e)}"]
                })

        return {
            'total_records': len(record_files),
            'issues': issues,
            'summary': {
                'valid_records': len(record_files) - len(issues),
                'invalid_records': len(issues),
                'integrity_rate': ((len(record_files) - len(issues)) / len(record_files) * 100)
                    if len(record_files) > 0 else 100
            }
        }

    def check_library_config_sync(self) -> Dict:
        """
        Check library configuration vs data files consistency.

        Detects:
        1. Orphaned configs - library in config but data file missing
        2. Unregistered files - data file exists but no config entry (warning only)

        Returns:
            {
                'orphaned_configs': List[{library_name, reason, data_path}],
                'missing_configs': List[{library_name, data_path}],
                'total_issues': int,
                'summary': {...}
            }
        """
        from config import library_config

        orphaned_configs = []
        missing_configs = []
        data_dir = Path('data')

        # Check 1: Config exists but data file missing
        LIBRARY_CONFIG = getattr(library_config, 'LIBRARY_CONFIG', {})
        for lib_name, lib_config in LIBRARY_CONFIG.items():
            data_file = data_dir / lib_config.get('path', f'{lib_name}.json')
            if not data_file.exists():
                orphaned_configs.append({
                    'library_name': lib_name,
                    'reason': f"Data file not found: {data_file}",
                    'data_path': str(data_file),
                    'suggested_fix': 'remove_config'
                })

        # Check 2: Data file exists but no config entry (warning only)
        for data_file in data_dir.glob('*.json'):
            lib_name = data_file.stem
            if lib_name not in LIBRARY_CONFIG:
                missing_configs.append({
                    'library_name': lib_name,
                    'data_path': str(data_file),
                    'reason': f'{data_file.name} exists but no config entry',
                    'suggested_fix': 'create_config_or_ignore'
                })

        return {
            'orphaned_configs': orphaned_configs,
            'missing_configs': missing_configs,
            'total_issues': len(orphaned_configs),  # Only orphaned configs are issues
            'warnings': len(missing_configs),
            'summary': {
                'valid_libraries': len(LIBRARY_CONFIG) - len(orphaned_configs),
                'orphaned_libraries': len(orphaned_configs),
                'unregistered_files': len(missing_configs),
                'total_libraries': len(LIBRARY_CONFIG)
            }
        }

    def repair_library_config_sync(self, orphaned_configs: List[Dict], dry_run: bool = True) -> Dict:
        """
        Fix library config inconsistencies by removing orphaned configs.

        Args:
            orphaned_configs: List of orphaned config dicts from check_library_config_sync()
            dry_run: If True, only preview changes without applying

        Returns:
            {
                'removed_configs': List[str],
                'errors': List[str],
                'count': int
            }
        """
        from src.library_config_manager import LibraryConfigManager

        removed_configs = []
        errors = []

        if not dry_run:
            manager = LibraryConfigManager()

            for orphan in orphaned_configs:
                lib_name = orphan['library_name']

                try:
                    success, error = manager.remove_library_config(lib_name)
                    if success:
                        removed_configs.append(lib_name)
                        print(f"✓ Removed library config: {lib_name}")
                    else:
                        errors.append(f"Failed to remove {lib_name}: {error}")
                        print(f"✗ Failed to remove {lib_name}: {error}")
                except Exception as e:
                    errors.append(f"Exception removing {lib_name}: {str(e)}")
                    print(f"✗ Exception removing {lib_name}: {str(e)}")

            # Trigger hot-reload if any configs were removed
            if removed_configs:
                try:
                    # Import reload functions from api.py
                    from api import reload_library_config, clear_all_caches
                    reload_library_config()
                    clear_all_caches()
                    print(f"✓ Reloaded library config and cleared caches")
                except ImportError:
                    # If api.py not available (e.g., running standalone), skip reload
                    print("⚠ Could not reload config (api.py not imported)")
                except Exception as e:
                    errors.append(f"Failed to reload config: {str(e)}")
                    print(f"✗ Failed to reload config: {str(e)}")
        else:
            # Dry run - just list what would be removed
            removed_configs = [o['library_name'] for o in orphaned_configs]

        return {
            'removed_configs': removed_configs,
            'errors': errors,
            'count': len(removed_configs),
            'dry_run': dry_run
        }

    def check_invalid_library_references(self) -> Dict:
        """
        Check if records reference non-existent libraries.

        Validates that all library_ids in records point to valid libraries
        currently defined in library_config.py.

        Returns:
            {
                'invalid_records': List[{image_id, invalid_libraries, record_path}],
                'total_issues': int,
                'summary': {...}
            }
        """
        from config import library_config

        invalid_records = []
        LIBRARY_CONFIG = getattr(library_config, 'LIBRARY_CONFIG', {})
        valid_libraries = set(LIBRARY_CONFIG.keys())

        # Get all record files
        record_files = list(self.records_dir.glob('*.json'))
        record_files = [f for f in record_files if f.name not in [
            'combination_status.json', 'sequence_tracker.json'
        ]]

        for record_file in record_files:
            try:
                with open(record_file, 'r', encoding='utf-8') as f:
                    record = json.load(f)

                invalid_libs = set()

                # Check library_ids (new format - Phase 2)
                if 'library_ids' in record:
                    for lib_name in record['library_ids'].keys():
                        if lib_name not in valid_libraries:
                            invalid_libs.add(lib_name)

                # Check legacy format (character_id, pose_id, etc.)
                for key in record.keys():
                    if key.endswith('_id') and key != 'image_id':
                        lib_name = key[:-3]  # Remove '_id' suffix
                        if lib_name not in valid_libraries:
                            invalid_libs.add(lib_name)

                if invalid_libs:
                    invalid_records.append({
                        'image_id': record.get('image_id', record_file.stem),
                        'record_path': str(record_file),
                        'invalid_libraries': sorted(list(invalid_libs)),
                        'suggested_fix': 'mark_invalid_or_remove_references'
                    })

            except json.JSONDecodeError:
                continue  # Skip malformed JSON files
            except Exception as e:
                print(f"Error checking {record_file}: {str(e)}")
                continue

        return {
            'invalid_records': invalid_records,
            'total_issues': len(invalid_records),
            'summary': {
                'total_records_checked': len(record_files),
                'invalid_records': len(invalid_records),
                'valid_records': len(record_files) - len(invalid_records),
                'validation_rate': ((len(record_files) - len(invalid_records)) / len(record_files) * 100)
                    if len(record_files) > 0 else 100
            }
        }

    def repair_invalid_library_references(self, invalid_records: List[Dict], dry_run: bool = True) -> Dict:
        """
        Fix records with invalid library references.

        Strategy:
        1. Remove invalid library_ids entries
        2. Add 'invalid_libraries' field to track what was removed
        3. Set 'validation_status' to 'invalid'
        4. Keep record for historical tracking (don't delete)

        Args:
            invalid_records: List of invalid record dicts from check_invalid_library_references()
            dry_run: If True, only preview changes without applying

        Returns:
            {
                'fixed_records': List[str],
                'errors': List[str],
                'count': int
            }
        """
        fixed_records = []
        errors = []

        for item in invalid_records:
            image_id = item['image_id']
            invalid_libs = item['invalid_libraries']
            record_file = Path(item['record_path'])

            if not dry_run:
                try:
                    # Load record
                    with open(record_file, 'r', encoding='utf-8') as f:
                        record = json.load(f)

                    # Remove invalid library_ids entries
                    if 'library_ids' in record:
                        for lib in invalid_libs:
                            if lib in record['library_ids']:
                                record['library_ids'].pop(lib)

                    # Remove invalid legacy format fields
                    for lib in invalid_libs:
                        legacy_key = f'{lib}_id'
                        if legacy_key in record:
                            record.pop(legacy_key)

                    # Mark as invalid
                    record['invalid_libraries'] = invalid_libs
                    record['validation_status'] = 'invalid'

                    # Save updated record
                    with open(record_file, 'w', encoding='utf-8') as f:
                        json.dump(record, f, indent=2, ensure_ascii=False)

                    fixed_records.append(image_id)
                    print(f"✓ Fixed invalid references in: {image_id}")

                except Exception as e:
                    errors.append(f"Failed to fix {image_id}: {str(e)}")
                    print(f"✗ Failed to fix {image_id}: {str(e)}")
            else:
                # Dry run - just list what would be fixed
                fixed_records.append(image_id)

        return {
            'fixed_records': fixed_records,
            'errors': errors,
            'count': len(fixed_records),
            'dry_run': dry_run
        }

    def repair_all(self, dry_run: bool = True, auto_fix_options: Dict = None) -> Dict:
        """
        Run ALL sync checks and repairs in sequence.

        This is the master method that combines all sync checks:
        1. Library config sync
        2. Invalid library references
        3. Prompt sync
        4. Image sync
        5. Combination status sync
        6. Variants consistency
        7. Orphan files detection
        8. Field integrity

        Args:
            dry_run: If True, only preview changes without applying
            auto_fix_options: Dict of options for each repair type, e.g.:
                {
                    'remove_orphaned_configs': True,
                    'fix_invalid_references': True,
                    'regenerate_prompts': False,
                    'delete_orphan_files': False
                }

        Returns:
            {
                'success': bool,
                'dry_run': bool,
                'total_issues_found': int,
                'total_fixes_applied': int,
                'repairs': {
                    'library_config_sync': {...},
                    'invalid_library_references': {...},
                    'prompt_sync': {...},
                    ...
                },
                'execution_time_ms': int,
                'recommendations': List[str]
            }
        """
        import time
        start_time = time.time()

        # Default auto_fix_options
        if auto_fix_options is None:
            auto_fix_options = {
                'remove_orphaned_configs': True,
                'fix_invalid_references': True,
                'regenerate_prompts': False,  # Conservative default
                'delete_orphan_files': False   # Conservative default
            }

        results = {}
        recommendations = []

        # 1. Library Config Sync (CRITICAL - run first)
        try:
            lib_sync = self.check_library_config_sync()
            if lib_sync['total_issues'] > 0:
                if auto_fix_options.get('remove_orphaned_configs', True):
                    repair_result = self.repair_library_config_sync(
                        lib_sync['orphaned_configs'],
                        dry_run
                    )
                    results['library_config_sync'] = {
                        **lib_sync,
                        'fixes_applied': repair_result['count'],
                        'errors': repair_result['errors']
                    }
                else:
                    results['library_config_sync'] = {
                        **lib_sync,
                        'fixes_applied': 0,
                        'skipped': 'auto_fix disabled'
                    }

                if dry_run and lib_sync['total_issues'] > 0:
                    recommendations.append(
                        f"Run with dry_run=false to remove {lib_sync['total_issues']} orphaned library configs"
                    )
            else:
                results['library_config_sync'] = {
                    **lib_sync,
                    'fixes_applied': 0
                }
        except Exception as e:
            results['library_config_sync'] = {
                'error': str(e),
                'total_issues': 0,
                'fixes_applied': 0
            }

        # 2. Invalid Library References
        try:
            invalid_refs = self.check_invalid_library_references()
            if invalid_refs['total_issues'] > 0:
                if auto_fix_options.get('fix_invalid_references', True):
                    repair_result = self.repair_invalid_library_references(
                        invalid_refs['invalid_records'],
                        dry_run
                    )
                    results['invalid_library_references'] = {
                        **invalid_refs,
                        'fixes_applied': repair_result['count'],
                        'errors': repair_result['errors']
                    }
                else:
                    results['invalid_library_references'] = {
                        **invalid_refs,
                        'fixes_applied': 0,
                        'skipped': 'auto_fix disabled'
                    }

                if dry_run and invalid_refs['total_issues'] > 0:
                    recommendations.append(
                        f"{invalid_refs['total_issues']} records have invalid library references - they will be marked as invalid"
                    )
            else:
                results['invalid_library_references'] = {
                    **invalid_refs,
                    'fixes_applied': 0
                }
        except Exception as e:
            results['invalid_library_references'] = {
                'error': str(e),
                'total_issues': 0,
                'fixes_applied': 0
            }

        # 3. Existing Prompt/Image/Combination Sync
        try:
            existing_result = self.repair_inconsistencies(dry_run)
            results['prompt_sync'] = {
                'fixes_applied': existing_result['stats']['main_prompts_regenerated'] +
                                existing_result['stats']['diff_prompts_regenerated'] +
                                existing_result['stats']['flags_updated'],
                'issues_found': len([r for r in existing_result.get('repairs', []) if 'prompt' in str(r).lower()]),
                'stats': existing_result['stats']
            }
        except Exception as e:
            results['prompt_sync'] = {
                'error': str(e),
                'fixes_applied': 0,
                'issues_found': 0
            }

        # 4. Variants Consistency
        try:
            variants_check = self.check_variants_consistency()
            results['variants_consistency'] = {
                **variants_check['summary'],
                'fixes_applied': 0,  # Read-only check for now
                'issues_found': variants_check['summary'].get('orphan_images', 0) +
                               variants_check['summary'].get('undeclared_files', 0)
            }

            if variants_check['summary'].get('orphan_images', 0) > 0:
                recommendations.append(
                    f"{variants_check['summary']['orphan_images']} orphan images found - consider manual cleanup"
                )
        except Exception as e:
            results['variants_consistency'] = {
                'error': str(e),
                'fixes_applied': 0,
                'issues_found': 0
            }

        # 5. Orphan Files Detection
        try:
            orphans = self.detect_orphan_files()
            results['orphan_files'] = {
                **orphans['summary'],
                'fixes_applied': 0,  # Don't auto-delete (safety)
                'issues_found': orphans['summary'].get('orphan_prompts', 0) +
                               orphans['summary'].get('orphan_image_dirs', 0)
            }

            if orphans['summary'].get('orphan_prompts', 0) > 0:
                recommendations.append(
                    f"{orphans['summary']['orphan_prompts']} orphan prompt files can be safely deleted"
                )
        except Exception as e:
            results['orphan_files'] = {
                'error': str(e),
                'fixes_applied': 0,
                'issues_found': 0
            }

        # 6. Field Integrity (read-only check)
        try:
            field_check = self.check_field_integrity()
            results['field_integrity'] = {
                **field_check['summary'],
                'fixes_applied': 0,  # Read-only validation
                'issues_found': field_check['summary'].get('invalid_records', 0)
            }

            if field_check['summary'].get('invalid_records', 0) > 0:
                recommendations.append(
                    f"{field_check['summary']['invalid_records']} records have field integrity issues - manual review recommended"
                )
        except Exception as e:
            results['field_integrity'] = {
                'error': str(e),
                'fixes_applied': 0,
                'issues_found': 0
            }

        # Calculate totals
        total_issues = sum(r.get('issues_found', r.get('total_issues', 0)) for r in results.values())
        total_fixes = sum(r.get('fixes_applied', 0) for r in results.values())

        execution_time_ms = int((time.time() - start_time) * 1000)

        return {
            'success': True,
            'dry_run': dry_run,
            'total_issues_found': total_issues,
            'total_fixes_applied': total_fixes,
            'repairs': results,
            'execution_time_ms': execution_time_ms,
            'recommendations': recommendations,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }


if __name__ == "__main__":
    # Test sync manager
    print("Testing Sync Manager...")

    manager = SyncManager()

    # Check sync status
    print("\n检查同步状态...")
    report = manager.generate_sync_report()
    print(report)

    # Check for inconsistencies
    status = manager.check_sync_status()
    if status['summary']['inconsistent'] > 0:
        print(f"\n发现 {status['summary']['inconsistent']} 个不一致问题")

        # Dry run repair
        print("\n执行修复预演（不实际修改）...")
        repair_result = manager.repair_inconsistencies(dry_run=True)
        print(f"将修复 {repair_result['repaired_count']} 个问题")

        # Show what would be repaired
        if repair_result['repairs']:
            print("\n修复操作预览:")
            for repair in repair_result['repairs'][:5]:
                print(f"\n  Image ID: {repair['image_id']}")
                for action in repair['actions']:
                    print(f"    - {action}")

    print("\n✓ Sync manager test completed")

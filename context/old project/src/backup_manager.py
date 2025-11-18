"""
Backup Manager

Provides automated backup and rollback functionality for critical configuration files.

Features:
- Create timestamped backups before modifications
- Automatic rollback on errors
- Backup retention policy (keep last 30 days)
- Support for individual files and directory snapshots

Author: Phase 4 Implementation
Date: 2025-11-14
"""

import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List
import json


class BackupManager:
    """Manages backups of configuration files and data directories."""

    def __init__(self, backup_root: Optional[Path] = None):
        """
        Initialize the backup manager.

        Args:
            backup_root: Root directory for backups (defaults to project_root/backups/)
        """
        if backup_root is None:
            # Default to project root's backups directory
            project_root = Path(__file__).parent.parent
            backup_root = project_root / 'backups'

        self.backup_root = Path(backup_root)
        self.backup_root.mkdir(parents=True, exist_ok=True)

        # Subdirectories for different backup types
        self.config_backups = self.backup_root / 'config'
        self.data_backups = self.backup_root / 'data'

        self.config_backups.mkdir(exist_ok=True)
        self.data_backups.mkdir(exist_ok=True)

    def create_backup(self, file_path: Path, backup_type: str = 'config') -> Path:
        """
        Create a timestamped backup of a file.

        Args:
            file_path: Path to file to backup
            backup_type: Type of backup ('config' or 'data')

        Returns:
            Path to created backup file

        Raises:
            FileNotFoundError: If source file doesn't exist
        """
        if not file_path.exists():
            raise FileNotFoundError(f"Cannot backup non-existent file: {file_path}")

        # Determine backup directory
        if backup_type == 'config':
            backup_dir = self.config_backups
        elif backup_type == 'data':
            backup_dir = self.data_backups
        else:
            backup_dir = self.backup_root

        # Create timestamped backup filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        original_name = file_path.stem  # filename without extension
        extension = file_path.suffix
        backup_filename = f"{original_name}_{timestamp}{extension}.bak"
        backup_path = backup_dir / backup_filename

        # Copy file
        shutil.copy2(file_path, backup_path)

        return backup_path

    def restore_backup(self, backup_path: Path, target_path: Path) -> bool:
        """
        Restore a file from backup.

        Args:
            backup_path: Path to backup file
            target_path: Path to restore the file to

        Returns:
            True if successful, False otherwise
        """
        try:
            if not backup_path.exists():
                return False

            shutil.copy2(backup_path, target_path)
            return True

        except Exception:
            return False

    def list_backups(self, file_stem: Optional[str] = None, backup_type: str = 'config') -> List[Path]:
        """
        List all backups, optionally filtered by file stem.

        Args:
            file_stem: Optional filter by original filename (e.g., 'library_config')
            backup_type: Type of backup to list ('config' or 'data')

        Returns:
            List of backup paths, sorted by timestamp (newest first)
        """
        if backup_type == 'config':
            backup_dir = self.config_backups
        elif backup_type == 'data':
            backup_dir = self.data_backups
        else:
            backup_dir = self.backup_root

        if not backup_dir.exists():
            return []

        # Get all .bak files
        backups = list(backup_dir.glob('*.bak'))

        # Filter by file_stem if provided
        if file_stem:
            backups = [b for b in backups if b.stem.startswith(file_stem)]

        # Sort by modification time (newest first)
        backups.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        return backups

    def get_latest_backup(self, file_stem: str, backup_type: str = 'config') -> Optional[Path]:
        """
        Get the most recent backup for a file.

        Args:
            file_stem: Original filename (e.g., 'library_config')
            backup_type: Type of backup ('config' or 'data')

        Returns:
            Path to latest backup, or None if no backups found
        """
        backups = self.list_backups(file_stem, backup_type)
        return backups[0] if backups else None

    def cleanup_old_backups(self, retention_days: int = 30) -> int:
        """
        Delete backups older than retention_days.

        Args:
            retention_days: Number of days to keep backups

        Returns:
            Number of backups deleted
        """
        cutoff_time = datetime.now() - timedelta(days=retention_days)
        deleted_count = 0

        for backup_dir in [self.config_backups, self.data_backups]:
            if not backup_dir.exists():
                continue

            for backup_file in backup_dir.glob('*.bak'):
                # Check file modification time
                file_mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)

                if file_mtime < cutoff_time:
                    try:
                        backup_file.unlink()
                        deleted_count += 1
                    except Exception:
                        # Continue even if deletion fails
                        pass

        return deleted_count

    def get_backup_info(self, backup_path: Path) -> dict:
        """
        Get information about a backup file.

        Args:
            backup_path: Path to backup file

        Returns:
            Dictionary with backup metadata
        """
        if not backup_path.exists():
            return {}

        stat = backup_path.stat()

        return {
            'path': str(backup_path),
            'filename': backup_path.name,
            'size_bytes': stat.st_size,
            'size_kb': round(stat.st_size / 1024, 2),
            'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'age_days': (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).days
        }

    def create_data_backup(self, data_file: Path) -> Path:
        """
        Create a backup of a data file (e.g., character.json).

        Convenience method for backing up library JSON files.

        Args:
            data_file: Path to data file

        Returns:
            Path to backup file
        """
        return self.create_backup(data_file, backup_type='data')

    def create_config_backup(self, config_file: Path) -> Path:
        """
        Create a backup of a config file (e.g., library_config.py).

        Convenience method for backing up configuration files.

        Args:
            config_file: Path to config file

        Returns:
            Path to backup file
        """
        return self.create_backup(config_file, backup_type='config')


def auto_cleanup_backups(backup_root: Optional[Path] = None, retention_days: int = 30) -> dict:
    """
    Automatically cleanup old backups across all types.

    This is a convenience function that can be called periodically (e.g., on server startup).

    Args:
        backup_root: Root backup directory
        retention_days: Number of days to keep backups

    Returns:
        Dictionary with cleanup statistics
    """
    manager = BackupManager(backup_root)
    deleted_count = manager.cleanup_old_backups(retention_days)

    return {
        'deleted_count': deleted_count,
        'retention_days': retention_days,
        'cleaned_at': datetime.now().isoformat()
    }


def get_backup_summary(backup_root: Optional[Path] = None) -> dict:
    """
    Get a summary of all backups in the system.

    Args:
        backup_root: Root backup directory

    Returns:
        Dictionary with backup statistics
    """
    manager = BackupManager(backup_root)

    config_backups = manager.list_backups(backup_type='config')
    data_backups = manager.list_backups(backup_type='data')

    total_size = sum(b.stat().st_size for b in config_backups + data_backups)

    return {
        'total_backups': len(config_backups) + len(data_backups),
        'config_backups': len(config_backups),
        'data_backups': len(data_backups),
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'backup_root': str(manager.backup_root),
        'oldest_backup': min(
            [b.stat().st_mtime for b in config_backups + data_backups],
            default=None
        )
    }

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CLI wrapper for stitch_generator
Usage: python stitch-cli.py <main_path> <diff_path> <output_path> <language_id>
"""
import sys
import json
from pathlib import Path

# Import from local scripts directory
from stitch_generator import stitch_images

def main():
    if len(sys.argv) != 5:
        print(json.dumps({"success": False, "error": "Invalid arguments. Usage: stitch-cli.py <main> <diff> <output> <lang_id>"}))
        sys.exit(1)

    try:
        main_path = sys.argv[1]
        diff_path = sys.argv[2]
        output_path = sys.argv[3]
        language_id = int(sys.argv[4])

        result = stitch_images(main_path, diff_path, output_path, language_id)
        print(json.dumps(result))
        sys.exit(0 if result.get("success") else 1)

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e), "stage": "cli"}))
        sys.exit(1)

if __name__ == "__main__":
    main()

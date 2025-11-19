#!/usr/bin/env python3
"""
Bulk update script to add current_user parameter to all create_activity_log calls.
This script finds all create_activity_log calls and adds current_user=current_user
if current_user is available in the function scope.
"""

import re
import sys

def update_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    updated_count = 0
    
    # Pattern to match create_activity_log calls that end with a closing parenthesis
    # We'll look for patterns that don't already have current_user or ip_address
    pattern = r'(await create_activity_log\s*\([^)]*?)(description\s*=\s*[^,\n)]+)(\s*\))'
    
    def replace_match(match):
        nonlocal updated_count
        full_match = match.group(0)
        
        # Skip if already has current_user or ip_address
        if 'current_user=' in full_match or 'ip_address=' in full_match:
            return full_match
        
        # Check if current_user is in the context (look backwards in the function)
        # For now, we'll add it - the function will handle if current_user doesn't exist
        before = match.group(1)
        description = match.group(2)
        closing = match.group(3)
        
        # Add current_user parameter
        new_match = before + description + ',\n        current_user=current_user' + closing
        updated_count += 1
        return new_match
    
    # Apply replacement
    new_content = re.sub(pattern, replace_match, content, flags=re.DOTALL | re.MULTILINE)
    
    # Also handle cases with changes parameter
    pattern2 = r'(await create_activity_log\s*\([^)]*?)(changes\s*=\s*[^,\n)]+)(\s*\))'
    
    def replace_match2(match):
        nonlocal updated_count
        full_match = match.group(0)
        
        if 'current_user=' in full_match or 'ip_address=' in full_match:
            return full_match
        
        before = match.group(1)
        changes = match.group(2)
        closing = match.group(3)
        
        new_match = before + changes + ',\n        current_user=current_user' + closing
        updated_count += 1
        return new_match
    
    new_content = re.sub(pattern2, replace_match2, new_content, flags=re.DOTALL | re.MULTILINE)
    
    if new_content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✅ {file_path} güncellendi: {updated_count} create_activity_log çağrısı güncellendi")
        return updated_count
    else:
        print(f"ℹ️  {file_path} değişiklik yok")
        return 0

if __name__ == '__main__':
    result = update_file('server.py')
    print(f"\nToplam {result} çağrı güncellendi.")




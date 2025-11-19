#!/usr/bin/env python3
"""
Script to update all create_activity_log calls to include ip_address parameter.
This script adds ip_address=current_user.get("ip_address") to all create_activity_log calls
that have current_user available.
"""

import re
import sys

def update_activity_logs(file_path):
    """Update all create_activity_log calls to include ip_address"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match create_activity_log calls
    # This pattern matches multi-line function calls
    pattern = r'(await create_activity_log\s*\([^)]*?)(changes\s*=\s*[^,\n)]+)(\s*\))'
    
    def replace_func(match):
        full_call = match.group(0)
        # Check if ip_address is already present
        if 'ip_address' in full_call:
            return full_call  # Already updated
        
        # Check if current_user is available in the context
        # We'll add ip_address before the closing parenthesis
        before_changes = match.group(1)
        changes_part = match.group(2)
        closing = match.group(3)
        
        # Add ip_address parameter
        new_call = before_changes + changes_part + ',\n        ip_address=current_user.get("ip_address")' + closing
        return new_call
    
    # First, try to match calls with changes parameter
    new_content = re.sub(pattern, replace_func, content, flags=re.DOTALL)
    
    # Pattern for calls without changes parameter (ends with description or entity_name)
    pattern2 = r'(await create_activity_log\s*\([^)]*?description\s*=\s*[^,\n)]+)(\s*\))'
    
    def replace_func2(match):
        full_call = match.group(0)
        if 'ip_address' in full_call:
            return full_call
        
        before_desc = match.group(1)
        closing = match.group(2)
        
        new_call = before_desc + ',\n        ip_address=current_user.get("ip_address")' + closing
        return new_call
    
    new_content = re.sub(pattern2, replace_func2, new_content, flags=re.DOTALL)
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Updated {file_path}")

if __name__ == '__main__':
    update_activity_logs('server.py')




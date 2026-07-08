import os
import shutil
import hashlib
import json

def file_sha256(path):
    h = hashlib.sha256()
    try:
        with open(path, 'rb') as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return ""

def count_lines(path):
    try:
        with open(path, 'r', errors='ignore') as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

# Sources of archives inside ./temp_extracted
archives = [
    'aaos-final-enterprise-certification_option_A',
    'aaos-final-enterprise-certification_option_B',
    'aitrademinds-platform-development-brief_option_A',
    'aitrademinds-platform-development-brief_option_B',
    'market-data-platform-expansion_option_A',
    'market-data-platform-expansion_option_B'
]

temp_extracted_dir = './temp_extracted'
workspace_root = '.'

file_inventory = {}

# 1. Scan and index all candidates
for a in archives:
    base_path = os.path.join(temp_extracted_dir, a)
    if not os.path.exists(base_path):
        continue
    for root, dirs, files in os.walk(base_path):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_path)
            
            # Normalize path (remove subfolder wrapper if present)
            norm_path = rel_path
            for prefix in ['AITradeMinds_v1.0.0_Final/', 'AITradeMinds_v1.0.0/', 'AITradeMinds_v1.0.0_Final\\', 'AITradeMinds_v1.0.0\\']:
                if norm_path.startswith(prefix):
                    norm_path = norm_path[len(prefix):]
                    break
            norm_path = norm_path.replace('\\', '/')
            
            sha = file_sha256(full_path)
            size = os.path.getsize(full_path)
            lines = count_lines(full_path)
            
            if norm_path not in file_inventory:
                file_inventory[norm_path] = []
            
            file_inventory[norm_path].append({
                'archive': a,
                'rel_path': rel_path,
                'full_path': full_path,
                'sha': sha,
                'size': size,
                'lines': lines
            })

# 2. Forensic Duplicates Analysis
duplicates_report = []
duplicate_shas = {}
for norm_path, candidates in file_inventory.items():
    shas = set(c['sha'] for c in candidates)
    if len(candidates) > 1:
        duplicates_report.append({
            'normalized_path': norm_path,
            'total_instances': len(candidates),
            'unique_contents': len(shas),
            'candidates': candidates
        })

# 3. Perform Merge and Copying to Workspace Root
# Clean existing workspace boilerplate files to prevent stale residue,
# but let's keep assets, node_modules, .git, downloads etc.
files_to_remove = []
for root, dirs, files in os.walk(workspace_root):
    # Skip system/temporary dirs
    if any(p in root for p in ['.git', 'node_modules', 'downloads', 'temp_extracted', 'assets']):
        continue
    for f in files:
        if f not in ['forensic_reconstruct.py']:
            files_to_remove.append(os.path.join(root, f))

print(f"Cleaning {len(files_to_remove)} boilerplate files...")
for f in files_to_remove:
    try:
        os.remove(f)
    except Exception as e:
        print(f"Error removing {f}: {e}")

# Selection and copy logic
merged_files_log = []
deleted_duplicates_count = 0
total_files_written = 0

# Merge package.json dependencies and scripts
package_json_candidates = file_inventory.get('package.json', [])
merged_dependencies = {}
merged_devDependencies = {}
merged_scripts = {}

for c in package_json_candidates:
    try:
        with open(c['full_path'], 'r') as pf:
            pdata = json.load(pf)
            # Union of dependencies
            merged_dependencies.update(pdata.get('dependencies', {}))
            merged_devDependencies.update(pdata.get('devDependencies', {}))
            merged_scripts.update(pdata.get('scripts', {}))
    except Exception as e:
        print(f"Error parsing package.json candidate {c['full_path']}: {e}")

# Build final package.json
final_package_json = {
    "name": "aitrademinds-operating-system",
    "version": "1.0.0",
    "private": True,
    "scripts": merged_scripts,
    "dependencies": merged_dependencies,
    "devDependencies": merged_devDependencies
}

# We also want to include shadcn, or standard items if any were in boilerplate
try:
    with open('./package.json', 'w') as pf:
        json.dump(final_package_json, pf, indent=2)
    print("Merged and wrote package.json successfully.")
    total_files_written += 1
except Exception as e:
    print(f"Error writing merged package.json: {e}")

# Copy best versions of all files
for norm_path, candidates in file_inventory.items():
    if norm_path == 'package.json':
        continue # handled separately
    
    # Sort candidates by:
    # 1. code completeness (favor market-data-platform-expansion, then aaos-final-enterprise-certification_option_B)
    # 2. file size / line count
    best_candidate = None
    
    # Custom rules for specific files
    if norm_path == 'src/db/schema.ts':
        # Keep the 44KB comprehensive one
        for c in candidates:
            if 'market-data-platform-expansion' in c['archive'] and c['size'] > 40000:
                best_candidate = c
                break
    elif norm_path == 'src/app/globals.css':
        # Prefer the one with actual style content
        candidates_sorted = sorted(candidates, key=lambda x: x['size'], reverse=True)
        best_candidate = candidates_sorted[0]
    elif norm_path == 'next.config.ts' or norm_path == 'next.config.js':
        # Keep the version that supports the latest Next.js config
        candidates_sorted = sorted(candidates, key=lambda x: x['size'], reverse=True)
        best_candidate = candidates_sorted[0]
    
    if not best_candidate:
        # Default: sort by size and line count (most complete implementation)
        candidates_sorted = sorted(candidates, key=lambda x: (x['size'], x['lines']), reverse=True)
        best_candidate = candidates_sorted[0]
    
    # Copy file to destination in workspace
    dest_path = os.path.join(workspace_root, norm_path)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    try:
        shutil.copy2(best_candidate['full_path'], dest_path)
        total_files_written += 1
        # Log if there was a choice and we picked the best
        if len(candidates) > 1:
            merged_files_log.append({
                'normalized_path': norm_path,
                'chosen': best_candidate['full_path'],
                'all_candidates_count': len(candidates)
            })
            deleted_duplicates_count += (len(candidates) - 1)
    except Exception as e:
        print(f"Error copying {norm_path}: {e}")

print(f"Reconstruction completed. Wrote {total_files_written} files.")
print(f"Eliminated {deleted_duplicates_count} duplicates/redundancies.")

# Write duplicates report to a json or use it to generate the markdown reports
with open('duplicates_data.json', 'w') as df:
    json.dump({
        'duplicates_report': duplicates_report,
        'merged_files_log': merged_files_log,
        'deleted_duplicates_count': deleted_duplicates_count,
        'total_files_written': total_files_written
    }, df, indent=2)

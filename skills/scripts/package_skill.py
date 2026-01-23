#!/usr/bin/env python3
import argparse
import os
import re
import sys
import zipfile


SKILL_NAME_RE = re.compile(r"^[a-z0-9-]{1,64}$")


def _parse_frontmatter(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as handle:
        lines = handle.read().splitlines()

    if not lines or lines[0].strip() != "---":
        raise ValueError("SKILL.md must start with YAML frontmatter '---'.")

    end_idx = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_idx = idx
            break
    if end_idx is None:
        raise ValueError("YAML frontmatter must end with '---'.")

    frontmatter_lines = lines[1:end_idx]
    frontmatter = _parse_yaml_minimal(frontmatter_lines)
    return frontmatter


def _parse_yaml_minimal(lines):
    try:
        import yaml  # type: ignore

        content = "\n".join(lines).strip()
        if not content:
            return {}
        parsed = yaml.safe_load(content)
        if parsed is None:
            return {}
        if not isinstance(parsed, dict):
            raise ValueError("Frontmatter must be a mapping.")
        return parsed
    except Exception:
        return _parse_yaml_fallback(lines)


def _parse_yaml_fallback(lines):
    data = {}
    idx = 0
    while idx < len(lines):
        raw = lines[idx]
        if not raw.strip() or raw.strip().startswith("#"):
            idx += 1
            continue
        if ":" not in raw:
            raise ValueError(f"Invalid frontmatter line: '{raw}'")
        key, value = raw.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            raise ValueError(f"Invalid frontmatter key in line: '{raw}'")
        if value in ("|", ">"):
            idx += 1
            block_lines = []
            while idx < len(lines) and (lines[idx].startswith(" ") or lines[idx].startswith("\t")):
                block_lines.append(lines[idx].lstrip())
                idx += 1
            if value == "|":
                data[key] = "\n".join(block_lines).rstrip()
            else:
                data[key] = " ".join(line.strip() for line in block_lines).strip()
            continue
        data[key] = value
        idx += 1
    return data


def _validate_skill(skill_dir: str):
    if not os.path.isdir(skill_dir):
        raise ValueError(f"Skill directory does not exist: {skill_dir}")

    skill_md = os.path.join(skill_dir, "SKILL.md")
    if not os.path.isfile(skill_md):
        raise ValueError("SKILL.md is required in the skill directory.")

    frontmatter = _parse_frontmatter(skill_md)
    allowed_keys = {"name", "description"}
    extra = set(frontmatter.keys()) - allowed_keys
    if extra:
        raise ValueError(f"Frontmatter contains unsupported fields: {sorted(extra)}")
    if "name" not in frontmatter or "description" not in frontmatter:
        raise ValueError("Frontmatter must include 'name' and 'description'.")

    name = str(frontmatter["name"]).strip()
    description = str(frontmatter["description"]).strip()
    if not name or not description:
        raise ValueError("'name' and 'description' must be non-empty.")
    if not SKILL_NAME_RE.match(name):
        raise ValueError(f"Invalid skill name '{name}'. Use lowercase letters, digits, and hyphens.")

    folder_name = os.path.basename(os.path.abspath(skill_dir))
    if name != folder_name:
        raise ValueError(f"Skill name '{name}' must match folder name '{folder_name}'.")

    return name


def _iter_files(skill_dir: str):
    for root, dirs, files in os.walk(skill_dir):
        dirs[:] = [d for d in dirs if d not in {".git", "__pycache__"}]
        for fname in files:
            if fname in {".DS_Store"} or fname.endswith(".pyc"):
                continue
            full_path = os.path.join(root, fname)
            rel_path = os.path.relpath(full_path, skill_dir)
            yield full_path, rel_path


def package_skill(skill_dir: str, output_dir: str | None):
    name = _validate_skill(skill_dir)

    if output_dir is None:
        output_dir = os.getcwd()
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, f"{name}.skill")
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for full_path, rel_path in _iter_files(skill_dir):
            arcname = os.path.join(name, rel_path)
            zf.write(full_path, arcname)

    return output_path


def main():
    parser = argparse.ArgumentParser(description="Package a Codex skill into a .skill file.")
    parser.add_argument("skill_dir", help="Path to the skill folder (must contain SKILL.md).")
    parser.add_argument("output_dir", nargs="?", default=None, help="Output directory for the .skill file.")
    args = parser.parse_args()

    try:
        output_path = package_skill(args.skill_dir, args.output_dir)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Packaged skill: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

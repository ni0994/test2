#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import csv
import json
import sys
from pathlib import Path


def load_meta(meta_path: Path):
    if not meta_path.is_file():
        print(f"[WARN] meta.json not found: {meta_path} (domain略号はデフォルトテーブルを使用します)", file=sys.stderr)
        return None

    try:
        with meta_path.open(encoding="utf-8") as f:
            meta = json.load(f)
    except Exception as e:
        print(f"[WARN] failed to load meta.json: {e} (domain略号はデフォルトテーブルを使用します)", file=sys.stderr)
        return None

    domains = meta.get("domains") or []
    domain_abbr = {}
    for d in domains:
        _id = d.get("id")
        abbr = d.get("abbr")
        if _id and abbr:
            domain_abbr[_id] = abbr

    return {
        "domain_abbr": domain_abbr
    }


def default_domain_abbr():
    return {
        "sec_general": "GEN",
        "sec_mgmt": "MGMT",
        "sec_measures": "MEAS",
        "sec_law": "LAW",
        "it_basic": "ITB",
    }


def build_domain_abbr_map(meta_info):
    if meta_info and meta_info.get("domain_abbr"):
        return meta_info["domain_abbr"]
    return default_domain_abbr()


def generate_id(exam: str, domain: str, domain_abbr_map: dict, counters: dict, width: int = 4) -> str:
    exam = (exam or "").strip().upper()
    domain = (domain or "").strip()
    if not exam:
        raise ValueError("exam is empty")
    if not domain:
        raise ValueError("domain is empty")

    domain_abbr = domain_abbr_map.get(domain)
    if not domain_abbr:
        domain_abbr = domain.upper()

    key = (exam, domain_abbr)
    counters[key] = counters.get(key, 0) + 1
    n = counters[key]

    return f"SEC-{exam}-{domain_abbr}-{str(n).zfill(width)}"


def parse_tags(raw: str):
    if not raw:
        return []
    return [t.strip() for t in raw.split(",") if t.strip()]


VALID_DIFFICULTIES = {"low", "basic", "standard", "hard"}


def csv_to_json(
    input_path: Path,
    output_path: Path,
    meta_path: Path = None,
    fixed_exam: str = None,
    id_width: int = 4,
    prefer_existing_id: bool = False,
):
    meta_info = load_meta(meta_path) if meta_path else None
    domain_abbr_map = build_domain_abbr_map(meta_info)

    records = []
    counters = {}

    with input_path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        line_no = 1  # header

        for row in reader:
            line_no += 1

            try:
                exam = fixed_exam or row.get("exam", "").strip()
                domain = row.get("domain", "").strip()
                difficulty_raw = row.get("difficulty", "").strip()
                tags_raw = row.get("tags", "")
                question = row.get("question", "").strip()
                explanation = row.get("explanation", "").strip()

                # choices
                choices = []
                for i in range(1, 20):
                    key = f"choice{i}"
                    if key not in row:
                        break
                    val = row.get(key, "").strip()
                    if val == "":
                        break
                    choices.append(val)

                answer_raw = row.get("answer", "").strip()

                # バリデーション
                if not exam:
                    raise ValueError("exam is empty")
                if not domain:
                    raise ValueError("domain is empty")
                if not question:
                    raise ValueError("question is empty")
                if len(choices) == 0:
                    raise ValueError("no choices found (choice1〜)")
                if not answer_raw:
                    raise ValueError("answer is empty")

                try:
                    answer_idx = int(answer_raw) - 1
                except ValueError:
                    raise ValueError(f"answer is not integer: {answer_raw}")

                if not (0 <= answer_idx < len(choices)):
                    raise ValueError(f"answer out of range: {answer_raw} for {len(choices)} choices")

                # ★ difficulty: 文字列のまま保持。未定義値は警告を出しつつ通す
                if difficulty_raw:
                    if difficulty_raw not in VALID_DIFFICULTIES:
                        print(f"[WARN] line {line_no}: unknown difficulty '{difficulty_raw}' (expected: {sorted(VALID_DIFFICULTIES)})", file=sys.stderr)
                    difficulty = difficulty_raw
                else:
                    difficulty = None

                tags = parse_tags(tags_raw)

                existing_id = (row.get("id") or "").strip()
                if prefer_existing_id and existing_id:
                    qid = existing_id
                else:
                    qid = generate_id(exam, domain, domain_abbr_map, counters, width=id_width)

                record = {
                    "id": qid,
                    "exam": exam,
                    "domain": domain,
                    "difficulty": difficulty,
                    "tags": tags,
                    "question": question,
                    "choices": choices,
                    "answer": answer_idx,
                    "explanation": explanation,
                }
                records.append(record)

            except Exception as e:
                print(f"[ERROR] line {line_no}: {e}", file=sys.stderr)
                continue

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"[INFO] converted {len(records)} questions -> {output_path}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="CSV -> JSON converter for security exam questions")
    parser.add_argument("input", help="input CSV path")
    parser.add_argument("-o", "--output", required=True, help="output JSON path")
    parser.add_argument("--meta", default="data/meta.json", help="meta.json path (for domain abbrev)")
    parser.add_argument(
        "--exam",
        dest="exam",
        default=None,
        help="override exam code (if not specified in CSV)"
    )
    parser.add_argument(
        "--id-width",
        dest="id_width",
        type=int,
        default=4,
        help="zero-padding width for ID sequence (default: 4 -> 0001)"
    )
    parser.add_argument(
        "--prefer-existing-id",
        action="store_true",
        help="use CSV 'id' column if present instead of auto-generated ID"
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    meta_path = Path(args.meta) if args.meta else None

    if not input_path.is_file():
        print(f"[FATAL] input CSV not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    csv_to_json(
        input_path=input_path,
        output_path=output_path,
        meta_path=meta_path,
        fixed_exam=args.exam,
        id_width=args.id_width,
        prefer_existing_id=args.prefer_existing_id,
    )


if __name__ == "__main__":
    main()

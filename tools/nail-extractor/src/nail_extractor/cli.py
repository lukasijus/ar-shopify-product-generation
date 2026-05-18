from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from .image_io import find_images, load_rgb, save_png_without_metadata
from .masks import detect_nail_candidates, export_candidate_pngs, make_review_sheet
from .metadata import risky_png_chunks
from .scoring import score_image

DEFAULT_INPUT = Path("private/raw/press-on-captures")
DEFAULT_WORK = Path("private/extraction-work")
DEFAULT_PUBLIC = Path("public/nail-assets")


def _write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf8")


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf8"))


def _product_dirs(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path.parent]

    children = sorted(child for child in input_path.iterdir() if child.is_dir())
    return children or [input_path]


def _score_product(product_dir: Path) -> list[dict]:
    scores = []
    for image_path in find_images(product_dir):
        image = load_rgb(image_path)
        scores.append(score_image(image_path, image).to_json())

    scores.sort(key=lambda item: item["total"], reverse=True)
    return scores


def score_command(args: argparse.Namespace) -> int:
    input_path = Path(args.input)
    output_path = Path(args.output)
    products = {}

    for product_dir in _product_dirs(input_path):
        scores = _score_product(product_dir)
        if not scores:
            continue
        products[product_dir.name] = {
            "recommended": scores[0]["path"],
            "scores": scores,
        }

    report = {
        "input": str(input_path),
        "products": products,
    }
    _write_json(output_path, report)
    print(f"Wrote score report: {output_path}")
    return 0


def extract_command(args: argparse.Namespace) -> int:
    input_path = Path(args.input)
    work_dir = Path(args.work_dir)
    expected_count = args.expected_count
    product_dirs = _product_dirs(input_path)
    failures = 0

    for product_dir in product_dirs:
        scores = _score_product(product_dir)
        if not scores:
            print(f"No supported images found in {product_dir}")
            failures += 1
            continue

        product_handle = args.product_handle or product_dir.name
        product_work_dir = work_dir / product_handle
        candidates_dir = product_work_dir / "candidates"
        best_path = Path(scores[0]["path"])
        best_image = load_rgb(best_path)
        best_png = product_work_dir / "best-source.png"
        save_png_without_metadata(best_image, best_png)

        mask, candidates = detect_nail_candidates(best_image, expected_count)
        export_paths = export_candidate_pngs(
            best_image, mask, candidates, candidates_dir
        )
        review_sheet = product_work_dir / "review-sheet.png"
        make_review_sheet(best_image, mask, candidates, review_sheet)

        proposal = {
            "productHandle": product_handle,
            "inputDir": str(product_dir),
            "bestSource": str(best_path),
            "bestSourcePng": str(best_png),
            "reviewSheet": str(review_sheet),
            "expectedCount": expected_count,
            "candidateCount": len(candidates),
            "status": (
                "needs_review"
                if len(candidates) == expected_count
                else "needs_recapture_or_manual_review"
            ),
            "scores": scores,
            "candidates": [
                candidate.to_json() | {"assetPath": str(export_paths[index])}
                for index, candidate in enumerate(candidates)
            ],
        }
        proposal_path = product_work_dir / "proposal.json"
        _write_json(proposal_path, proposal)
        print(f"Wrote extraction proposal: {proposal_path}")

        if len(candidates) != expected_count:
            failures += 1

    return 1 if failures else 0


def approve_command(args: argparse.Namespace) -> int:
    proposal_path = Path(args.proposal)
    proposal = _read_json(proposal_path)
    product_handle = args.product_handle or proposal["productHandle"]
    output_dir = Path(args.output) / product_handle
    candidates = proposal.get("candidates", [])

    if len(candidates) != proposal.get("expectedCount") and not args.force:
        raise SystemExit(
            "Proposal candidate count does not match expected count. "
            "Use --force only after manually reviewing the proposal."
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        "productHandle": product_handle,
        "sourceProposal": proposal_path.name,
        "bestSource": Path(proposal["bestSource"]).name,
        "assets": [],
    }

    for candidate in candidates:
        finger = candidate["finger"]
        source = Path(candidate["assetPath"])
        target = output_dir / f"{finger}.png"
        shutil.copyfile(source, target)
        chunks = risky_png_chunks(target)
        if chunks:
            raise SystemExit(f"{target} contains risky PNG metadata chunks: {chunks}")
        metadata["assets"].append(
            {
                "finger": finger,
                "path": f"/nail-assets/{product_handle}/{target.name}",
                "bbox": candidate["bbox"],
                "confidence": candidate["confidence"],
            }
        )

    _write_json(output_dir / "metadata.json", metadata)
    print(f"Approved nail assets: {output_dir}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="nail-extractor",
        description="Score, extract, and approve press-on nail clips.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    score = subparsers.add_parser("score", help="Score capture quality.")
    score.add_argument("--input", default=str(DEFAULT_INPUT))
    score.add_argument("--output", default=str(DEFAULT_WORK / "scores.json"))
    score.set_defaults(func=score_command)

    extract = subparsers.add_parser("extract", help="Generate extraction proposals.")
    extract.add_argument("--input", default=str(DEFAULT_INPUT))
    extract.add_argument("--work-dir", default=str(DEFAULT_WORK))
    extract.add_argument("--product-handle")
    extract.add_argument("--expected-count", type=int, default=5)
    extract.set_defaults(func=extract_command)

    approve = subparsers.add_parser("approve", help="Approve a reviewed proposal.")
    approve.add_argument("--proposal", required=True)
    approve.add_argument("--output", default=str(DEFAULT_PUBLIC))
    approve.add_argument("--product-handle")
    approve.add_argument("--force", action="store_true")
    approve.set_defaults(func=approve_command)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)

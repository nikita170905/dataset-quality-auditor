"""
Offline tuning of the label-noise cutoff from reports you ALREADY downloaded.

Needs, in the folder you run it from:
  report_00.json report_05.json report_10.json report_20.json
  flip_test/flip_05_TRUTH.csv flip_test/flip_10_TRUTH.csv flip_test/flip_20_TRUTH.csv

  python tune_cutoff.py [folder_with_reports=.] [truth_folder=flip_test]

Each flagged row in a report carries label_quality = P(given label) from the
model. Keeping only rows with label_quality < cutoff simulates a stricter detector,
so we can see how score, precision and recall would change WITHOUT re-running.
"""
import json
import os
import sys

import pandas as pd

folder = sys.argv[1] if len(sys.argv) > 1 else "."
truth_dir = sys.argv[2] if len(sys.argv) > 2 else "flip_test"
CUTOFFS = [0.25, 0.20, 0.15, 0.10, 0.07, 0.05, 0.03]
SLOPE = 300.0

reports = {}
for pct in ("00", "05", "10", "20"):
    path = os.path.join(folder, f"report_{pct}.json")
    if os.path.exists(path):
        reports[pct] = json.load(open(path, encoding="utf-8"))
if not reports:
    sys.exit("No report_XX.json files found.")

truth = {}
for pct in ("05", "10", "20"):
    path = os.path.join(truth_dir, f"flip_{pct}_TRUTH.csv")
    if os.path.exists(path):
        truth[pct] = set(pd.read_csv(path).flipped_row_index)

print("Score = 100 - 300 x (fraction flagged).  Want: 00 high, then falling steadily; precision high.\n")
header = f"{'cutoff':>7} | " + " | ".join(f"{'score ' + p + '%':>10}" for p in reports) + " | " + \
         " | ".join(f"{'P/R ' + p + '%':>11}" for p in truth if p in reports)
print(header)
print("-" * len(header))
for c in CUTOFFS:
    cells, pr = [], []
    for pct, rep in reports.items():
        rows = rep["text_summary"]["row_count"]
        kept = [i for i in rep["text_summary"]["label_noise_issues"] if i["label_quality"] < c]
        cells.append(f"{max(0.0, min(100.0, 100 - SLOPE * len(kept) / rows)):10.1f}")
        if pct in truth:
            idx = {i["idx"] for i in kept}
            hit = len(idx & truth[pct])
            pr.append(f"{(hit / len(idx) if idx else 0):.2f}/{hit / len(truth[pct]):.2f}".rjust(11))
    print(f"{c:7.2f} | " + " | ".join(cells) + " | " + " | ".join(pr))
print("\nP/R = precision/recall against the rows you actually flipped.")

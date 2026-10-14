"""Run the planning model and export one JSON file per table to ../data/.

Usage (from the repository root):  python data_model/export.py
Requires: Python 3.10+, numpy
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan3 import *            # builds the whole model (master -> products -> plan1 -> plan2 -> plan3)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(OUT, exist_ok=True)
d = json.load(open("data.json"))
weeks = [{"idx": i, "Week": w, "WeekStart": s, "Month": s[:7], "Today": d["meta"]["today"]}
         for i, (w, s) in enumerate(zip(d["meta"]["weeks"], d["meta"]["weekStarts"]))]
tables = {k: d[k] for k in ["products","materials","bom","suppliers","demand","mps","mrp","pos","recs","capacity","lines"]}
tables["weeks"] = weeks
for k, v in tables.items():
    json.dump(v, open(os.path.join(OUT, k + ".json"), "w"), separators=(",", ":"))
    print(f"{k:10s} {len(v):5d} rows")
os.remove("data.json")

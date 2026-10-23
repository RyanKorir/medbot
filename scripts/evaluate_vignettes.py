"""Scores the symptom checker against clinician-written vignettes.

Usage:  python3 scripts/evaluate_vignettes.py path/to/vignettes.csv
Reports top-1 / top-3 accuracy and, most importantly, UNDER-triage (the checker said less urgent than the clinician).
It mirrors src/lib/predict.ts: Naive Bayes with Kenyan priors, the can't-miss rule, the red-flag override and a one-level bump for under-5s and 65+.
"""
import csv, json, math, re, sys

model = json.load(open("src/data/model.json"))
sym_idx = {s: i for i, s in enumerate(model["symptoms"])}
triage = open("src/lib/triage.ts").read()
meta = {m[0]: {"label": m[1], "urgency": m[2]} for m in re.findall(r'"([^"]+)":\s*\{ label: "([^"]+)", specialty: "[^"]+", urgency: "(\w+)"', triage)}
RED = ["chest_pain", "breathlessness", "coma", "altered_sensorium", "slurred_speech", "weakness_of_one_body_side", "blood_in_sputum", "stomach_bleeding", "bloody_stool", "loss_of_balance"]
ORDER = ["routine", "soon", "emergency"]

def posterior(idx, prior):
    sc = [prior[d] + sum(model["logp"][d][j] for j in idx) for d in range(len(model["diseases"]))]
    m = max(sc); e = [math.exp(x - m) for x in sc]; t = sum(e)
    return [x / t for x in e]

def assess(symptoms, age):
    idx = [sym_idx[s] for s in symptoms if s in sym_idx]
    local, neutral = posterior(idx, model["priors"]), posterior(idx, model["priors_flat"])
    order = sorted(range(len(local)), key=lambda i: -local[i])
    shown = order[:3]
    missed = [i for i in order[3:] if meta[model["diseases"][i]]["urgency"] == "emergency" and neutral[i] >= 0.15]
    if missed: shown[2] = max(missed, key=lambda i: neutral[i])
    top = [meta[model["diseases"][i]]["label"] for i in shown]
    urg = meta[model["diseases"][order[0]]]["urgency"]
    if any(s in RED for s in symptoms): urg = "emergency"
    elif age in ("child", "senior") and urg != "emergency": urg = ORDER[min(ORDER.index(urg) + 1, 2)]
    return top, urg

rows = [r for r in csv.DictReader(l for l in open(sys.argv[1]) if not l.startswith("#"))]
n = top1 = top3 = under = over = 0
misses = []
for r in rows:
    top, urg = assess(r["symptoms"].split("|"), (r.get("age_group") or "").strip())
    n += 1; exp = r["expected_condition"].strip()
    top1 += top[0] == exp; top3 += exp in top
    d = ORDER.index(urg) - ORDER.index(r["expected_urgency"].strip())
    under += d < 0; over += d > 0
    if top[0] != exp or d < 0: misses.append((r["symptoms"], exp, top[0], r["expected_urgency"], urg))
print(f"cases: {n}\ntop-1 accuracy: {top1/n:.0%}\ntop-3 accuracy: {top3/n:.0%}\nunder-triage: {under}/{n} ({under/n:.0%})  <- the number that matters most\nover-triage:  {over}/{n} ({over/n:.0%})")
for m in misses: print("MISS:", m)

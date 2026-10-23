"""Builds src/data/model.json (Naive Bayes tables) from Training.csv.

Priors: `priors` weights each condition by how common it is in Kenyan outpatient care (scripts/kenya_priors.csv);
`priors_flat` is the uniform version, used for the "can't-miss" safety rule in src/lib/predict.ts.
"""
import csv, json, math
from collections import defaultdict
rows = list(csv.reader(open('scripts/Training.csv')))
head = [h.strip() for h in rows[0]]
if head[-1] == '': head = head[:-1]
data = [r[:len(head)] for r in rows[1:] if r and r[0] != '']
symptoms = head[:-1]
by = defaultdict(list)
for r in data:
    by[r[-1].strip()].append([int(float(x)) for x in r[:-1]])
diseases = sorted(by)
n = len(data)
alpha = 1.0
kw = {r["disease"]: float(r["weight"]) for r in csv.DictReader(open('scripts/kenya_priors.csv'))}
missing = [d for d in diseases if d not in kw]
assert not missing, f"no Kenya weight for {missing}"
wsum = sum(kw[d] for d in diseases)
priors, priors_flat, probs = [], [], []
for d in diseases:
    m = by[d]
    priors.append(round(math.log(kw[d] / wsum), 4))
    priors_flat.append(round(math.log(len(m) / n), 4))
    probs.append([round(math.log((sum(row[j] for row in m) + alpha) / (len(m) + 2 * alpha)), 3) for j in range(len(symptoms))])
json.dump({"symptoms": symptoms, "diseases": diseases, "priors": priors, "priors_flat": priors_flat, "logp": probs}, open('src/data/model.json', 'w'), separators=(',', ':'))
print(len(symptoms), 'symptoms', len(diseases), 'diseases', n, 'rows')

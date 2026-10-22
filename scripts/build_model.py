"""Builds src/data/model.json (Naive Bayes tables) from Training.csv."""
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
priors, probs = [], []
for d in diseases:
    m = by[d]
    priors.append(round(math.log(len(m) / n), 4))
    probs.append([round(math.log((sum(row[j] for row in m) + alpha) / (len(m) + 2 * alpha)), 3) for j in range(len(symptoms))])
json.dump({"symptoms": symptoms, "diseases": diseases, "priors": priors, "logp": probs}, open('src/data/model.json', 'w'), separators=(',', ':'))
print(len(symptoms), 'symptoms', len(diseases), 'diseases', n, 'rows')

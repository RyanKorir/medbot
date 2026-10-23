# Datasets: what was evaluated for Medbot's symptom checker

Medbot's checker maps a list of symptoms to likely conditions. Only datasets with that shape can train it.

## In use
| Data | What it is | How it is used |
|---|---|---|
| Kaggle "Disease Prediction Using Machine Learning" (`Training.csv`) | 4,920 synthetic patient rows, 41 conditions, 132 symptoms | Symptom likelihoods per condition |
| KNBS Economic Survey 2025; KNBS 2018 and 2022 morbidity reports; county health plans | Kenyan outpatient disease burden: respiratory infections, malaria, skin disease, diarrhoea and UTI lead | Prior weights per condition in `scripts/kenya_priors.csv` (tiers, not exact percentages) |

## Evaluated, not usable yet
| Data | Why |
|---|---|
| **DDXPlus** (Mila, CC-BY 4.0): 1.3M synthetic patients, 49 conditions, severity, differential diagnoses | Best public candidate. Data is hosted on figshare, which the build environment cannot reach. Generated from a North-American knowledge base, so it lacks malaria, typhoid and similar. Next step: download `release_train_patients`, `release_evidences.json`, `release_conditions.json` and share them; a mapping to Medbot's symptom list is needed. Cite the NeurIPS 2022 paper if used. |
| Other Kaggle symptom-disease sets (e.g. "Disease Symptom Prediction", "Symptom2Disease") | Mostly the same source rows or text descriptions of the same few diseases. Merging them adds no new information. |
| HPO / Orphanet | Rare-disease ontologies. Wrong population for a primary-care checker. |
| MIMIC-III/IV, eICU | ICU records, credentialed access, US hospital population. Not symptom-level. |
| NIH ChestX-ray, CheXpert, HAM10000 | Images. A different product (photo triage) with regulatory and validation needs. |
| PubMedQA, MedQA, MedMCQA | Question-answering text for language models. Not training data for this checker. |

## What would actually improve accuracy next
1. Clinician-written vignettes from Kenyan doctors, scored with `scripts/evaluate_vignettes.py`.
2. Confirmed diagnoses recorded by doctors when they close a consultation (collected automatically, see /admin).
3. KHIS facility data for exact local prevalence (replaces the tiers).
4. DDXPlus, mapped carefully, for severity labels and common respiratory/GI conditions.

import model from "@/data/model.json";
import { DISEASES, RED_FLAGS, type DiseaseMeta, type Urgency } from "./triage";

export type AgeGroup = "" | "child" | "adult" | "senior";
export type Prediction = DiseaseMeta & { key: string; probability: number; cantMiss?: boolean };
export type Assessment = {
  predictions: Prediction[];
  urgency: Urgency;
  redFlags: string[];
  lowConfidence: boolean;
  ageBumped: boolean;
};

const ORDER: Urgency[] = ["routine", "soon", "emergency"];

/**
 * Naive Bayes over the selected symptoms. Runs fully in the browser: symptoms never leave the device.
 * Safety rules (symptom checkers under-triage ~13% of the time in studies, so we lean cautious):
 *  - any red-flag symptom => emergency
 *  - children under 5 and adults 65+ are bumped one urgency level
 *  - fewer than 3 symptoms or a weak top match => flagged as low confidence
 *  - ranking uses Kenyan outpatient prevalence (priors); a "can't-miss" rule then makes sure a dangerous condition that the
 *    symptoms fit (15%+ on a neutral, equal-prevalence reading) is always shown, even if a common condition outranks it
 */
export function assess(selected: string[], age: AgeGroup = ""): Assessment {
  const idx = selected.map((s) => model.symptoms.indexOf(s)).filter((i) => i >= 0);
  const redFlags = selected.filter((s) => RED_FLAGS.includes(s));
  if (idx.length === 0) return { predictions: [], urgency: "routine", redFlags, lowConfidence: true, ageBumped: false };

  const lik = model.diseases.map((_, d) => idx.reduce((a, j) => a + model.logp[d][j], 0));
  const posterior = (prior: number[]) => {
    const sc = lik.map((l, d) => prior[d] + l);
    const max = Math.max(...sc);
    const ex = sc.map((x) => Math.exp(x - max));
    const sum = ex.reduce((a, b) => a + b, 0);
    return ex.map((e) => e / sum);
  };
  const local = posterior(model.priors);       // Kenyan prevalence: used for ranking
  const neutral = posterior(model.priors_flat); // equal prevalence: used for the can't-miss rule

  const ranked = local
    .map((probability, i) => ({ i, key: model.diseases[i], probability, ...DISEASES[model.diseases[i]] } as Prediction & { i: number }))
    .sort((a, b) => b.probability - a.probability);
  const predictions: Prediction[] = ranked.slice(0, 3);
  const missed = ranked
    .slice(3)
    .filter((r) => r.urgency === "emergency" && neutral[r.i] >= 0.15)
    .sort((a, b) => neutral[b.i] - neutral[a.i])[0];
  if (missed) predictions[2] = { ...missed, cantMiss: true };

  let urgency: Urgency = predictions[0].urgency;
  let ageBumped = false;
  if (redFlags.length > 0) urgency = "emergency";
  else if ((age === "child" || age === "senior") && urgency !== "emergency") {
    urgency = ORDER[Math.min(ORDER.indexOf(urgency) + 1, 2)];
    ageBumped = urgency !== predictions[0].urgency;
  }
  const lowConfidence = selected.length < 3 || predictions[0].probability < 0.5;
  return { predictions, urgency, redFlags, lowConfidence, ageBumped };
}

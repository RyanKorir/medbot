import model from "@/data/model.json";
import { DISEASES, RED_FLAGS, type DiseaseMeta, type Urgency } from "./triage";

export type Prediction = DiseaseMeta & { key: string; probability: number };
export type Assessment = { predictions: Prediction[]; urgency: Urgency; redFlags: string[] };

/** Naive Bayes over the selected symptoms. Runs fully in the browser: symptoms never leave the device. */
export function assess(selected: string[]): Assessment {
  const idx = selected.map((s) => model.symptoms.indexOf(s)).filter((i) => i >= 0);
  const redFlags = selected.filter((s) => RED_FLAGS.includes(s));
  if (idx.length === 0) return { predictions: [], urgency: "routine", redFlags };

  const scores = model.diseases.map((_, d) => model.priors[d] + idx.reduce((a, j) => a + model.logp[d][j], 0));
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);

  const predictions: Prediction[] = exps
    .map((e, i) => {
      const key = model.diseases[i];
      return { key, probability: e / sum, ...DISEASES[key] };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);

  let urgency: Urgency = predictions[0].urgency;
  if (redFlags.length > 0) urgency = "emergency";
  return { predictions, urgency, redFlags };
}

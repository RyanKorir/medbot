import model from "@/data/model.json";
import { DISEASES, RED_FLAGS, type DiseaseMeta, type Urgency } from "./triage";

export type AgeGroup = "" | "child" | "adult" | "senior";
export type Prediction = DiseaseMeta & { key: string; probability: number };
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
 */
export function assess(selected: string[], age: AgeGroup = ""): Assessment {
  const idx = selected.map((s) => model.symptoms.indexOf(s)).filter((i) => i >= 0);
  const redFlags = selected.filter((s) => RED_FLAGS.includes(s));
  if (idx.length === 0) return { predictions: [], urgency: "routine", redFlags, lowConfidence: true, ageBumped: false };

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
  let ageBumped = false;
  if (redFlags.length > 0) urgency = "emergency";
  else if ((age === "child" || age === "senior") && urgency !== "emergency") {
    urgency = ORDER[Math.min(ORDER.indexOf(urgency) + 1, 2)];
    ageBumped = urgency !== predictions[0].urgency;
  }
  const lowConfidence = selected.length < 3 || predictions[0].probability < 0.5;
  return { predictions, urgency, redFlags, lowConfidence, ageBumped };
}

import model from "@/data/model.json";

export type Urgency = "emergency" | "soon" | "routine";
export type DiseaseMeta = { label: string; specialty: string; urgency: Urgency };

/** Corrected specialist routing (the original app mapped e.g. Hypothyroidism -> ENT). */
export const DISEASES: Record<string, DiseaseMeta> = {
  "(vertigo) Paroymsal  Positional Vertigo": { label: "Positional vertigo (BPPV)", specialty: "ENT", urgency: "soon" },
  "AIDS": { label: "HIV/AIDS", specialty: "Infectious Disease", urgency: "soon" },
  "Acne": { label: "Acne", specialty: "Dermatologist", urgency: "routine" },
  "Alcoholic hepatitis": { label: "Alcoholic hepatitis", specialty: "Gastroenterologist", urgency: "soon" },
  "Allergy": { label: "Allergy", specialty: "General Practitioner", urgency: "routine" },
  "Arthritis": { label: "Arthritis", specialty: "Rheumatologist", urgency: "routine" },
  "Bronchial Asthma": { label: "Bronchial asthma", specialty: "Pulmonologist", urgency: "soon" },
  "Cervical spondylosis": { label: "Cervical spondylosis", specialty: "Orthopedist", urgency: "routine" },
  "Chicken pox": { label: "Chicken pox", specialty: "General Practitioner", urgency: "routine" },
  "Chronic cholestasis": { label: "Chronic cholestasis", specialty: "Gastroenterologist", urgency: "soon" },
  "Common Cold": { label: "Common cold", specialty: "General Practitioner", urgency: "routine" },
  "Dengue": { label: "Dengue", specialty: "Infectious Disease", urgency: "soon" },
  "Diabetes": { label: "Diabetes", specialty: "Endocrinologist", urgency: "soon" },
  "Dimorphic hemmorhoids(piles)": { label: "Haemorrhoids (piles)", specialty: "General Surgeon", urgency: "routine" },
  "Drug Reaction": { label: "Drug reaction", specialty: "General Practitioner", urgency: "soon" },
  "Fungal infection": { label: "Fungal infection", specialty: "Dermatologist", urgency: "routine" },
  "GERD": { label: "Acid reflux (GERD)", specialty: "Gastroenterologist", urgency: "routine" },
  "Gastroenteritis": { label: "Gastroenteritis", specialty: "Gastroenterologist", urgency: "soon" },
  "Heart attack": { label: "Heart attack", specialty: "Cardiologist", urgency: "emergency" },
  "Hepatitis B": { label: "Hepatitis B", specialty: "Gastroenterologist", urgency: "soon" },
  "Hepatitis C": { label: "Hepatitis C", specialty: "Gastroenterologist", urgency: "soon" },
  "Hepatitis D": { label: "Hepatitis D", specialty: "Gastroenterologist", urgency: "soon" },
  "Hepatitis E": { label: "Hepatitis E", specialty: "Gastroenterologist", urgency: "soon" },
  "hepatitis A": { label: "Hepatitis A", specialty: "Gastroenterologist", urgency: "soon" },
  "Hypertension": { label: "Hypertension", specialty: "Cardiologist", urgency: "soon" },
  "Hyperthyroidism": { label: "Hyperthyroidism", specialty: "Endocrinologist", urgency: "soon" },
  "Hypothyroidism": { label: "Hypothyroidism", specialty: "Endocrinologist", urgency: "routine" },
  "Hypoglycemia": { label: "Low blood sugar", specialty: "Endocrinologist", urgency: "soon" },
  "Impetigo": { label: "Impetigo", specialty: "Dermatologist", urgency: "routine" },
  "Jaundice": { label: "Jaundice", specialty: "Gastroenterologist", urgency: "soon" },
  "Malaria": { label: "Malaria", specialty: "Infectious Disease", urgency: "soon" },
  "Migraine": { label: "Migraine", specialty: "Neurologist", urgency: "routine" },
  "Osteoarthristis": { label: "Osteoarthritis", specialty: "Orthopedist", urgency: "routine" },
  "Paralysis (brain hemorrhage)": { label: "Stroke / brain haemorrhage", specialty: "Neurologist", urgency: "emergency" },
  "Peptic ulcer diseae": { label: "Peptic ulcer", specialty: "Gastroenterologist", urgency: "soon" },
  "Pneumonia": { label: "Pneumonia", specialty: "Pulmonologist", urgency: "soon" },
  "Psoriasis": { label: "Psoriasis", specialty: "Dermatologist", urgency: "routine" },
  "Tuberculosis": { label: "Tuberculosis", specialty: "Pulmonologist", urgency: "soon" },
  "Typhoid": { label: "Typhoid", specialty: "Infectious Disease", urgency: "soon" },
  "Urinary tract infection": { label: "Urinary tract infection", specialty: "Urologist", urgency: "soon" },
  "Varicose veins": { label: "Varicose veins", specialty: "Vascular Surgeon", urgency: "routine" },
};

/** Any of these symptoms triggers an emergency warning regardless of the model output. */
export const RED_FLAGS = [
  "chest_pain", "breathlessness", "coma", "altered_sensorium", "slurred_speech",
  "weakness_of_one_body_side", "blood_in_sputum", "stomach_bleeding", "bloody_stool", "loss_of_balance",
];

export const SPECIALTIES = Array.from(new Set(Object.values(DISEASES).map((d) => d.specialty))).sort();

export function symptomLabel(s: string): string {
  const t = s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const ALL_SYMPTOMS: string[] = model.symptoms;

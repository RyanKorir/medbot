// Exports one consultation as a FHIR R4 Bundle (JSON). Symptoms and conditions use free-text codes: the checker's
// dataset is not mapped to SNOMED CT / ICD-10, and the automated match is marked "provisional", never a diagnosis.
export type FhirInput = {
  id: string; created_at?: string; status: string; urgency: string | null; symptoms: string[];
  top_prediction: string | null; final_dx: string | null; age_group: string | null; sex: string | null;
  patient: { id: string; name: string }; doctor: { id: string; name: string; licence: string | null };
  messages: { id: number; sender_id: string; body: string; created_at: string }[];
};

const tidy = (s: string) => { const t = s.replace(/_/g, " ").replace(/\s+/g, " ").trim(); return t.charAt(0).toUpperCase() + t.slice(1); };

export function buildBundle(i: FhirInput) {
  const patient = `Patient/${i.patient.id}`, prac = `Practitioner/${i.doctor.id}`, enc = `Encounter/${i.id}`;
  const entry = (resource: Record<string, unknown>) => ({ fullUrl: `urn:uuid:${resource.id}`, resource });
  const entries = [
    entry({ resourceType: "Patient", id: i.patient.id, name: [{ text: i.patient.name }], ...(i.sex ? { gender: i.sex } : {}) }),
    entry({ resourceType: "Practitioner", id: i.doctor.id, name: [{ text: i.doctor.name }],
      ...(i.doctor.licence ? { identifier: [{ system: "urn:medbot:kmpdc-licence", value: i.doctor.licence }] } : {}) }),
    entry({ resourceType: "Encounter", id: i.id, status: i.status === "closed" ? "finished" : "in-progress",
      class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "VR", display: "virtual" },
      subject: { reference: patient }, participant: [{ individual: { reference: prac } }],
      period: { start: i.created_at }, ...(i.urgency ? { priority: { text: i.urgency } } : {}) }),
    ...i.symptoms.map((s, n) => entry({ resourceType: "Observation", id: `${i.id}-sym-${n}`, status: "preliminary",
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "survey" }] }],
      code: { text: tidy(s) }, valueBoolean: true, subject: { reference: patient }, encounter: { reference: enc } })),
    ...(i.age_group ? [entry({ resourceType: "Observation", id: `${i.id}-age`, status: "preliminary", code: { text: "Age group (self-reported)" },
      valueString: i.age_group === "child" ? "under 5" : i.age_group === "senior" ? "65 or older" : "5 to 64", subject: { reference: patient }, encounter: { reference: enc } })] : []),
    ...(i.top_prediction ? [entry({ resourceType: "Condition", id: `${i.id}-auto`,
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
      verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "provisional" }] },
      code: { text: i.top_prediction }, subject: { reference: patient }, encounter: { reference: enc },
      note: [{ text: "Automated symptom-checker match. Not a diagnosis." }] })] : []),
    ...(i.final_dx ? [entry({ resourceType: "Condition", id: `${i.id}-dx`,
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
      verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }] },
      code: { text: i.final_dx }, subject: { reference: patient }, encounter: { reference: enc }, recorder: { reference: prac } })] : []),
    ...i.messages.map((m) => entry({ resourceType: "Communication", id: `${i.id}-msg-${m.id}`, status: "completed",
      sender: { reference: m.sender_id === i.doctor.id ? prac : patient }, subject: { reference: patient }, encounter: { reference: enc },
      sent: m.created_at, payload: [{ contentString: m.body }] })),
  ];
  return { resourceType: "Bundle", type: "collection", timestamp: new Date().toISOString(), entry: entries };
}

export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/fhir+json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

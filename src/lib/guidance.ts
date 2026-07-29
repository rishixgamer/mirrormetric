import {
  GUIDANCE_SCHEMA_VERSION,
  type GoalProfileId,
  type GuidanceItem,
  type MeasurementResult,
} from "../domain/contracts";

const AAD_COSMETIC_SAFETY =
  "https://www.aad.org/public/cosmetic/safety/ask-questions";
const FDA_FILLER_SAFETY =
  "https://www.fda.gov/medical-devices/aesthetic-cosmetic-devices/dermal-fillers-soft-tissue-fillers";
const ASPS_PATIENT_SAFETY =
  "https://www.plasticsurgery.org/patient-safety";

export function buildGuidance(
  measurements: ReadonlyArray<MeasurementResult>,
  goalProfileId: GoalProfileId,
): GuidanceItem[] {
  const unstable = measurements.filter(
    (measurement) => measurement.stability === "unstable",
  );
  const lowConfidence = measurements.filter(
    (measurement) => measurement.confidence < 70,
  );
  const guidance: Array<Omit<GuidanceItem, "version">> = [
    {
      id: "repeatable-capture",
      title: "Create a repeatable photo baseline",
      summary:
        "Use the same camera, distance, eye-level height, neutral expression, and diffuse front lighting each time.",
      why:
        unstable.length > 0
          ? `${unstable.length} measurement${unstable.length === 1 ? " was" : "s were"} unstable across this scan.`
          : "Consistent capture conditions make progress comparisons more meaningful.",
      evidenceLevel: "capture-standard",
      reversible: true,
      sourceLabel: "MirrorMetric capture protocol",
    },
    {
      id: `goal-${goalProfileId}`,
      title: `Explore the ${goalProfileId} presentation profile`,
      summary:
        goalProfileId === "angular"
          ? "Try reversible silhouette changes that add clearer lines, such as structured hair shape, brow definition, or facial-hair edges when relevant to you."
          : goalProfileId === "soft"
            ? "Try reversible silhouette changes that soften transitions, such as less rigid hair outlines, blended brow edges, or diffused makeup when relevant to you."
            : goalProfileId === "androgynous"
              ? "Experiment with a mix of structured and softened elements without treating either as gendered or required."
              : "Keep one element at a time neutral, then compare how balanced combinations feel to you.",
      why:
        "You selected this subjective goal profile; it is not inferred from identity.",
      evidenceLevel: "reversible-experiment",
      reversible: true,
      sourceLabel:
        "Project hypothesis—presentation experiment, not clinical evidence",
    },
    {
      id: "one-change",
      title: "Test one reversible change at a time",
      summary:
        "Keep a short note beside each local scan so you can compare a single styling or capture change instead of chasing a score.",
      why:
        "Single-variable comparisons are easier to interpret than changing several things at once.",
      evidenceLevel: "reversible-experiment",
      reversible: true,
      sourceLabel: "MirrorMetric comparison protocol",
    },
  ];

  if (lowConfidence.length > 0) {
    guidance.splice(1, 0, {
      id: "confidence-first",
      title: "Improve confidence before interpreting proportions",
      summary:
        "Retake the precision scan before using low-confidence measurements in a style experiment.",
      why: `${lowConfidence.length} measurement${lowConfidence.length === 1 ? " has" : "s have"} confidence below 70%.`,
      evidenceLevel: "capture-standard",
      reversible: true,
      sourceLabel: "MirrorMetric uncertainty policy",
    });
  }

  guidance.push(
    {
      id: "cosmetic-consultation",
      title: "Questions for a cosmetic consultation",
      summary:
        "If you are independently considering a cosmetic treatment, review indications, alternatives, realistic outcomes, downtime, cost, and risks with a qualified clinician.",
      why:
        "This educational card appears for every adult user and is never triggered by a measurement.",
      evidenceLevel: "professional-education",
      reversible: false,
      sourceLabel: "American Academy of Dermatology",
      sourceUrl: AAD_COSMETIC_SAFETY,
      safetyNote:
        "MirrorMetric cannot determine whether a treatment is appropriate for you.",
    },
    {
      id: "filler-safety",
      title: "Understand injectable-filler risk",
      summary:
        "Dermal fillers are medical procedures and can cause temporary or permanent complications, including rare but serious vascular injury.",
      why:
        "This is general safety education, not a recommendation to seek or avoid a procedure.",
      evidenceLevel: "professional-education",
      reversible: false,
      sourceLabel: "U.S. Food and Drug Administration",
      sourceUrl: FDA_FILLER_SAFETY,
      safetyNote:
        "Only a qualified licensed professional can discuss individual risks and contraindications.",
    },
    {
      id: "surgeon-safety",
      title: "Verify surgical qualifications and facilities",
      summary:
        "If you are independently considering surgery, verify board certification, relevant experience, accredited facilities, alternatives, and recovery risks.",
      why:
        "This is a universal safety resource and is not personalized to your face.",
      evidenceLevel: "professional-education",
      reversible: false,
      sourceLabel: "American Society of Plastic Surgeons",
      sourceUrl: ASPS_PATIENT_SAFETY,
      safetyNote:
        "No facial measurement can establish medical necessity or predict an outcome.",
    },
  );

  return guidance.map((item) => ({
    ...item,
    version: GUIDANCE_SCHEMA_VERSION,
  }));
}

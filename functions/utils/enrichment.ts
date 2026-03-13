import type { AiEnrichment, DifficultyLevel, VocabItem } from "../../shared/types";

const synonymHints: Array<{ match: RegExp; values: string[] }> = [
  { match: /\bchase it up\b|\bchase up\b/i, values: ["follow up", "check in", "nudge"] },
  { match: /\bbuy-?in\b/i, values: ["support", "alignment", "approval"] },
  { match: /\bbridge the gap\b/i, values: ["close the gap", "fill the gap"] },
  { match: /\bweigh in\b/i, values: ["comment", "give input", "share a view"] },
  { match: /\bup to speed\b/i, values: ["fully briefed", "caught up"] },
  { match: /\bflesh out\b/i, values: ["elaborate", "add detail", "polish"] },
  { match: /\bdip\b/i, values: ["decline", "drop"] },
  { match: /\bspike\b/i, values: ["surge", "jump"] }
];

const antonymHints: Array<{ match: RegExp; values: string[] }> = [
  { match: /\bdip\b|\bdecline\b|\bdrop\b/i, values: ["spike", "surge", "increase"] },
  { match: /\bspike\b|\bsurge\b|\bincrease\b/i, values: ["dip", "decline", "drop"] },
  { match: /\bapprove\b|\bbuy-?in\b/i, values: ["reject", "push back"] },
  { match: /\brisk\b|\bthreat\b/i, values: ["stability", "certainty"] },
  { match: /\bwind down\b|\bdeprecat/i, values: ["ramp up", "launch"] }
];

const groupRules: Array<{
  group: string;
  intent: string;
  match: RegExp;
}> = [
  {
    group: "follow-up",
    intent: "follow up on progress or accountability",
    match: /\bfollow up\b|\bchase\b|\bstay on top\b|\bat your earliest\b/i
  },
  {
    group: "meeting communication",
    intent: "steer or participate in meeting discussion",
    match: /\bweigh in\b|\bswitching gears\b|\bshift our focus\b|\balign\b|\bup to speed\b/i
  },
  {
    group: "risk communication",
    intent: "flag risk, caveats, or implications",
    match: /\brisk\b|\bcaveat\b|\bimplication\b|\bthreat\b|\bcrisis\b/i
  },
  {
    group: "email tone",
    intent: "sound polished and considerate in written communication",
    match: /\btake the liberty\b|\bshoutout\b|\bthanks for\b|\bat your earliest\b/i
  },
  {
    group: "project updates",
    intent: "describe milestones, timelines, status, or rollout changes",
    match: /\bmilestone\b|\bwind down\b|\bdeprecat\b|\bupfront effort\b|\bbreakthrough\b/i
  }
];

function dedupe(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizePhrase(phrase: string) {
  return phrase
    .toLowerCase()
    .replace(/\bsb\.\b/g, "someone")
    .replace(/\bxyz\b/g, "something")
    .replace(/[“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferDifficulty(item: VocabItem): DifficultyLevel {
  const phrase = item.phrase_text.toLowerCase();
  const complexitySignals =
    phrase.split(/\s+/).length >= 5 ||
    /\bprecedent\b|\bcontingent\b|\bimplication\b|\bconvergence\b/.test(phrase) ||
    item.synonyms.length >= 3;

  if (complexitySignals) return "hard";
  if (phrase.split(/\s+/).length >= 3 || item.note) return "medium";
  return "easy";
}

function inferMeaning(item: VocabItem) {
  if (item.meaning) return item.meaning;
  if (item.note) return item.note;
  return `Business English expression for: ${item.phrase_text}`;
}

function inferGroupAndIntent(item: VocabItem) {
  const text = `${item.phrase_text} ${item.note ?? ""} ${item.group_label ?? ""}`;

  for (const rule of groupRules) {
    if (rule.match.test(text)) {
      return {
        group: item.group_label || rule.group,
        intent: rule.intent
      };
    }
  }

  return {
    group: item.group_label || "general business English",
    intent: "general professional communication"
  };
}

function inferSynonyms(item: VocabItem) {
  const inferred = [...item.synonyms];

  for (const hint of synonymHints) {
    if (hint.match.test(item.phrase_text)) {
      inferred.push(...hint.values);
    }
  }

  return dedupe(inferred).filter(
    (candidate) => normalizePhrase(candidate) !== normalizePhrase(item.phrase_text)
  );
}

function inferAntonyms(item: VocabItem) {
  const inferred: string[] = [];

  for (const hint of antonymHints) {
    if (hint.match.test(item.phrase_text)) {
      inferred.push(...hint.values);
    }
  }

  return dedupe(inferred);
}

function inferExampleContext(group: string) {
  switch (group) {
    case "risk communication":
      return "data engineering risk review";
    case "meeting communication":
      return "cross-functional engineering meeting";
    case "follow-up":
      return "project follow-up in Slack";
    case "email tone":
      return "stakeholder update email";
    case "project updates":
      return "delivery status update";
    default:
      return "business English discussion";
  }
}

function inferExampleSentence(item: VocabItem, group: string) {
  const phrase = item.phrase_text.replace(/\s+/g, " ").trim();

  if (group === "risk communication") {
    return `From a data engineering standpoint, ${phrase.toLowerCase()} for the next migration window, so we should validate the rollback plan early.`;
  }

  if (group === "meeting communication") {
    return `In tomorrow's engineering sync, I plan to ${phrase.toLowerCase()} so the team can align on scope and next steps.`;
  }

  if (group === "follow-up") {
    return `I'll ${phrase.toLowerCase()} with the platform team after we confirm the pipeline metrics.`;
  }

  if (group === "email tone") {
    return `In the update email, I used "${phrase}" to keep the tone professional while asking for a clear response.`;
  }

  if (group === "project updates") {
    return `During the product review, we used "${phrase}" to explain the current state of the data platform rollout.`;
  }

  return `In a business English setting, "${phrase}" works well when discussing data, engineering priorities, or stakeholder expectations.`;
}

export function computeSmartScore(item: VocabItem, enrichment: AiEnrichment | null) {
  const statusScore =
    item.review_status === "new" ? 38 : item.review_status === "learning" ? 28 : 10;
  const priorityScore = enrichment?.review_priority ?? 50;
  const difficultyBoost =
    enrichment?.difficulty === "hard" ? 12 : enrichment?.difficulty === "medium" ? 6 : 2;
  const ageInDays = Math.max(
    0,
    (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const freshnessBoost = Math.max(0, 18 - ageInDays);

  return Number((statusScore + priorityScore + difficultyBoost + freshnessBoost).toFixed(2));
}

export function generateHeuristicEnrichment(item: VocabItem): Omit<AiEnrichment, "item_id"> {
  const { group, intent } = inferGroupAndIntent(item);
  const difficulty = inferDifficulty(item);
  const review_priority =
    (item.review_status === "mastered" ? 22 : item.review_status === "learning" ? 70 : 84) +
    (difficulty === "hard" ? 10 : difficulty === "medium" ? 5 : 0) +
    (group === "risk communication" ? 6 : 0);

  return {
    normalized_phrase: normalizePhrase(item.phrase_text),
    suggested_meaning: inferMeaning(item),
    suggested_group_label: group,
    suggested_synonyms: inferSynonyms(item),
    suggested_antonyms: inferAntonyms(item),
    suggested_example_sentence: inferExampleSentence(item, group),
    suggested_example_context: inferExampleContext(group),
    usage_intent: intent,
    difficulty,
    review_priority,
    confidence: 0.62,
    suggestion_source: "heuristic-v1",
    suggested_at: new Date().toISOString(),
    accepted_at: null
  };
}

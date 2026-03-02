/**
 * Repeated Questions Detector
 *
 * Uses TF-IDF + cosine similarity to detect groups of similar user messages.
 * Falls back to Levenshtein distance for short messages (< 50 chars).
 */

import { TfIdf, LevenshteinDistance } from "natural";

export interface RepeatedGroup {
  indices: number[];
  messages: Array<{
    sessionId: string;
    timestamp: string;
    content: string;
  }>;
  similarity: number;
  representativeText: string;
}

export interface UserMessageInput {
  sessionId: string;
  timestamp: string;
  content: string;
}

const COSINE_THRESHOLD = 0.7;
const LEVENSHTEIN_THRESHOLD = 0.3; // normalized distance
const SHORT_TEXT_THRESHOLD = 50;
const MAX_MESSAGES = 1000; // performance cap

/**
 * Detect groups of repeated/similar user questions.
 * @param userMessages - Array of user messages to analyze
 * @param threshold - Cosine similarity threshold (0-1, default 0.7)
 */
export function detectRepeatedQuestions(
  userMessages: UserMessageInput[],
  threshold = COSINE_THRESHOLD
): RepeatedGroup[] {
  if (userMessages.length < 2) return [];

  // Cap for performance
  const messages = userMessages.slice(0, MAX_MESSAGES);
  const n = messages.length;

  // Build TF-IDF vectors
  const tfidf = new TfIdf();
  messages.forEach((m) => tfidf.addDocument(m.content));

  // Union-Find for grouping
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: number, y: number): void {
    const px = find(x);
    const py = find(y);
    if (px !== py) parent[px] = py;
  }

  // Compare all pairs
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const textI = messages[i].content;
      const textJ = messages[j].content;

      let similar = false;

      // Short text: use Levenshtein
      if (textI.length < SHORT_TEXT_THRESHOLD || textJ.length < SHORT_TEXT_THRESHOLD) {
        const maxLen = Math.max(textI.length, textJ.length);
        if (maxLen === 0) continue;
        const dist = LevenshteinDistance(textI, textJ);
        const normalized = dist / maxLen;
        similar = normalized < LEVENSHTEIN_THRESHOLD;
      } else {
        // Long text: use cosine similarity from TF-IDF
        const sim = computeCosineSimilarity(tfidf, i, j);
        similar = sim >= threshold;
      }

      if (similar) {
        union(i, j);
      }
    }
  }

  // Collect groups
  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root)!.push(i);
  }

  // Build result (only groups with 2+ items)
  const groups: RepeatedGroup[] = [];
  for (const [, indices] of groupMap) {
    if (indices.length < 2) continue;

    // Compute max pairwise similarity for the group
    let maxSim = 0;
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const sim = computeCosineSimilarity(tfidf, indices[a], indices[b]);
        if (sim > maxSim) maxSim = sim;
      }
    }

    groups.push({
      indices,
      messages: indices.map((i) => ({
        sessionId: messages[i].sessionId,
        timestamp: messages[i].timestamp,
        content: messages[i].content,
      })),
      similarity: Math.round(maxSim * 100) / 100,
      representativeText: messages[indices[0]].content,
    });
  }

  // Sort by group size descending
  return groups.sort((a, b) => b.indices.length - a.indices.length);
}

/**
 * Compute cosine similarity between two TF-IDF document vectors.
 */
function computeCosineSimilarity(tfidf: TfIdf, docA: number, docB: number): number {
  // Get term lists
  const termsA = new Map<string, number>();
  const termsB = new Map<string, number>();

  tfidf.listTerms(docA).forEach(({ term, tfidf: score }) => {
    termsA.set(term, score);
  });
  tfidf.listTerms(docB).forEach(({ term, tfidf: score }) => {
    termsB.set(term, score);
  });

  // Compute dot product
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const [term, scoreA] of termsA) {
    const scoreB = termsB.get(term) ?? 0;
    dot += scoreA * scoreB;
    magA += scoreA * scoreA;
  }
  for (const [, scoreB] of termsB) {
    magB += scoreB * scoreB;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

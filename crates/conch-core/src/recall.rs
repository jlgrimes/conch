use std::collections::HashMap;

use chrono::Utc;

use crate::embed::{cosine_similarity, Embedder};
use crate::memory::{MemoryKind, MemoryRecord};
use crate::store::MemoryStore;

/// Minimum cosine similarity threshold for vector search results.
const VECTOR_SIMILARITY_THRESHOLD: f32 = 0.3;

/// RRF constant k — standard value used by Elasticsearch, Qdrant, etc.
const RRF_K: f64 = 60.0;

/// A recalled memory with its relevance score.
#[derive(Debug, Clone, serde::Serialize)]
pub struct RecallResult {
    pub memory: MemoryRecord,
    pub score: f64,
}

/// Global decay constants (lambda/day) by memory kind.
///
/// These are intentionally code-level policy constants (not stored per-memory),
/// so tuning affects all memories immediately.
const FACT_DECAY_LAMBDA_PER_DAY: f64 = 0.02;
const EPISODE_DECAY_LAMBDA_PER_DAY: f64 = 0.06;

/// Reinforcement boost applied when a memory is touched.
const FACT_TOUCH_BOOST: f64 = 0.10;
const EPISODE_TOUCH_BOOST: f64 = 0.20;

/// Overfetch multiplier for candidate reranking.
const CANDIDATE_MULTIPLIER: usize = 10;
const MIN_CANDIDATES: usize = 50;

/// Spreading activation: fraction of a memory's score given to graph neighbors.
const SPREAD_FACTOR: f64 = 0.15;

/// Recency boost half-life in hours (7 days). Memories newer than this get a
/// meaningful boost; older ones taper towards a floor.
const RECENCY_HALF_LIFE_HOURS: f64 = 168.0;

/// Minimum recency multiplier so old memories aren't completely suppressed.
const RECENCY_FLOOR: f64 = 0.3;

/// Hybrid recall: BM25 + vector search fused via Reciprocal Rank Fusion,
/// enhanced with brain-inspired scoring heuristics.
///
/// Pipeline:
/// 1. BM25 search (keyword relevance)
/// 2. Vector search (semantic relevance, cosine sim > threshold)
/// 3. RRF fusion of both rankings
/// 4. Base score = RRF × decayed_strength × recency_boost × access_weight
/// 5. 1-hop spreading activation through the knowledge graph
/// 6. Temporal co-occurrence boost for memories created near top results
///
/// Recalled memories are "touched" (decay is applied, then reinforced, and
/// access count bumped).
pub fn recall(
    store: &MemoryStore,
    query: &str,
    embedder: &dyn Embedder,
    limit: usize,
) -> Result<Vec<RecallResult>, RecallError> {
    let all_memories = store.all_memories_with_text().map_err(RecallError::Db)?;

    if all_memories.is_empty() {
        return Ok(vec![]);
    }

    let now = Utc::now();

    // Find the maximum access_count for normalization.
    let max_access = all_memories
        .iter()
        .map(|(m, _)| m.access_count)
        .max()
        .unwrap_or(0);

    // BM25
    let bm25_ranked = bm25_search(query, &all_memories);

    // Vector
    let query_embedding = embedder
        .embed_one(query)
        .map_err(|e| RecallError::Embedding(e.to_string()))?;
    let vector_ranked = vector_search(&query_embedding, &all_memories);

    // RRF fusion
    let fused = rrf(&bm25_ranked, &vector_ranked);

    // Overfetch candidates, then rerank with full score (including decay,
    // recency, and access weighting) to avoid top-K cutoff errors.
    let candidate_count = (limit.saturating_mul(CANDIDATE_MULTIPLIER)).max(MIN_CANDIDATES);
    let candidates = fused.into_iter().take(candidate_count);

    // Score = RRF × decayed_strength × recency_boost × access_weight
    let mut results: Vec<RecallResult> = candidates
        .map(|(idx, rrf_score)| {
            let mem = &all_memories[idx].0;
            let decayed_strength = effective_strength(mem, now);
            let recency = recency_boost(mem, now);
            let access = access_weight(mem, max_access);
            RecallResult {
                memory: mem.clone(),
                score: rrf_score * decayed_strength * recency * access,
            }
        })
        .collect();

    // ── Spreading activation ─────────────────────────────────
    // For each scored Fact, boost other results that share a subject or object.
    // This is 1-hop graph traversal inspired by Collins & Loftus (1975).
    spread_activation(&mut results, SPREAD_FACTOR);

    // ── Temporal co-occurrence boost ─────────────────────────
    // Memories created near the same time as high-scoring results get a small
    // boost, implementing Tulving's encoding specificity / contextual
    // reinstatement principle.
    temporal_cooccurrence_boost(&mut results);

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(limit);

    // Touch recalled memories: apply decay first, then reinforce.
    for result in &results {
        let mem = &result.memory;
        let decayed = effective_strength(mem, now);
        let boosted = (decayed + touch_boost(mem)).min(1.0);
        store
            .touch_memory_with_strength(mem.id, boosted, now)
            .map_err(RecallError::Db)?;
    }

    Ok(results)
}

/// Recency boost: gentle sigmoid that favours recent memories without
/// completely suppressing old ones. Independent of decay (which handles
/// forgetting); this handles *preference* when scores are close.
///
/// Returns a multiplier in [RECENCY_FLOOR, 1.0].
fn recency_boost(mem: &MemoryRecord, now: chrono::DateTime<Utc>) -> f64 {
    let hours_ago = (now - mem.created_at).num_seconds().max(0) as f64 / 3600.0;
    let raw = 1.0 / (1.0 + (hours_ago / RECENCY_HALF_LIFE_HOURS).powf(0.8));
    raw.max(RECENCY_FLOOR)
}

/// Access pattern weight: memories recalled more often are more consolidated
/// (Hebbian strengthening). Uses log-normalised access count so the effect
/// is gentle and bounded.
///
/// Returns a multiplier in [1.0, 2.0].
fn access_weight(mem: &MemoryRecord, max_access: i64) -> f64 {
    if max_access <= 0 {
        return 1.0;
    }
    let norm = (mem.access_count as f64 + 1.0).log2() / (max_access as f64 + 1.0).log2();
    1.0 + norm // range [1.0, 2.0]
}

/// 1-hop spreading activation through the knowledge graph.
///
/// For every Fact result, other results sharing the same subject or object
/// receive a fractional boost proportional to the parent's score. This
/// implements Collins & Loftus (1975) spreading activation: querying "Max"
/// will also boost "Jared has_pet Max" and "Max visited vet".
fn spread_activation(results: &mut Vec<RecallResult>, factor: f64) {
    // Build index: subject/object → list of result indices.
    let mut entity_index: HashMap<String, Vec<usize>> = HashMap::new();
    for (i, r) in results.iter().enumerate() {
        if let MemoryKind::Fact(f) = &r.memory.kind {
            let subj = f.subject.to_lowercase();
            let obj = f.object.to_lowercase();
            entity_index.entry(subj).or_default().push(i);
            entity_index.entry(obj).or_default().push(i);
        }
    }

    // Accumulate boosts (don't mutate while iterating).
    let mut boosts: HashMap<usize, f64> = HashMap::new();
    for (i, r) in results.iter().enumerate() {
        if let MemoryKind::Fact(f) = &r.memory.kind {
            let entities = [f.subject.to_lowercase(), f.object.to_lowercase()];
            for entity in &entities {
                if let Some(neighbors) = entity_index.get(entity) {
                    for &ni in neighbors {
                        if ni != i {
                            *boosts.entry(ni).or_insert(0.0) += r.score * factor;
                        }
                    }
                }
            }
        }
    }

    // Apply boosts.
    for (idx, boost) in boosts {
        if idx < results.len() {
            results[idx].score += boost;
        }
    }
}

/// Temporal co-occurrence boost: memories created within 30 minutes of a
/// high-scoring result get a small boost, implementing contextual
/// reinstatement (Tulving & Thomson, 1973).
fn temporal_cooccurrence_boost(results: &mut Vec<RecallResult>) {
    if results.len() < 2 {
        return;
    }

    // Use the top 5 results as "anchors" — don't let every result boost every other.
    let mut sorted_indices: Vec<usize> = (0..results.len()).collect();
    sorted_indices.sort_by(|&a, &b| {
        results[b]
            .score
            .partial_cmp(&results[a].score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let anchor_count = sorted_indices.len().min(5);
    let anchors: Vec<(usize, f64, chrono::DateTime<Utc>)> = sorted_indices[..anchor_count]
        .iter()
        .map(|&i| (i, results[i].score, results[i].memory.created_at))
        .collect();

    let mut boosts: HashMap<usize, f64> = HashMap::new();
    for (ai, a_score, a_time) in &anchors {
        for (j, r) in results.iter().enumerate() {
            if j == *ai {
                continue;
            }
            let gap_minutes = (*a_time - r.memory.created_at)
                .num_minutes()
                .unsigned_abs() as f64;
            if gap_minutes < 30.0 {
                let proximity = 0.1 * (1.0 - gap_minutes / 30.0);
                *boosts.entry(j).or_insert(0.0) += a_score * proximity;
            }
        }
    }

    for (idx, boost) in boosts {
        if idx < results.len() {
            results[idx].score += boost;
        }
    }
}

fn kind_decay_lambda_per_day(mem: &MemoryRecord) -> f64 {
    match &mem.kind {
        MemoryKind::Fact(_) => FACT_DECAY_LAMBDA_PER_DAY,
        MemoryKind::Episode(_) => EPISODE_DECAY_LAMBDA_PER_DAY,
    }
}

fn touch_boost(mem: &MemoryRecord) -> f64 {
    match &mem.kind {
        MemoryKind::Fact(_) => FACT_TOUCH_BOOST,
        MemoryKind::Episode(_) => EPISODE_TOUCH_BOOST,
    }
}

fn effective_strength(mem: &MemoryRecord, now: chrono::DateTime<Utc>) -> f64 {
    let elapsed_secs = (now - mem.last_accessed_at).num_seconds().max(0) as f64;
    let elapsed_days = elapsed_secs / 86_400.0;
    let lambda = kind_decay_lambda_per_day(mem);
    (mem.strength * (-lambda * elapsed_days).exp()).clamp(0.0, 1.0)
}

fn bm25_search(query: &str, memories: &[(MemoryRecord, String)]) -> Vec<(usize, f32)> {
    use bm25::{Document, Language, SearchEngineBuilder};

    let documents: Vec<Document<usize>> = memories
        .iter()
        .enumerate()
        .map(|(i, (_, text))| Document {
            id: i,
            contents: text.clone(),
        })
        .collect();

    let engine: bm25::SearchEngine<usize> =
        SearchEngineBuilder::with_documents(Language::English, documents)
            .b(0.5)
            .build();

    engine
        .search(query, memories.len())
        .into_iter()
        .map(|r| (r.document.id, r.score))
        .collect()
}

fn vector_search(query_emb: &[f32], memories: &[(MemoryRecord, String)]) -> Vec<(usize, f32)> {
    let mut scored: Vec<(usize, f32)> = memories
        .iter()
        .enumerate()
        .filter_map(|(i, (mem, _))| {
            let emb = mem.embedding.as_ref()?;
            let sim = cosine_similarity(query_emb, emb);
            if sim > VECTOR_SIMILARITY_THRESHOLD {
                Some((i, sim))
            } else {
                None
            }
        })
        .collect();

    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    scored
}

fn rrf(list_a: &[(usize, f32)], list_b: &[(usize, f32)]) -> Vec<(usize, f64)> {
    let mut scores: HashMap<usize, f64> = HashMap::new();

    for (rank, &(idx, _)) in list_a.iter().enumerate() {
        *scores.entry(idx).or_insert(0.0) += 1.0 / (RRF_K + rank as f64 + 1.0);
    }
    for (rank, &(idx, _)) in list_b.iter().enumerate() {
        *scores.entry(idx).or_insert(0.0) += 1.0 / (RRF_K + rank as f64 + 1.0);
    }

    let mut results: Vec<(usize, f64)> = scores.into_iter().collect();
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    results
}

#[derive(Debug, thiserror::Error)]
pub enum RecallError {
    #[error("database error: {0}")]
    Db(rusqlite::Error),
    #[error("embedding error: {0}")]
    Embedding(String),
}

impl From<rusqlite::Error> for RecallError {
    fn from(e: rusqlite::Error) -> Self {
        RecallError::Db(e)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::embed::{EmbedError, Embedding};

    struct MockEmbedder;

    impl Embedder for MockEmbedder {
        fn embed(&self, texts: &[&str]) -> Result<Vec<Embedding>, EmbedError> {
            Ok(texts
                .iter()
                .map(|t| {
                    if t.contains("alpha") {
                        vec![1.0, 0.0]
                    } else {
                        vec![0.0, 1.0]
                    }
                })
                .collect())
        }

        fn dimension(&self) -> usize {
            2
        }
    }

    #[test]
    fn effective_strength_decays_by_kind() {
        let store = MemoryStore::open_in_memory().unwrap();
        let fact_id = store.remember_fact("Jared", "builds", "Gen", Some(&[1.0, 0.0])).unwrap();
        let ep_id = store
            .remember_episode("alpha project context", Some(&[1.0, 0.0]))
            .unwrap();

        let old_time = (Utc::now() - chrono::Duration::days(10)).to_rfc3339();
        store
            .conn()
            .execute(
                "UPDATE memories SET last_accessed_at = ?1 WHERE id IN (?2, ?3)",
                rusqlite::params![old_time, fact_id, ep_id],
            )
            .unwrap();

        let fact = store.get_memory(fact_id).unwrap().unwrap();
        let episode = store.get_memory(ep_id).unwrap().unwrap();

        let sf = effective_strength(&fact, Utc::now());
        let se = effective_strength(&episode, Utc::now());
        assert!(sf > se, "facts should decay slower than episodes");
    }

    #[test]
    fn recall_touch_applies_decay_then_reinforcement() {
        let store = MemoryStore::open_in_memory().unwrap();
        let id = store
            .remember_episode("alpha memory to recall", Some(&[1.0, 0.0]))
            .unwrap();

        let old_time = (Utc::now() - chrono::Duration::days(30)).to_rfc3339();
        store
            .conn()
            .execute(
                "UPDATE memories SET strength = 1.0, last_accessed_at = ?1 WHERE id = ?2",
                rusqlite::params![old_time, id],
            )
            .unwrap();

        let results = recall(&store, "alpha", &MockEmbedder, 1).unwrap();
        assert_eq!(results.len(), 1);

        let after = store.get_memory(id).unwrap().unwrap();
        assert!(after.access_count >= 1);
        // Should have decayed meaningfully from 1.0 before reinforcement.
        assert!(after.strength < 1.0);
        // But reinforcement should keep it above a tiny decayed floor.
        assert!(after.strength > 0.2);
    }
}

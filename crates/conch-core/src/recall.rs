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

/// Hybrid recall: BM25 + vector search fused via Reciprocal Rank Fusion.
///
/// 1. BM25 search (keyword relevance)
/// 2. Vector search (semantic relevance, cosine sim > 0.3)
/// 3. RRF fusion of both rankings
/// 4. Final score = RRF × strength × recency
///
/// Recalled memories are "touched" (strength reinforced, access count bumped).
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

    // BM25
    let bm25_ranked = bm25_search(query, &all_memories);

    // Vector
    let query_embedding = embedder
        .embed_one(query)
        .map_err(|e| RecallError::Embedding(e.to_string()))?;
    let vector_ranked = vector_search(&query_embedding, &all_memories);

    // RRF fusion
    let fused = rrf(&bm25_ranked, &vector_ranked);

    // Score = RRF × strength × recency
    let mut results: Vec<RecallResult> = fused
        .into_iter()
        .map(|(idx, rrf_score)| {
            let mem = &all_memories[idx].0;
            let hours = (now - mem.last_accessed_at).num_minutes() as f64 / 60.0;
            let recency = (-0.01 * hours.max(0.0)).exp();
            RecallResult {
                memory: mem.clone(),
                score: rrf_score * mem.strength * recency,
            }
        })
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(limit);

    // Touch recalled memories (reinforce strength)
    for result in &results {
        store.touch_memory(result.memory.id).map_err(RecallError::Db)?;
    }

    Ok(results)
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

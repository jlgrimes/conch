pub mod memory;
pub mod store;
pub mod embed;
pub mod decay;
pub mod recall;

pub use memory::{Episode, ExportData, Fact, MemoryKind, MemoryRecord, MemoryStats};
pub use store::MemoryStore;
pub use embed::{Embedder, EmbedError, FastEmbedder, SharedEmbedder, cosine_similarity};
pub use decay::{run_decay, DecayResult};
pub use recall::{recall, RecallResult, RecallError};

use chrono::Duration;

/// High-level API wrapping storage + embeddings.
pub struct ConchDB {
    store: MemoryStore,
    embedder: Box<dyn Embedder>,
}

#[derive(Debug, thiserror::Error)]
pub enum ConchError {
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("embedding error: {0}")]
    Embed(#[from] EmbedError),
}

impl ConchDB {
    pub fn open(path: &str) -> Result<Self, ConchError> {
        let store = MemoryStore::open(path)?;
        let embedder = embed::FastEmbedder::new()?;
        Ok(Self { store, embedder: Box::new(embedder) })
    }

    pub fn open_in_memory_with(embedder: Box<dyn Embedder>) -> Result<Self, ConchError> {
        let store = MemoryStore::open_in_memory()?;
        Ok(Self { store, embedder })
    }

    pub fn store(&self) -> &MemoryStore {
        &self.store
    }

    pub fn remember_fact(&self, subject: &str, relation: &str, object: &str) -> Result<MemoryRecord, ConchError> {
        let text = format!("{subject} {relation} {object}");
        let embedding = self.embedder.embed_one(&text)?;
        let id = self.store.remember_fact(subject, relation, object, Some(&embedding))?;
        Ok(self.store.get_memory(id)?.expect("just inserted"))
    }

    pub fn remember_episode(&self, text: &str) -> Result<MemoryRecord, ConchError> {
        let embedding = self.embedder.embed_one(text)?;
        let id = self.store.remember_episode(text, Some(&embedding))?;
        Ok(self.store.get_memory(id)?.expect("just inserted"))
    }

    pub fn recall(&self, query: &str, limit: usize) -> Result<Vec<RecallResult>, ConchError> {
        recall::recall(&self.store, query, self.embedder.as_ref(), limit)
            .map_err(|e| match e {
                RecallError::Db(e) => ConchError::Db(e),
                RecallError::Embedding(msg) => ConchError::Embed(EmbedError::Other(msg)),
            })
    }

    pub fn forget_by_subject(&self, subject: &str) -> Result<usize, ConchError> {
        Ok(self.store.forget_by_subject(subject)?)
    }

    pub fn forget_by_id(&self, id: &str) -> Result<usize, ConchError> {
        Ok(self.store.forget_by_id(id)?)
    }

    pub fn forget_older_than(&self, secs: i64) -> Result<usize, ConchError> {
        Ok(self.store.forget_older_than(Duration::seconds(secs))?)
    }

    pub fn decay(&self) -> Result<DecayResult, ConchError> {
        Ok(decay::run_decay(&self.store, None, None)?)
    }

    pub fn stats(&self) -> Result<MemoryStats, ConchError> {
        Ok(self.store.stats()?)
    }

    pub fn embed_all(&self) -> Result<usize, ConchError> {
        let missing = self.store.memories_missing_embeddings()?;
        if missing.is_empty() {
            return Ok(0);
        }
        let texts: Vec<String> = missing.iter().map(|m| m.text_for_embedding()).collect();
        let text_refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
        let embeddings = self.embedder.embed(&text_refs)?;
        for (mem, emb) in missing.iter().zip(embeddings.iter()) {
            self.store.update_embedding(mem.id, emb)?;
        }
        Ok(missing.len())
    }

    pub fn export(&self) -> Result<ExportData, ConchError> {
        let memories = self.store.all_memories()?;
        Ok(ExportData { memories })
    }

    pub fn import(&self, data: &ExportData) -> Result<usize, ConchError> {
        let mut count = 0;
        for mem in &data.memories {
            let created = mem.created_at.to_rfc3339();
            let accessed = mem.last_accessed_at.to_rfc3339();
            match &mem.kind {
                MemoryKind::Fact(f) => {
                    self.store.import_fact(
                        &f.subject, &f.relation, &f.object,
                        mem.strength, mem.embedding.as_deref(),
                        &created, &accessed, mem.access_count,
                    )?;
                }
                MemoryKind::Episode(e) => {
                    self.store.import_episode(
                        &e.text, mem.strength, mem.embedding.as_deref(),
                        &created, &accessed, mem.access_count,
                    )?;
                }
            }
            count += 1;
        }
        Ok(count)
    }
}

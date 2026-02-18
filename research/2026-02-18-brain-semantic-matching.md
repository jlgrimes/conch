# Brain-Inspired Semantic Matching for Conch Memory

**Date:** 2026-02-18  
**Purpose:** Research backing Phase 1 improvements to Conch's recall scoring  
**Status:** Research complete — ready for implementation planning

---

## 1. NEUROSCIENCE: How Human Memory Retrieval Works

### 1.1 Spreading Activation Theory

The brain retrieves memories not by scanning a database but by **propagating activation through an associative network**. When you think of "dog," activation spreads to "bark," "pet," "fur," "walk" — nodes connected by learned associations.

**Key papers:**
- **Collins & Loftus (1975)** — "A Spreading-Activation Theory of Semantic Processing." Proposed that semantic memory is organized as a network where activation spreads along weighted associative links. Closer concepts receive activation faster (semantic distance effect). [ResearchGate](https://www.researchgate.net/publication/200045115_A_Spreading_Activation_Theory_of_Semantic_Processing)
- **Anderson (1983)** — "A Spreading Activation Theory of Memory" (ACT framework). Proposed that level of activation in the network determines rate and probability of recall. Activation decays over time and spreads from currently attended items. Published in *Journal of Verbal Learning and Verbal Behavior*. [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0022537183902013) / [CMU ACT-R](http://act-r.psy.cmu.edu/wordpress/wp-content/uploads/2012/12/66SATh.JRA.JVL.1983.pdf)
- **Bower et al. (PMC, 2017)** — Extended spreading activation to emotional memory networks, showing that emotional valence creates additional associative pathways. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5413589/)

**Relevance to Conch:** Conch already has a graph-like structure (subject → relation → object triples). Spreading activation suggests that when a query matches one memory, **nearby memories in the graph should get a boost** — not just memories that independently match the query text. This is the single biggest gap in current Conch recall.

### 1.2 Hebbian Learning ("Neurons That Fire Together Wire Together")

**Core principle:** When two neurons are repeatedly co-activated, the synaptic connection between them strengthens. This is the biological basis of associative learning.

**Key references:**
- **Hebb (1949)** — *The Organization of Behavior*. Original postulate: "When an axon of cell A is near enough to excite cell B and repeatedly or persistently takes part in firing it, some growth process or metabolic change takes place in one or both cells such that A's efficiency, as one of the cells firing B, is increased."
- **Bliss & Lømo (1973)** — First experimental demonstration of long-term potentiation (LTP) in the hippocampus, providing the physiological basis for Hebb's theory. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9376741/)
- **Neuroscience News (2021)** — "How Neurons That Wire Together Fire Together" — Showed that activating a few select neurons in a Hebbian cell assembly is enough to trigger the whole ensemble, providing a mechanism for memory recall from partial cues. [Source](https://neurosciencenews.com/wire-fire-neurons-19835/)
- **O'Reilly & Frank (2022)** — "Correcting the Hebbian Mistake" — Argues CA3 recurrent connections are strengthened when co-activated, creating cell assemblies, but proposes error-driven learning may be more accurate than pure Hebbian learning. [bioRxiv](https://www.biorxiv.org/content/10.1101/2021.10.29.466546v2.full)
- **Medicalxpress (2025)** — A unified model showing Hebbian plasticity explains both contraction and repulsion biases in memory, within the same recurrent neural network circuit. [Source](https://medicalxpress.com/news/2025-11-memory-perception-hebbian-recall-events.html)

**Relevance to Conch:** Co-recall = co-activation. When two memories are frequently recalled in the same session/query, they should develop a stronger association — even if they don't share keywords. Conch currently has `access_count` and `strength` per memory but **no inter-memory association tracking**.

### 1.3 Pattern Completion in the Hippocampus

The hippocampus performs two complementary operations:

- **Pattern Separation** (dentate gyrus → CA3): Takes similar inputs and creates distinct, orthogonal representations so memories don't blur together.
- **Pattern Completion** (CA3 recurrent connections): Given a **partial cue**, reconstructs the **full memory**. This is why smelling cookies can trigger a complete childhood memory.

**Key papers:**
- **Leutgeb et al. (2007)** — "Pattern separation, pattern completion, and new neuronal codes within a continuous CA3 map." Demonstrated that CA3 is critical for rapidly encoding new memories via computations unique to this subregion. [Learning & Memory](https://learnmem.cshlp.org/content/14/11/745.full)
- **Kirwan & Stark (2020)** — "Pattern separation and pattern completion: Behaviorally separable processes?" Episodic memory requires mnemonic discrimination (separation) AND holistic retrieval from cues (completion). [Springer](https://link.springer.com/article/10.3758/s13421-020-01072-y)
- **Yassa & Stark (2012)** — "The operation of pattern separation and pattern completion processes." These processes are dynamically at odds — the system must balance between them. [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0149763412001674)
- **eLife (2023)** — "Extra-hippocampal contributions to pattern separation." Frontal feature-coding drives high-fidelity memory recall by providing input to hippocampus. [eLife](https://elifesciences.org/articles/82250)

**Relevance to Conch:** Conch's vector search already does a crude form of pattern completion (partial semantic match → full memory). But it has **no pattern separation** — similar memories compete rather than being distinguished. A memory about "Jared's dog Max" and "Jared's dog's vet appointment" may score identically for "dog" when they serve very different retrieval needs.

### 1.4 Contextual Reinstatement & Encoding Specificity

**Tulving & Thomson (1973)** — The Encoding Specificity Principle: memory recall is enhanced when contextual factors at retrieval match those at encoding. Studying underwater → better recall underwater. The retrieval cue must overlap with the encoding context.

**Key references:**
- **Tulving & Thomson (1973)** — Original paper establishing encoding specificity. [Wikipedia summary](https://en.wikipedia.org/wiki/Encoding_specificity_principle)
- **PMC (2021)** — "Memory-Related Encoding-Specificity Paradigm" — Confirms recall enhancement when encoding and retrieval contexts are congruent. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7909183/)
- **Grokipedia** — Notes that contextual reinstatement alone is insufficient without semantic alignment; effectiveness depends on the interaction between semantic overlap and contextual reinstatement ("ecphory"). [Source](https://grokipedia.com/page/Encoding_specificity_principle)

**Relevance to Conch:** When a memory is stored, the **context** matters — what channel, what conversation, what time of day, what other topics were active. Conch stores timestamps but not conversational context. If Jared discusses a project in Discord at night, those memories should score higher when queried from Discord at night. This is the "contextual reinstatement" principle.

### 1.5 Recent: Predictive Associative Memory

- **arXiv (2025)** — "Predictive Associative Memory: Retrieval Beyond Similarity Through Temporal Co-occurrence." Proposes that memory retrieval should go beyond similarity to include temporal co-occurrence patterns, echoing spreading activation but with a predictive/temporal twist. [arXiv](https://arxiv.org/html/2602.11322)

**Relevance to Conch:** Memories that co-occur temporally should be retrievable together even if semantically dissimilar. "Jared ate pizza" and "Jared debugged the router" on the same night create a temporal association the brain would leverage but Conch currently ignores.

---

## 2. SEMANTIC MATCHING: How Modern Search Ranks Similarity

### 2.1 The Evolution: TF-IDF → BM25 → Neural

| Era | Method | How It Works | Limitation |
|-----|--------|-------------|------------|
| 1970s | TF-IDF | Term frequency × inverse document frequency. Bag of words. | No semantics — "car" ≠ "automobile" |
| 1990s | BM25 (Okapi) | Probabilistic improvement on TF-IDF with document length normalization and saturation | Still lexical — vocabulary mismatch problem |
| 2018+ | Neural (BERT) | Contextual embeddings capture meaning, not just words | Expensive; requires careful architecture choices |

**Google's pipeline** (as revealed through public papers and the antitrust trial):
1. **First stage:** Inverted index + BM25-like scoring over billions of documents (fast, lexical)
2. **Second stage:** Neural re-ranking with BERT-class models (RankBrain 2015, BERT 2019, MUM 2021)
3. **Twiddlers:** Post-ranking adjustments for freshness, personalization, diversity

[Source: iPullRank "Evolution of Information Retrieval"](https://ipullrank.com/ai-search-manual/ir-evolution)

### 2.2 Bi-Encoders vs Cross-Encoders

**Bi-Encoders** (e.g., Sentence-BERT / SBERT):
- Encode query and document **independently** into fixed-size vectors
- Compare via cosine similarity
- **Fast** — documents can be pre-encoded; query is encoded once
- **Less accurate** — no cross-attention between query and document tokens
- Paper: Reimers & Gurevych (2019), "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks." [arXiv](https://arxiv.org/abs/1908.10084)

**Cross-Encoders:**
- Concatenate query + document, pass through BERT together
- Full cross-attention between all tokens
- **Much more accurate** — can model fine-grained interactions
- **Slow** — must run inference for every (query, document) pair
- Used as **re-rankers** over a small candidate set (top-K from bi-encoder)

**The standard pipeline:** Bi-encoder retrieval (top 100-1000) → Cross-encoder re-ranking (top 10-20)

[SBERT docs](https://www.sbert.net/examples/cross_encoder/applications/README.html) | [hackerllama blog](https://osanseviero.github.io/hackerllama/blog/posts/sentence_embeddings2/) | [OpenAI Cookbook](https://cookbook.openai.com/examples/search_reranking_with_cross-encoders)

### 2.3 Key Models for Sentence Embeddings

- **all-MiniLM-L6-v2** — Distilled, 384-dim, fast. Good baseline for small corpora.
- **e5-large / BGE-large** — Higher quality, 1024-dim. Better for production RAG.
- **Nomic Embed** — Open source, good quality/speed tradeoff.
- **OpenAI text-embedding-3-small/large** — API-based, very high quality.

**Conch currently uses:** An embedder trait — the specific model depends on configuration. The architecture is model-agnostic, which is good.

---

## 3. RETRIEVAL FUSION: Combining BM25 + Vector Search

### 3.1 Reciprocal Rank Fusion (RRF)

**The formula:** `RRF_score(d) = Σ 1/(k + rank_i(d))` for each ranking list `i`

Where `k` is a constant (typically 60). This was introduced by:

- **Cormack, Clarke & Büttcher (SIGIR 2009)** — "Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods." [Paper PDF](https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf) | [ACM](https://dl.acm.org/doi/10.1145/1571941.1572114)

**Why RRF works:**
- Score-agnostic: only uses ranks, so no normalization needed between BM25 scores (unbounded) and cosine similarity (0-1)
- Robust: a document ranked well by both systems gets a strong boost without either system's score scale dominating
- Simple: no learned parameters, no training data needed

**Conch already implements RRF** with k=60. This is correct and standard.

### 3.2 SPLADE: Learned Sparse Retrieval

SPLADE (SParse Lexical AnD Expansion model) uses BERT's masked language model head to learn sparse representations:

- Given text, SPLADE predicts **which vocabulary terms are relevant** (including terms not in the original text)
- Output is a sparse vector over the full vocabulary (~30k dims, mostly zeros)
- Combines lexical precision with semantic expansion ("car" → also activates "vehicle," "automobile")
- Can use inverted index for fast retrieval

**Key papers:**
- **Formal et al. (SIGIR 2021)** — Original SPLADE paper
- **Formal et al. (2021)** — "SPLADE v2: Sparse Lexical and Expansion Model for Information Retrieval" [arXiv](https://arxiv.org/abs/2109.10086)
- [Pinecone explainer](https://www.pinecone.io/learn/splade/) | [GitHub (NAVER)](https://github.com/naver/splade) | [Qdrant deep-dive](https://qdrant.tech/articles/modern-sparse-neural-retrieval/)

**Relevance to Conch:** SPLADE could replace BM25 as the sparse retrieval component, providing semantic expansion without dense vectors. However, it requires a model (~110M params) which may be heavy for a CLI tool. Worth considering as an optional upgrade path.

### 3.3 ColBERT: Late Interaction

ColBERT keeps **token-level embeddings** for both query and document, then uses the **MaxSim operator**:

```
score(q, d) = Σ_i max_j cos_sim(q_i, d_j)
```

For each query token, find the most similar document token, then sum. This preserves fine-grained matching while allowing document embeddings to be pre-computed.

**Key papers:**
- **Khattab & Zaharia (SIGIR 2020)** — "ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT." [Paper](https://people.eecs.berkeley.edu/~matei/papers/2020/sigir_colbert.pdf)
- [Weaviate overview](https://weaviate.io/blog/late-interaction-overview) | [GitHub (Stanford)](https://github.com/stanford-futuredata/ColBERT)

**Relevance to Conch:** ColBERT-style late interaction is overkill for Conch's corpus size (hundreds to low thousands of memories). The token-level storage would multiply memory requirements by ~100x. Not recommended for current scale.

### 3.4 What Works Best for Small Personal Knowledge Bases?

Based on the research, the consensus for **small corpora** (< 10K documents):

1. **Hybrid BM25 + dense vector with RRF** is the sweet spot — exactly what Conch does
2. **Re-ranking with a cross-encoder** provides the biggest quality jump for minimal cost (only runs on top-K results)
3. **SPLADE** offers diminishing returns over BM25 at small scale since vocabulary mismatch is less of an issue
4. **ColBERT** is wasteful — the advantages only appear at scale

**Key finding from InfiniFlow benchmark:**
> "Combining BM25 full-text search with vector search significantly improves nDCG gains over pure vector search. Further incorporating ColBERT as a reranker with this three-way hybrid approach yields an even more substantial improvement."
[Source](https://infiniflow.org/blog/best-hybrid-search-solution)

**For Conch specifically:** The biggest wins come not from changing the retrieval method but from **better signals fed into the existing RRF pipeline** — recency, co-occurrence, context matching.

---

## 4. OPENCLAW GAPS: Community Pain Points

### 4.1 Memory-Specific Issues (GitHub)

| Issue | Description | Status |
|-------|-------------|--------|
| [#5547](https://github.com/openclaw/openclaw/issues/5547) | **Time-decay weighting for memory_search** — stale facts compete equally with recent ones; temporal queries fail | Open, 2 weeks ago |
| [#7776](https://github.com/openclaw/openclaw/issues/7776) | **Channel-aware memory context** — searches return noise from unrelated contexts | Open, 2 weeks ago |
| [#13027](https://github.com/openclaw/openclaw/issues/13027) | **memory_search disabled without clear warning** when embeddings provider missing | Open, 1 week ago |
| [#16670](https://github.com/openclaw/openclaw/issues/16670) | **Onboarding doesn't include memory/embedding setup** | Open, 3 days ago |
| [#8921](https://github.com/openclaw/openclaw/issues/8921) | Non-core memory plugins reported as 'unavailable' incorrectly | Open, 2 weeks ago |
| [#7273](https://github.com/openclaw/openclaw/issues/7273) | `openclaw status` reports memory as unavailable with lancedb plugin | Open, 2 weeks ago |
| [#2080](https://github.com/openclaw/openclaw/issues/2080) | Request for more memory plugins / ability to use multiple | Open, 3 weeks ago |
| [mem0 #4037](https://github.com/mem0ai/mem0/issues/4037) | OpenClaw memory injection silently broken due to wrong property name | Open, 6 days ago |

### 4.2 Non-Memory Pain Points (Community)

From Reddit and community discussions:

1. **Security** — Major concern. 18,000 exposed instances found with malicious skills. SECURITY.md explicitly scopes out major items. Community skills are "the wild west." [Reddit r/MachineLearning](https://www.reddit.com/r/MachineLearning/comments/1r30nzv/)
2. **Architecture complexity** — Gateway system is hard to debug. Users building simpler bridges (DiscoClaw). [Reddit r/ClaudeCode](https://www.reddit.com/r/ClaudeCode/comments/1r49lw5/)
3. **Performance** — CLI takes >1 second to load. "Modern computers are fast, it shouldn't need that for a CLI." Solution: compiled language. [Reddit r/AI_Agents](https://www.reddit.com/r/AI_Agents/comments/1qvynpz/)
4. **Cost management** — Letting one model do everything burns money. Users need model routing (cheap for simple tasks, expensive for complex). [GitHub Gist](https://gist.github.com/digitalknk/ec360aab27ca47cb4106a183b2c25a98)
5. **Production readiness** — "Design and code implementation are not for production." [Reddit r/AI_Agents](https://www.reddit.com/r/AI_Agents/comments/1r6fm98/)

### 4.3 Conch-Specific Gaps (from code review)

Reviewing `recall.rs`, the current implementation:

**What it does well:**
- ✅ Hybrid BM25 + vector with RRF (k=60) — textbook correct
- ✅ Exponential decay with kind-specific rates (facts decay slower than episodes)
- ✅ Touch-on-recall reinforcement (Hebbian-inspired)
- ✅ Overfetch + rerank to avoid cutoff errors

**What it's missing:**
- ❌ **No graph traversal / spreading activation** — memories are scored independently; no boost for memories adjacent in the knowledge graph
- ❌ **No co-recall association** — memories recalled together don't build associative links
- ❌ **No contextual signals** — no channel, time-of-day, conversation topic weighting
- ❌ **No temporal proximity boost** — memories created near the same time don't cluster
- ❌ **No cross-encoder re-ranking** — would be the single biggest accuracy improvement
- ❌ **No query expansion** — partial cues don't trigger related terms
- ❌ **BM25 parameters are defaults** — b=0.5 is reasonable but k1 isn't tuned
- ❌ **Vector threshold is static** (0.3) — could be adaptive based on score distribution

---

## 5. Implementation Plan

### Concrete improvements to Conch's retrieval scoring, ordered by impact and complexity. **No schema changes required.**

### 5.1 🟢 Easy Wins (This Sprint)

#### A. Recency Boost in RRF Scoring
**Current:** `score = RRF × decayed_strength`  
**Proposed:** `score = RRF × decayed_strength × recency_boost(age)`

Add a gentle recency signal independent of decay. Decay handles forgetting; recency handles preference for fresh information when scores are close.

```rust
fn recency_boost(mem: &MemoryRecord, now: DateTime<Utc>) -> f64 {
    let hours_ago = (now - mem.created_at).num_hours().max(0) as f64;
    // Sigmoid: 1.0 for recent, ~0.5 for 7 days, ~0.3 for 30 days
    1.0 / (1.0 + (hours_ago / 168.0).powf(0.8))
}
```

**Why:** Directly addresses OpenClaw issue #5547. Brain-inspired: temporal context reinstatement.

#### B. Access Pattern Weighting
**Current:** `access_count` is tracked but unused in scoring.  
**Proposed:** `score *= log2(access_count + 1).max(1.0) / log2(max_access + 1).max(1.0)`

Memories recalled more often are more "consolidated" — Hebbian strengthening.

**Why:** The data is already there. Just use it.

#### C. Adaptive Vector Threshold
**Current:** Static `VECTOR_SIMILARITY_THRESHOLD = 0.3`  
**Proposed:** Use the score distribution of vector results. If the top result has sim=0.95 and the 10th has sim=0.4, the threshold should be ~0.35. If all results cluster at 0.5-0.6, the threshold should be lower.

```rust
let threshold = if top_sim > 0.7 {
    (top_sim * 0.4).max(VECTOR_SIMILARITY_THRESHOLD)
} else {
    VECTOR_SIMILARITY_THRESHOLD * 0.8 // Be more permissive when nothing is highly relevant
};
```

### 5.2 🟡 Medium Effort (Next Sprint)

#### D. Graph-Based Spreading Activation
After RRF produces initial scores, do a single "hop" through the knowledge graph:

1. For each top-K result that's a Fact (S, R, O), find other memories sharing S or O
2. Give those neighbors a fractional boost: `neighbor_boost = parent_score × 0.15`
3. Re-sort with boosted scores

This implements 1-hop spreading activation. No new storage needed — just query existing facts by subject/object.

```rust
fn spread_activation(
    results: &mut Vec<RecallResult>,
    store: &MemoryStore,
    spread_factor: f64, // 0.15
) {
    let mut boosts: HashMap<i64, f64> = HashMap::new();
    for r in results.iter() {
        if let MemoryKind::Fact(f) = &r.memory.kind {
            // Find neighbors sharing subject or object
            let neighbors = store.find_by_subject_or_object(&f.subject, &f.object);
            for n_id in neighbors {
                *boosts.entry(n_id).or_insert(0.0) += r.score * spread_factor;
            }
        }
    }
    for r in results.iter_mut() {
        if let Some(&boost) = boosts.get(&r.memory.id) {
            r.score += boost;
        }
    }
}
```

**Why:** This is the single most brain-inspired improvement. Pattern completion: a partial cue activates related memories through the graph.

#### E. Temporal Co-occurrence Boost
If two memories were created within N minutes of each other, boost the second when the first is recalled:

```rust
fn temporal_proximity_boost(mem_a: &MemoryRecord, mem_b: &MemoryRecord) -> f64 {
    let gap_minutes = (mem_a.created_at - mem_b.created_at).num_minutes().abs() as f64;
    if gap_minutes < 30.0 {
        0.1 * (1.0 - gap_minutes / 30.0) // Linear decay over 30 min window
    } else {
        0.0
    }
}
```

**Why:** Contextual reinstatement — memories encoded in the same session are associatively linked. This is a lightweight version of co-recall tracking without needing a new association table.

#### F. Query Expansion via Subject/Object Lookup
Before BM25 search, expand the query with related terms from the graph:

1. Search for memories where subject or object partially matches query terms
2. Add their related subjects/objects to the query
3. Run BM25 on expanded query

Example: Query "Jared's pets" → finds Fact("Jared", "has_pet", "Max") → expands to "Jared's pets Max"

### 5.3 🔴 Larger Investments (Future)

#### G. Cross-Encoder Re-ranking
After RRF fusion, take top-20 candidates and re-rank with a cross-encoder. Options:
- **ms-marco-MiniLM-L-6-v2** — Tiny, fast, good enough for re-ranking 20 items
- **bge-reranker-base** — Better quality, still reasonable for small batches
- Could use the LLM API as a reranker (expensive but no local model needed)

This is the single biggest quality improvement according to IR literature but requires either a local model or API call.

#### H. Co-Recall Association Table
Track which memories are recalled together across sessions:

```sql
-- No schema change to memories table; this is a new lightweight table
CREATE TABLE IF NOT EXISTS co_recall (
    mem_a INTEGER, mem_b INTEGER,
    count INTEGER DEFAULT 1,
    last_seen TEXT,
    PRIMARY KEY (mem_a, mem_b)
);
```

When recall returns memories A, B, C together, increment co_recall for all pairs. Use co_recall counts as an additional RRF-like signal. This is true Hebbian learning for memory associations.

*Note: This adds a table but doesn't change the memories schema.*

#### I. Context Metadata Injection
Store lightweight context with each memory (channel, time-of-day bucket, conversation topic). Use as a filtering/boosting signal:

```rust
// At recall time, if we know the current channel:
if mem.context_channel == current_channel {
    score *= 1.2; // 20% boost for same-context recall
}
```

This directly implements Tulving's encoding specificity principle.

### 5.4 Priority Matrix

| Improvement | Impact | Effort | Brain Principle | Addresses |
|------------|--------|--------|----------------|-----------|
| A. Recency boost | High | Trivial | Contextual reinstatement | OC #5547 |
| B. Access pattern weight | Medium | Trivial | Hebbian strengthening | — |
| C. Adaptive threshold | Medium | Easy | Pattern completion | — |
| D. Graph spreading activation | **Very High** | Medium | Spreading activation | Core novelty |
| E. Temporal co-occurrence | High | Medium | Encoding specificity | — |
| F. Query expansion | High | Medium | Pattern completion | — |
| G. Cross-encoder reranking | **Very High** | Hard | — (pure IR) | — |
| H. Co-recall associations | High | Medium | Hebbian learning | — |
| I. Context metadata | High | Hard | Encoding specificity | OC #7776 |

### 5.5 Recommended Implementation Order

**Tonight (3am sprint):**
1. **A** — Recency boost (30 min)
2. **B** — Access pattern weighting (15 min)
3. **D** — 1-hop spreading activation (2 hours)

**This week:**
4. **C** — Adaptive threshold
5. **E** — Temporal co-occurrence
6. **F** — Query expansion

**Next week:**
7. **H** — Co-recall table
8. **G** — Cross-encoder (requires model decision)

---

## References

### Neuroscience
1. Collins, A. M., & Loftus, E. F. (1975). A spreading-activation theory of semantic processing. *Psychological Review*, 82(6), 407–428.
2. Anderson, J. R. (1983). A spreading activation theory of memory. *Journal of Verbal Learning and Verbal Behavior*, 22(3), 261–295.
3. Hebb, D. O. (1949). *The Organization of Behavior*. Wiley.
4. Bliss, T. V., & Lømo, T. (1973). Long-lasting potentiation of synaptic transmission in the dentate area of the anaesthetized rabbit. *Journal of Physiology*, 232(2), 331–356.
5. Tulving, E., & Thomson, D. M. (1973). Encoding specificity and retrieval processes in episodic memory. *Psychological Review*, 80(5), 352–373.
6. Leutgeb, J. K., et al. (2007). Pattern separation, pattern completion, and new neuronal codes within a continuous CA3 map. *Learning & Memory*, 14(11), 745–757.
7. Kirwan, C. B., & Stark, C. E. L. (2020). Pattern separation and pattern completion: Behaviorally separable processes? *Memory & Cognition*, 49, 193–205.

### Information Retrieval
8. Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. *EMNLP 2019*. arXiv:1908.10084.
9. Cormack, G. V., Clarke, C. L. A., & Büttcher, S. (2009). Reciprocal rank fusion outperforms Condorcet and individual rank learning methods. *SIGIR 2009*.
10. Khattab, O., & Zaharia, M. (2020). ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT. *SIGIR 2020*.
11. Formal, T., et al. (2021). SPLADE: Sparse Lexical and Expansion Model for Information Retrieval. *SIGIR 2021*.
12. Formal, T., et al. (2021). SPLADE v2. arXiv:2109.10086.

### Community/OpenClaw
13. OpenClaw GitHub Issues: #5547, #7776, #13027, #16670, #8921, #7273, #2080
14. InfiniFlow (2024). Dense vector + Sparse vector + Full text search + Tensor reranker = Best retrieval for RAG?
15. Weaviate (2025). Hybrid Search Explained.

   CREATE INDEX freelancer_embedding_idx ON "FreelancerProfile" USING hnsw (embedding vector_cosine_ops);
   CREATE INDEX project_embedding_idx ON "Project" USING hnsw (embedding vector_cosine_ops);
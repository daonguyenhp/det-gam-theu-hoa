import { index } from "../config/pinecone.config.js";

export const findSimilarIdiom = async (vectorEmbedding) => {
    const searchResults = await index.query({
        vector: vectorEmbedding,
        topK: 3,
        includeMetadata: true,
    });
    
    if (searchResults.matches.length === 0) return null;
    return searchResults.matches;
};
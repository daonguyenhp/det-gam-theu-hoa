import { hf } from "../config/huggingface.config.js";

export const getEmbedding = async (text) => {
    try {
        const embedding = await hf.featureExtraction({
            // model: "sentence-transformers/all-MiniLM-L6-v2", 
            model: "keepitreal/vietnamese-sbert",
            inputs: text,
        });
        return embedding;
    } catch (error) {
        console.error("Lỗi tạo Vector:", error);
        throw error;
    }
};
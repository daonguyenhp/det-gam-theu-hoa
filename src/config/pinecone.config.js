import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
// Đổi chữ 'i' nhỏ thành 'I' hoa
export const index = pinecone.index("det-gam-theu-hoa-v2");
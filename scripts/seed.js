import { InferenceClient } from "@huggingface/inference";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const hf = new InferenceClient(process.env.HF_API_KEY);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index("det-gam-theu-hoa-v2");

// Đọc file dưới dạng chuỗi Text
const rawData = fs.readFileSync(path.join(__dirname, '../ca_dao_1000.json'), 'utf8');
const dataSet = JSON.parse(rawData);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runSeed() {
    console.log(`⏳ Đang bắt đầu xử lý ${dataSet.length} câu...`);
    
    let vectorsBatch = [];
    const BATCH_SIZE = 50; 

    for (let i = 0; i < dataSet.length; i++) {
        const item = dataSet[i];
        
        if (!item || !item.text || !item.meaning) {
            console.log(`⚠️ Bỏ qua dòng ${i} bị lỗi/rỗng data!`);
            continue; 
        }

        try {
            // MẸO: Ép cả câu ca dao và ý nghĩa vào chung để AI lấy được trọn vẹn ngữ cảnh
            const textToEmbed = `${item.text}: ${item.meaning}`;

            const embedding = await hf.featureExtraction(
                {
                    model: "keepitreal/vietnamese-sbert",
                    inputs: textToEmbed, 
                },
                { 
                    provider: "hf-inference"
                }
            );
            
            const vectorValues = Array.isArray(embedding) ? embedding : Object.values(embedding);

            vectorsBatch.push({
                // Đảm bảo ID là chuỗi và duy nhất
                id: item.id ? String(item.id) : `ca-dao-${i}`,
                values: vectorValues, 
                metadata: { text: item.text, meaning: item.meaning }
            });
            
            console.log(`✅ [${i + 1}/${dataSet.length}] Đã dịch: ${item.text}`);

            // Nghỉ 1 giây sau mỗi lần gọi
            await sleep(1000);

            // Nếu gom đủ 50 câu HOẶC đã chạy đến câu cuối cùng -> Đẩy lên Pinecone
            if (vectorsBatch.length === BATCH_SIZE || i === dataSet.length - 1) {
                console.log(`🚀 Đang đẩy cụm ${vectorsBatch.length} bản ghi lên Pinecone...`);
                await index.upsert(vectorsBatch);
                console.log("☁️ Cụm này đã lên mây thành công!");
                
                // Xóa mảng tạm để gom 50 câu tiếp theo
                vectorsBatch = []; 
            }

        } catch (error) {
            console.error(`❌ Lỗi tại "${item.text}":`, error.message);
            
            // Nếu xui xẻo vẫn bị lỗi quá tải (429), cho hệ thống tự động nghỉ 5 giây rồi chạy tiếp
            if (error.message.includes("429")) {
                console.log("⚠️ API bị quá tải tạm thời, đang cho nghỉ 5 giây...");
                await sleep(5000);
            }
        }
    }
    
    console.log("🎉 ĐÃ HOÀN TẤT NẠP TOÀN BỘ DATA MỚI LÊN PINECONE!");
}

runSeed();
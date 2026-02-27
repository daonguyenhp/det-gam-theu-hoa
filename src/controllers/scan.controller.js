import { getEmbedding } from "../services/ai.service.js";
import { findSimilarIdiom } from "../services/vector.service.js";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();
// Khởi tạo bộ não mới: Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let isLLMBusy = false; 

// Hàm giám khảo phiên bản Llama 3 70B 
async function verifyMatchWithLLM(webText, idiom, meaning) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Bạn là một chuyên gia ngôn ngữ học và văn học dân gian Việt Nam. Nhiệm vụ của bạn là đối chiếu ý nghĩa ẨN DỤ (nghĩa bóng) của một đoạn văn và một câu ca dao/tục ngữ. 
                    Tuyệt đối KHÔNG đánh giá dựa trên sự trùng lặp từ ngữ (nghĩa đen).

                    Dưới đây là các ví dụ mẫu để bạn hiểu cách đánh giá:

                    [Ví dụ 1 - KHỚP NGHĨA BÓNG]
                    Đoạn văn: "Dạo này kinh tế khó khăn quá, cuối tuần tôi toàn phải cày thêm mấy job thiết kế dạo trên mạng, ráng gom góp từng đồng lẻ để cuối năm đủ tiền cưới vợ."
                    Ca dao gợi ý: "Năng nhặt chặt bị" (Ý nghĩa: Siêng năng tích cóp từng chút một rồi sẽ có được số lượng lớn).
                    Kết quả JSON: {"reasoning": "Đoạn văn nói về việc chăm chỉ làm thêm kiếm từng đồng lẻ để tích lũy. Hoàn toàn khớp với ý nghĩa tích tiểu thành đại của câu tục ngữ.", "match": true, "focusPhrase": "gom góp từng đồng lẻ"}

                    [Ví dụ 2 - KHÔNG KHỚP (Bẫy nghĩa đen)]
                    Đoạn văn: "Hôm qua đi biển chơi tự nhiên trời nổi giông bão, sóng đánh cao quá làm lật cả chiếc xuồng nhỏ của mấy chú ngư dân."
                    Ca dao gợi ý: "Chớ thấy sóng cả mà ngã tay chèo" (Ý nghĩa: Đừng vì thấy khó khăn thử thách lớn mà nản chí, bỏ cuộc).
                    Kết quả JSON: {"reasoning": "Đoạn văn tả cảnh thời tiết, bão biển và sóng lớn theo nghĩa đen. Câu tục ngữ nói về ý chí vượt qua khó khăn trong cuộc sống. Không khớp ngữ cảnh ẩn dụ.", "match": false, "focusPhrase": ""}

                    [Ví dụ 3 - KHÔNG KHỚP (Chỉ giống một phần nhỏ)]
                    Đoạn văn: "Cậu bé kia rất thông minh nhưng lại lười biếng, suốt ngày chỉ thích nằm dài xem điện thoại chờ mẹ nấu cơm cho ăn."
                    Ca dao gợi ý: "Có làm thì mới có ăn, không dưng ai dễ đem phần đến cho" (Ý nghĩa: Phải lao động mới có thành quả hưởng thụ).
                    Kết quả JSON: {"reasoning": "Đoạn văn có nhắc đến lười biếng và ăn uống, nhưng trọng tâm là mô tả tính cách cậu bé thông minh nhưng lười. Dù có ý liên quan, nhưng chưa đủ mạnh để coi là một bài học tương đồng trực tiếp.", "match": false, "focusPhrase": ""}

                    Bây giờ đến lượt bạn. Hãy suy luận từng bước và trả về ĐÚNG cấu trúc JSON sau:
                    {
                        "reasoning": "Giải thích ngắn gọn lý do dưới 50 chữ", 
                        "match": true/false, 
                        "focusPhrase": "Trích xuất 1 cụm từ 2-8 chữ từ đoạn văn thể hiện ý đó, hoặc để rỗng nếu false"
                    }`
                },
                {
                    role: "user",
                    content: `Đoạn văn cần xét: "${webText}"\nCa dao/tục ngữ gợi ý: "${idiom}" (Ý nghĩa: ${meaning})`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, 
            response_format: { type: "json_object" }, 
        });

        const resultJson = JSON.parse(completion.choices[0]?.message?.content);
        return resultJson;
    } catch (error) {
        console.error("⚠️ Lỗi LLM Giám khảo Groq:", error.message);
        return { match: false, focusPhrase: "" }; 
    }
}

export const scanText = async (req, res) => {
    try {
        const { text, frequency } = req.body;
        const vector = await getEmbedding(text);
        const topMatches = await findSimilarIdiom(vector);

        if (!topMatches || topMatches.length === 0) {
            return res.json({ matchFound: false });
        }

        let threshold = 0.60; 
        if (frequency === 1) threshold = 0.65; 
        if (frequency === 3) threshold = 0.55; 

        console.log(`\n🔍 Đang xét đoạn văn: "${text.substring(0, 40)}..."`);
        
        for (const match of topMatches) {
            
            // Nếu câu này điểm toán học quá thấp, bỏ qua luôn không thèm hỏi LLM
            if (match.score < threshold) {
                console.log(`📉 Bỏ qua câu "${match.metadata.text}" vì điểm Vector (${match.score.toFixed(3)}) thấp hơn mức sàn (${threshold}).`);
                continue; 
            }

            console.log(`📊 Đang đề xuất: "${match.metadata.text}" (Điểm Vector: ${match.score.toFixed(3)})`);
            
            // Xếp hàng đợi tránh sập API Groq
            while (isLLMBusy) { await sleep(1000); }
            isLLMBusy = true; 

            try {
                console.log("⏳ Đang nhờ Llama 3 70B thẩm định nghĩa bóng...");
                await sleep(1500); 

                const llmResult = await verifyMatchWithLLM(
                    text, 
                    match.metadata.text, 
                    match.metadata.meaning
                );

                // Nếu Llama 3 duyệt KHỚP -> Chốt đơn và ngưng vòng lặp ngay lập tức!
                if (llmResult.match && llmResult.focusPhrase) {
                    console.log(`✅ DUYỆT THÀNH CÔNG: "${match.metadata.text}"`);
                    console.log(`🎯 Bắn tỉa cụm: "${llmResult.focusPhrase}"`);
                    console.log(`💡 Lý do AI: ${llmResult.reasoning}`);
                    
                    // Trả về Frontend và kết thúc hàm
                    return res.json({ 
                        matchFound: true, 
                        idiom: match.metadata.text, 
                        meaning: match.metadata.meaning,
                        focusPhrase: llmResult.focusPhrase 
                    });
                } else {
                    // Nếu không khớp, in lý do ra và vòng lặp sẽ tự chạy sang câu Top 2, Top 3
                    console.log(`🚫 TỪ CHỐI: ${llmResult.reasoning || "Không khớp bối cảnh."}`);
                }
            } finally {
                // Nhớ mở khóa để các luồng khác chạy
                isLLMBusy = false; 
            }
        } // Kết thúc vòng lặp

        // NẾU CHẠY HẾT 3 CÂU MÀ LLM VẪN LẮC ĐẦU -> Báo cho Frontend là không có gì
        console.log("❌ Đã xét hết danh sách Top nhưng không có câu nào thực sự khớp nghĩa bóng.");
        return res.json({ matchFound: false });

    } catch (error) {
        console.error("Scan Controller Error:", error);
        res.status(500).json({ error: "Lỗi hệ thống AI" });
    }
};
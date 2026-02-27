import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

// ⚠️ Đổi link trang web mới vào đây (Ví dụ: link trang 2, trang 3...)
const BASE_URL = 'https://loigiaihay.com'; 
const MAIN_PAGE_URL = `${BASE_URL}/thanh-ngu-viet-nam-c1411.html`; 
const FILE_NAME = 'ca_dao_1000.json'; // Tên file chứa data cũ

let idiomsData = [];

// ==========================================
// BƯỚC 0: ĐỌC DỮ LIỆU CŨ TỪ FILE (NẾU CÓ)
// ==========================================
if (fs.existsSync(FILE_NAME)) {
    const rawData = fs.readFileSync(FILE_NAME, 'utf-8');
    idiomsData = JSON.parse(rawData);
    console.log(`📦 Đã tải ${idiomsData.length} câu từ database cũ. Sẽ cào nối tiếp!`);
} else {
    console.log("📦 Chưa có database cũ, sẽ tự động tạo file mới.");
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeData() {
    console.log("🚀 Khởi động Bot Cào Nối Tiếp...");
    const linksToCrawl = [];

    // ==========================================
    // LỚP 1: LẤY TÊN VÀ LINK Ở TRANG DANH SÁCH
    // ==========================================
    try {
        console.log(`⏳ Đang quét trang: ${MAIN_PAGE_URL}`);
        const { data } = await axios.get(MAIN_PAGE_URL);
        const $ = cheerio.load(data);

        $('.wiki-article a').each((index, element) => {
            let text = $(element).text().trim();
            let href = $(element).attr('href');
            
            if (text && href) {
                if (!href.startsWith('http')) {
                    href = BASE_URL + href; 
                }
                // CHỐNG TRÙNG LẶP: Chỉ cào nếu câu này chưa có trong file cũ
                const isExist = idiomsData.find(item => item.text === text);
                if (!isExist) {
                    linksToCrawl.push({ text, href });
                }
            }
        });
        console.log(`✅ Lọc xong! Có ${linksToCrawl.length} câu mới cần cào.`);

        if (linksToCrawl.length === 0) {
            console.log("🎉 Không có câu nào mới. Dừng Bot!");
            return;
        }

    } catch (error) {
        console.error("❌ Lỗi rớt mạng ở Lớp 1:", error.message);
        return; 
    }

    // ==========================================
    // LỚP 2: LẶN VÀO TỪNG LINK LẤY Ý NGHĨA
    // ==========================================
    // 💡 ID sẽ tự động bắt đầu từ độ dài mảng hiện tại + 1 (Ví dụ: 316 + 1 = 317)
    let idCounter = idiomsData.length + 1; 

    for (let i = 0; i < linksToCrawl.length; i++) {
        const item = linksToCrawl[i];
        
        try {
            console.log(`[${i+1}/${linksToCrawl.length}] Đang đọc: ${item.text}...`);
            const { data } = await axios.get(item.href);
            const $detail = cheerio.load(data);

            let meaning = $detail('.wiki-note').text(); 

            if (meaning) {
                meaning = meaning.replace(/\s+/g, ' ').replace(/^"|"$/g, '').trim();

                idiomsData.push({
                    id: idCounter.toString(),
                    text: item.text,
                    meaning: meaning
                });
                idCounter++;
            } else {
                console.log(`⚠️ Bài này rỗng ý nghĩa: ${item.text}`);
            }

            await delay(1500); 

        } catch (error) {
            console.error(`❌ Lỗi rớt mạng ở bài ${item.text}:`, error.message);
        }
    }

    // ==========================================
    // XUẤT RA FILE JSON NỐI TIẾP
    // ==========================================
    fs.writeFileSync(FILE_NAME, JSON.stringify(idiomsData, null, 2), 'utf-8');
    console.log(`\n🎉 TUYỆT VỜI! Đã lưu thành công. Tổng số bản ghi hiện tại: ${idiomsData.length}`);
}

scrapeData();
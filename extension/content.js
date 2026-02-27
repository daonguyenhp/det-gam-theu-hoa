console.log("🚀 Dệt Gấm Thêu Hoa: Chế độ Nhuộm Đỏ - Bản Chống Sập Quota!");

// 1. Khởi tạo CSS & Tooltip
const style = document.createElement('style');
style.textContent = `
    .dg-red-hot {
        background-color: #d63031 !important;
        color: white !important;
        padding: 2px 4px !important;
        border-radius: 4px !important;
        cursor: help !important;
        font-weight: bold !important;
        display: inline !important;
        border-bottom: 2px solid #b2bec3 !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
    }
    .dg-tooltip {
        display: none; position: fixed; z-index: 2147483647;
        background: #2d3436; color: white; padding: 12px;
        border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        max-width: 280px; pointer-events: none; font-size: 14px;
        border-left: 5px solid #ff7675; line-height: 1.5; font-family: sans-serif;
    }
`;
document.head.appendChild(style);

const tooltip = document.createElement("div");
tooltip.className = "dg-tooltip";
document.body.appendChild(tooltip);

// 2. Xử lý UI (Tooltip bám chuột)
document.addEventListener("mouseover", (e) => {
    const target = e.target.closest(".dg-red-hot");
    if (target) {
        tooltip.innerHTML = `
            <div style="color: #ff7675; font-weight: bold; margin-bottom: 5px;">💡 ${target.dataset.idiom}</div>
            <div style="opacity: 0.9;">${target.dataset.meaning}</div>
        `;
        tooltip.style.display = "block";
    }
});
document.addEventListener("mousemove", (e) => {
    if (tooltip.style.display === "block") {
        tooltip.style.left = (e.clientX + 15) + "px";
        tooltip.style.top = (e.clientY + 15) + "px";
    }
});
document.addEventListener("mouseout", (e) => {
    if (e.target.closest(".dg-red-hot")) tooltip.style.display = "none";
});

// --- 3. QUẢN LÝ HÀNG ĐỢI (CHỐNG LỖI 429) ---
let requestQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;
    isProcessing = true;

    while (requestQueue.length > 0) {
        const { el, text } = requestQueue.shift();
        
        // Gửi request cho Backend
        await new Promise(resolve => {
            chrome.runtime.sendMessage(
                { action: "scanText", text: text, frequency: 2 },
                (res) => {
                    if (res && res.matchFound) {
                        console.log(`🎯 AI duyệt khớp: ${res.idiom} - Bắn cụm: "${res.focusPhrase}"`);
                        applyFocusRed(el, res.idiom, res.meaning, res.focusPhrase); 
                    }
                    resolve();
                }
            );
        });

        // Nghỉ 4 giây giữa mỗi lần gửi để Gemini không bị quá tải
        await new Promise(r => setTimeout(r, 7000));
    }
    isProcessing = false;
}

// 4. LOGIC QUÉT VĂN BẢN (Dùng Queue)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            // Tăng lên 50 ký tự để lọc bớt "rác" trang web
            if (el.innerText.trim().length > 50 && !el.dataset.scanned) {
                el.dataset.scanned = 'true';
                requestQueue.push({ el, text: el.innerText.trim() });
                processQueue();
            }
        }
    });
}, { threshold: 0.1 });

setTimeout(() => {
    // Chỉ quét các thẻ chính để giảm số lượng request
    document.querySelectorAll('p, h2, h3').forEach(el => observer.observe(el));
}, 1500);

// 5. HÀM NHUỘM ĐỎ
function applyFocusRed(element, idiom, meaning, focusPhrase) {
    const originalHTML = element.innerHTML;
    let targetText = "";

    // 1. Ưu tiên cao nhất: Tìm cụm từ trọng tâm do AI Llama 3 trích xuất
    if (focusPhrase && focusPhrase.length > 0 && originalHTML.includes(focusPhrase)) {
        targetText = focusPhrase;
    } 
    // 2. Phương án dự phòng (Fallback): Nếu AI không tìm được cụm từ chính xác, tô đỏ câu đầu tiên
    else {
        const textOnWeb = element.innerText;
        const sentences = textOnWeb.split(/([.!?\n])/g).filter(s => s.trim().length > 10);
        targetText = sentences.length > 0 ? sentences[0].trim() : textOnWeb.substring(0, 30).trim();
    }

    // 3. Tiến hành nhuộm đỏ
    if (targetText && originalHTML.includes(targetText)) {
        // Biến cụm từ mục tiêu thành một thẻ <span> rực rỡ
        const redSpan = `<span class="dg-red-hot" 
            data-idiom="${idiom.replace(/"/g, '&quot;')}" 
            data-meaning="${meaning.replace(/"/g, '&quot;')}">${targetText}</span>`;
        
        // Thay thế văn bản gốc bằng thẻ span vừa tạo
        element.innerHTML = originalHTML.replace(targetText, redSpan);
    } else {
        // Phương án cứu cánh cuối cùng: Nhuộm cả khối thẻ (ít khi xảy ra)
        element.classList.add("dg-red-hot");
        element.dataset.idiom = idiom;
        element.dataset.meaning = meaning;
    }
}
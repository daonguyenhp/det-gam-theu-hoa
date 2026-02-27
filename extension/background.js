chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanText") {
        console.log("📥 Background nhận lệnh quét:", request.text.substring(0, 30));
        console.log("🚀 Đang bắn data lên Server...");

        fetch("https://api-detgamtheuhoa.onrender.com/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text: request.text, 
                frequency: request.frequency 
            })
        })
        .then(response => {
            console.log("✅ Server đã trả lời! Status:", response.status);
            return response.json();
        })
        .then(data => {
            // ĐÂY LÀ DÒNG LỆNH IN KẾT QUẢ ĐỂ BẮT LỖI NÈ:
            console.log("🎁 Dữ liệu AI trả về:", data); 
            sendResponse(data); 
        })
        .catch(error => {
            console.error("❌ Lỗi Background Fetch:", error);
            sendResponse({ error: true, message: error.message });
        });

        return true; 
    }
});
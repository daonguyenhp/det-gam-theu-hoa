// Lấy các thẻ HTML ra để thao tác
const slider = document.getElementById('freqSlider');
const label = document.getElementById('freqLabel');
const labels = ["Ít (Khắt khe)", "Vừa phải", "Nhiều (Thoải mái)"];

// 1. Khi mở popup lên, kiểm tra xem trước đó user đã lưu cài đặt gì chưa
chrome.storage.sync.get(['freqSetting'], (result) => {
    // Nếu chưa có (lần đầu cài), mặc định là 2
    const savedValue = result.freqSetting || 2;
    slider.value = savedValue;
    label.innerText = labels[savedValue - 1];
    updateColor(savedValue);
});

// 2. Khi user kéo thanh trượt
slider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    
    // Cập nhật chữ hiển thị
    label.innerText = labels[val - 1];
    updateColor(val);

    // Lưu ngay vào bộ nhớ trình duyệt (Chrome Storage)
    chrome.storage.sync.set({ freqSetting: val }, () => {
        console.log("Đã lưu cài đặt tần suất:", val);
    });
});

// Hàm đổi màu chữ cho đẹp (Xanh lá -> Vàng -> Cam)
function updateColor(val) {
    if (val === 1) label.style.color = "#00b894"; // Xanh
    if (val === 2) label.style.color = "#fdcb6e"; // Vàng
    if (val === 3) label.style.color = "#e17055"; // Cam
}
import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";

// Đọc biến môi trường
dotenv.config();

// Kiểm tra xem có Key chưa để báo lỗi cho dễ biết
if (!process.env.HF_API_KEY) {
    console.error("❌ LỖI: Chưa có HF_API_KEY trong file .env");
    process.exit(1);
}

// Khởi tạo và xuất (export) client ra để các file khác dùng chung
export const hf = new InferenceClient(process.env.HF_API_KEY);
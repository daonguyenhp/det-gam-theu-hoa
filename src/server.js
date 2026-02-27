import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.route.js";

const app = express();

app.use(cors());
app.use(express.json());

// Gắn bộ định tuyến
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
    res.send("🚀 Server Backend Dệt Gấm Thêu Hoa đang chạy!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Backend Dệt Gấm Thêu Hoa chạy tại port ${PORT}`);
});
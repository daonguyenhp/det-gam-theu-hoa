import express from "express";
import { scanText } from "../controllers/scan.controller.js";

const router = express.Router();

router.post("/scan", scanText);

export default router;
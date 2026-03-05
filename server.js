const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const path = require("path");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Test MySQL connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL Database connected successfully");
    connection.release();
  } catch (error) {
    console.error("❌ MySQL Database connection failed:", error.message);
  }
})();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend from public folder
app.use(express.static(path.join(__dirname, "public")));

// URL Validation helper
const isValidUrl = (urlStr) => {
  try {
    new URL(urlStr);
    return true;
  } catch (err) {
    return false;
  }
};

// ---------------- API ENDPOINTS ---------------- //

// 1️⃣ Generate QR Code
app.post("/api/generate", async (req, res) => {
  try {
    const { url, size = 250, color = "#000000", bgColor = "#FFFFFF" } = req.body;

    // Validation
    if (!url || typeof url !== "string" || url.trim() === "") {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ success: false, error: "Invalid URL format" });
    }

    const qrSize = parseInt(size, 10);

    if (isNaN(qrSize) || qrSize <= 0) {
      return res.status(400).json({ success: false, error: "Invalid size" });
    }

    // Generate QR Code
    const qrOptions = {
      width: qrSize,
      color: {
        dark: color,
        light: bgColor,
      },
    };

    const qrImage = await QRCode.toDataURL(url, qrOptions);

    // Save to Database
    const query = `
      INSERT INTO qr_codes (url, qr_image, size, color, bg_color)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      url,
      qrImage,
      qrSize,
      color,
      bgColor,
    ]);

    return res.status(200).json({
      success: true,
      qrImage: qrImage,
      id: result.insertId,
    });

  } catch (error) {
    console.error("Error generating QR:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 2️⃣ Get History
app.get("/api/history", async (req, res) => {
  try {
    const query = "SELECT * FROM qr_codes ORDER BY created_at DESC LIMIT 10";
    const [rows] = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching history:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// 3️⃣ Delete QR Code
app.delete("/api/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM qr_codes WHERE id = ?";
    const [result] = await pool.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error deleting record:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ---------------- START SERVER ---------------- //

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
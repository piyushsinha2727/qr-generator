const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const path = require("path");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* Middleware */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* Database test */

(async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
})();

/* URL validation */

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/* Generate QR */

app.post("/api/generate", async (req, res) => {
  try {
    const { url, size = 250, color = "#000000", bgColor = "#FFFFFF" } = req.body;

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing URL"
      });
    }

    const qrSize = parseInt(size) || 250;

    const qrImage = await QRCode.toDataURL(url, {
      width: qrSize,
      color: {
        dark: color,
        light: bgColor
      }
    });

    const query = `
      INSERT INTO qr_codes (url, qr_image, size, color, bg_color)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
    `;

    const result = await pool.query(query, [
      url,
      qrImage,
      qrSize,
      color,
      bgColor
    ]);

    res.json({
      success: true,
      qrImage: qrImage,
      id: result.rows[0].id
    });

  } catch (error) {
    console.error("❌ QR generation error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/* History */

app.get("/api/history", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM qr_codes ORDER BY created_at DESC LIMIT 10"
    );

    res.json(result.rows);

  } catch (error) {
    console.error("❌ History fetch error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch history"
    });
  }
});

/* Delete */

app.delete("/api/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM qr_codes WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Record not found"
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({
      success: false,
      error: "Delete failed"
    });
  }
});

/* Start server locally only */

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
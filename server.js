const express = require("express");
const cors = require("cors");
const QRCode = require("qrcode");
const path = require("path");
const { saveQrCode, getHistory, deleteQrCode } = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* Middleware */

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

    const id = await saveQrCode({
      url,
      qrImage,
      qrSize,
      color,
      bgColor
    });

    res.json({
      success: true,
      qrImage: qrImage,
      id: id
    });

  } catch (error) {
    console.error("❌ QR generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
});

/* History */

app.get("/api/history", async (req, res) => {
  try {
    const history = await getHistory();
    res.json(history);
  } catch (error) {
    console.error("❌ History fetch error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch history"
    });
  }
});

/* Delete */

app.delete("/api/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteQrCode(id);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Delete failed"
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
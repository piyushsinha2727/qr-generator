const { createClient } = require("@supabase/supabase-js");
const { Pool } = require("pg");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const connectionString = process.env.DATABASE_URL;

let supabase = null;
let pool = null;

if (supabaseUrl && supabaseKey) {
  console.log("⚡ Using Supabase JS Client (HTTPS API)");
  supabase = createClient(supabaseUrl, supabaseKey);
} else if (connectionString) {
  console.log("🐘 Using PostgreSQL Pool (pg)");
  pool = new Pool({
    connectionString,
    ssl: (connectionString.includes("localhost") || connectionString.includes("127.0.0.1"))
      ? false
      : { rejectUnauthorized: false }
  });
} else {
  console.warn("⚠️ No Database credentials found in environment variables.");
}

async function saveQrCode({ url, qrImage, qrSize, color, bgColor }) {
  if (supabase) {
    const { data, error } = await supabase
      .from("qr_codes")
      .insert([{ url, qr_image: qrImage, size: qrSize, color, bg_color: bgColor }])
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  } else if (pool) {
    const query = `
      INSERT INTO qr_codes (url, qr_image, size, color, bg_color)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
    `;
    const result = await pool.query(query, [url, qrImage, qrSize, color, bgColor]);
    return result.rows[0].id;
  } else {
    throw new Error("Database configuration missing. Please set SUPABASE_URL & SUPABASE_KEY or DATABASE_URL in Vercel.");
  }
}

async function getHistory() {
  if (supabase) {
    const { data, error } = await supabase
      .from("qr_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data || [];
  } else if (pool) {
    const result = await pool.query("SELECT * FROM qr_codes ORDER BY created_at DESC LIMIT 10");
    return result.rows;
  } else {
    throw new Error("Database configuration missing. Please set SUPABASE_URL & SUPABASE_KEY or DATABASE_URL in Vercel.");
  }
}

async function deleteQrCode(id) {
  if (supabase) {
    const { error } = await supabase
      .from("qr_codes")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  } else if (pool) {
    const result = await pool.query("DELETE FROM qr_codes WHERE id = $1", [id]);
    return result.rowCount > 0;
  } else {
    throw new Error("Database configuration missing. Please set SUPABASE_URL & SUPABASE_KEY or DATABASE_URL in Vercel.");
  }
}

module.exports = {
  saveQrCode,
  getHistory,
  deleteQrCode,
  pool,
  supabase
};
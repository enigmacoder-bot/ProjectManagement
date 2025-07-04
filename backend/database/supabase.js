const supa = require("@supabase/supabase-js");

// Use hardcoded URL as environment variables are not set correctly
const SUPABASE_URL = process.env.SUPABASE_URL || "https://jswiqxlveqcgrdnohbcn.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Log which URL is being used for debugging
console.log("Using Supabase URL:", SUPABASE_URL);

const supabase = supa.createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;

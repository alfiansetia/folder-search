//! Spreadsheet API — port view Spreadsheet versi Electron lama (`app.js:642`).
//!
//! - Kolom tampil NO/KODE/NAME/Cat/UOM/P/L/T/B dipetakan dari baris mentah
//!   (array JSON) indeks 1,3,4,5,6,8,9,10,11.
//! - Tidak-lengkap bila salah satu P/L/T/B kosong atau "0" (`app.js:675`).
//! - Cari teks di indeks mentah 1,3,4,5,6 (`app.js:717`).
//! - Response diterima apa adanya: Array langsung, atau Object yang salah
//!   satu value-nya Array (`app.js:877`).
//! Lihat juga `.ai/FUNCTIONS.md`.

use serde_json::Value;

const IDX_NO: usize = 1;
const IDX_KODE: usize = 3;
const IDX_NAME: usize = 4;
const IDX_CAT: usize = 5;
const IDX_UOM: usize = 6;
const IDX_P: usize = 8;
const IDX_L: usize = 9;
const IDX_T: usize = 10;
const IDX_B: usize = 11;

/// Indeks mentah yang ikut pencarian teks.
const SEARCH_IDXS: [usize; 5] = [IDX_NO, IDX_KODE, IDX_NAME, IDX_CAT, IDX_UOM];

/// Satu baris siap tampil (display + flag warning). Baris mentah untuk cache
/// disimpan terpisah sebagai `Vec<String>` (lihat `parse_api_json`).
#[derive(Clone, Debug, Default)]
pub struct SsRow {
    pub no: String,
    pub kode: String,
    pub name: String,
    pub cat: String,
    pub uom: String,
    pub p: String,
    pub l: String,
    pub t: String,
    pub b: String,
    pub incomplete: bool,
    pub warn_p: bool,
    pub warn_l: bool,
    pub warn_t: bool,
    pub warn_b: bool,
    search_text: String,
}

fn raw_cell(raw: &[String], i: usize) -> String {
    raw.get(i).map(|s| s.trim().to_string()).unwrap_or_default()
}

/// Tampilan sel: sel kosong tampil "—" (versi lama: null → "—").
fn display_cell(raw: &[String], i: usize) -> String {
    let v = raw_cell(raw, i);
    if v.is_empty() {
        "—".to_string()
    } else {
        v
    }
}

/// Sel P/L/T/B dianggap bermasalah bila kosong atau "0".
fn warn_cell(raw: &[String], i: usize) -> bool {
    let v = raw_cell(raw, i);
    v.is_empty() || v == "0"
}

/// Bangun baris tampil dari baris mentah. Dipakai juga saat load cache.
pub fn row_from_raw(raw: &[String]) -> SsRow {
    let (wp, wl, wt, wb) = (
        warn_cell(raw, IDX_P),
        warn_cell(raw, IDX_L),
        warn_cell(raw, IDX_T),
        warn_cell(raw, IDX_B),
    );
    let search_text = SEARCH_IDXS
        .iter()
        .map(|&i| raw_cell(raw, i).to_lowercase())
        .collect::<Vec<_>>()
        .join(" ");
    SsRow {
        no: display_cell(raw, IDX_NO),
        kode: display_cell(raw, IDX_KODE),
        name: display_cell(raw, IDX_NAME),
        cat: display_cell(raw, IDX_CAT),
        uom: display_cell(raw, IDX_UOM),
        p: display_cell(raw, IDX_P),
        l: display_cell(raw, IDX_L),
        t: display_cell(raw, IDX_T),
        b: display_cell(raw, IDX_B),
        incomplete: wp || wl || wt || wb,
        warn_p: wp,
        warn_l: wl,
        warn_t: wt,
        warn_b: wb,
        search_text,
    }
}

fn json_to_string(v: &Value) -> String {
    match v {
        Value::Null => String::new(),
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

/// Parse response API → (baris tampil, baris mentah untuk cache).
/// Baris non-array dilewati. Error = `String` siap tampil di status.
pub fn parse_api_json(data: &Value) -> Result<(Vec<SsRow>, Vec<Vec<String>>), String> {
    const ERR: &str = "Format data bukan Array. Pastikan API mengembalikan list.";
    let arr: &Vec<Value> = match data {
        Value::Array(a) => a,
        Value::Object(map) => match map.values().find(|v| v.is_array()) {
            Some(Value::Array(a)) => a,
            _ => return Err(ERR.into()),
        },
        _ => return Err(ERR.into()),
    };
    let mut rows = Vec::new();
    let mut raw_rows = Vec::new();
    for item in arr {
        let Value::Array(cols) = item else { continue };
        let raw: Vec<String> = cols.iter().map(json_to_string).collect();
        rows.push(row_from_raw(&raw));
        raw_rows.push(raw);
    }
    Ok((rows, raw_rows))
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum SsStatus {
    All,
    Complete,
    Incomplete,
}

/// Mapping label ComboBox → filter (`UI.md`: "Semua"/"Lengkap"/"Tidak Lengkap").
pub fn status_from_label(label: &str) -> SsStatus {
    match label {
        "Lengkap" => SsStatus::Complete,
        "Tidak Lengkap" => SsStatus::Incomplete,
        _ => SsStatus::All,
    }
}

/// Filter baris by status + query (query kosong = semua, paritas lama).
pub fn filter_rows(rows: &[SsRow], query: &str, status: &SsStatus) -> Vec<SsRow> {
    let q = query.trim().to_lowercase();
    rows.iter()
        .filter(|r| {
            match status {
                SsStatus::Complete if r.incomplete => return false,
                SsStatus::Incomplete if !r.incomplete => return false,
                _ => {}
            }
            q.is_empty() || r.search_text.contains(&q)
        })
        .cloned()
        .collect()
}

/// Fetch API (blocking). WAJIB dipanggil dari worker thread, JANGAN di UI
/// thread — lihat pola `on_ss_fetch` di `src/main.rs` + `.ai/RULES.md`.
pub fn fetch_api(url: &str) -> Result<Value, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(url)
        .send()
        .map_err(|e| format!("Gagal request: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP Error: {}", resp.status()));
    }
    resp.json::<Value>()
        .map_err(|e| format!("Gagal parse JSON: {}", e))
}

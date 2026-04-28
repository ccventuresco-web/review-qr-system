const fs = require("fs/promises");
const path = require("path");
const { google } = require("googleapis");

const localDataPath = path.join(__dirname, "..", "data", "responses.json");

function hasGoogleSheetsConfig() {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

async function appendToLocalFile(row) {
  await fs.mkdir(path.dirname(localDataPath), { recursive: true });

  let existing = [];
  try {
    existing = JSON.parse(await fs.readFile(localDataPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  existing.push(row);
  await fs.writeFile(localDataPath, JSON.stringify(existing, null, 2));
}

async function appendToGoogleSheet(row) {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Respuestas!A:D",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[row.date, row.business, row.rating, row.comment]]
    }
  });
}

async function saveReview(row) {
  if (hasGoogleSheetsConfig()) {
    await appendToGoogleSheet(row);
    return { storage: "google_sheets" };
  }

  await appendToLocalFile(row);
  return { storage: "local_file" };
}

module.exports = {
  saveReview,
  hasGoogleSheetsConfig
};

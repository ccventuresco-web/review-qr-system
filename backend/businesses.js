const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config", "businesses.json");

function getBusinesses() {
  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}

function getBusinessOrNull(id) {
  const businesses = getBusinesses();
  return businesses[id] ? { id, ...businesses[id] } : null;
}

module.exports = {
  getBusinesses,
  getBusinessOrNull
};

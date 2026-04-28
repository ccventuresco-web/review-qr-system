require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const QRCode = require("qrcode");
const { getBusinessOrNull } = require("./businesses");
const { saveReview, hasGoogleSheetsConfig } = require("./sheets");

const app = express();
const port = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, "..", "frontend");

app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(express.static(frontendPath));

function getPublicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    sheetsConfigured: hasGoogleSheetsConfig()
  });
});

app.get("/api/businesses/:businessId", (req, res) => {
  const business = getBusinessOrNull(req.params.businessId);
  if (!business) {
    return res.status(404).json({ error: "Negocio no encontrado" });
  }

  res.json({
    id: business.id,
    name: business.name,
    thankYouLow: business.thankYouLow,
    thankYouHigh: business.thankYouHigh
  });
});

app.get("/api/link/:businessId", (req, res) => {
  const business = getBusinessOrNull(req.params.businessId);
  if (!business) {
    return res.status(404).json({ error: "Negocio no encontrado" });
  }

  res.json({
    businessId: business.id,
    url: `${getPublicBaseUrl(req)}/r/${business.id}`
  });
});

app.get("/api/qr/:businessId", async (req, res, next) => {
  try {
    const business = getBusinessOrNull(req.params.businessId);
    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    const url = `${getPublicBaseUrl(req)}/r/${business.id}`;
    const png = await QRCode.toBuffer(url, {
      type: "png",
      margin: 2,
      width: 900,
      color: {
        dark: "#111827",
        light: "#ffffff"
      }
    });

    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (error) {
    next(error);
  }
});

app.post("/api/reviews", async (req, res, next) => {
  try {
    const { businessId, rating, comment = "" } = req.body;
    const business = getBusinessOrNull(businessId);
    const numericRating = Number(rating);

    if (!business) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: "La puntuacion debe estar entre 1 y 5" });
    }

    const cleanComment = String(comment).trim().slice(0, 1000);
    const row = {
      date: new Date().toISOString(),
      business: business.name,
      rating: numericRating,
      comment: cleanComment
    };

    const saved = await saveReview(row);
    const shouldRedirectToGoogle = numericRating >= 4 && business.googleReviewUrl;

    res.json({
      ok: true,
      storage: saved.storage,
      privateFeedback: numericRating <= 3,
      message: numericRating >= 4 ? business.thankYouHigh : business.thankYouLow,
      redirectUrl: shouldRedirectToGoogle ? business.googleReviewUrl : null
    });
  } catch (error) {
    next(error);
  }
});

app.get(["/", "/r/:businessId"], (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});
app.get("/:id", (req, res) => {
  const business = getBusinessOrNull(req.params.id);

  if (!business) {
    return res.send("Negocio no configurado");
  }

  res.send(`
    <h1>${business.name}</h1>
    <a href="${business.googleReviewUrl}" target="_blank">
      Dejar reseña en Google
    </a>
  `);
});
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "No se pudo procesar la solicitud"
  });
});

app.listen(port, () => {
  console.log(`Sistema de resenas QR iniciado en http://localhost:${port}`);
});

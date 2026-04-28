const express = require("express");
const sql = require("mssql");
const app = express();
const path = require("path");

const port = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
  server: process.env.DB_SERVER || "232701.database.windows.net",
  database: process.env.DB_DATABASE || "GIF_projekt_prize",
  authentication: {
    type: "default",
    options: {
      userName: process.env.DB_USER || "admin232701",
      password: process.env.DB_PASSWORD || "GIFVUT2026@"
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000
  }
};

// Middleware
app.use(express.static(path.join(__dirname, "public")));

// Main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint to get shops
app.get("/api/shops", async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const result = await pool.request().query(`
      SELECT DISTINCT
        S.ShopID,
        TRIM(S.ShopName) AS ShopName,
        TRIM(S.Website) AS Website,
        TRIM(S.ShopType) AS ShopType,
        L.LocationID,
        TRIM(L.City) AS City,
        TRIM(L.[Index]) AS Index,
        TRIM(L.Address) AS Address,
        L.Latitude,
        L.Longitude
      FROM Shops S
      LEFT JOIN ShopLocation L ON S.ShopID = L.ShopID
      ORDER BY ShopName
    `);

    await pool.close();
    res.json(result.recordset);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// API endpoint to get shop types
app.get("/api/shop-types", async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    
    const result = await pool.request()
      .query("SELECT DISTINCT TRIM(ShopType) as ShopType FROM Shops ORDER BY ShopType");
    
    await pool.close();
    res.json(result.recordset.map(r => r.ShopType));
  } catch (err) {
    console.error("Database error:", err);
    // Fallback mock data
    res.json(["online", "offline", "online+offline"]);
  }
});

// API endpoint to get last database update
app.get("/api/last-update", async (req, res) => {
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    
    // Try to get the latest update from the database
    // First, check if there's an UpdatedAt column, otherwise use GETDATE()
    const result = await pool.request()
      .query(`
        SELECT TOP 1 
          MAX(CAST(ISNULL([UpdatedAt], GETDATE()) AS DATETIME)) as lastUpdate
        FROM Shops
      `);
    
    await pool.close();
    
    const lastUpdate = result.recordset[0]?.lastUpdate || new Date();
    res.json({ lastUpdate: lastUpdate });
  } catch (err) {
    console.error("Database error:", err);
    // Return current date if query fails
    res.json({ lastUpdate: new Date() });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
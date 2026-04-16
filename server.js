const express = require("express");
const bodyParser = require("body-parser");
const hana = require("@sap/hana-client");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const port = process.env.PORT || 3000;

// 🔍 Debug (optional but helpful)
console.log("ENV CHECK:");
console.log("HANA_HOST:", process.env.HANA_HOST);
console.log("HANA_USER:", process.env.HANA_USER);

// ✅ HANA connection using ENV variables
function getConnection() {
    const conn = hana.createConnection();

    conn.connect({
        serverNode: process.env.HANA_HOST + ":443",
        uid: process.env.HANA_USER,
        pwd: process.env.HANA_PASSWORD,
        encrypt: true
    });

    return conn;
}

// ✅ API to insert user
app.post("/addUser", (req, res) => {
    const { userId, userName, location } = req.body;

    console.log("Received:", userId, userName, location);

    const conn = getConnection();

    const query = `
        INSERT INTO "SECOPSDEV"."SUPERUSER"
        ("USER_ID", "USER_NAME", "LOCATION")
        VALUES (?, ?, ?)
    `;

    conn.exec(query, [userId, userName, location], (err) => {
        if (err) {
            console.error("DB ERROR:", err);
            return res.status(500).send("DB ERROR: " + err.message);
        }

        console.log("Insert success");
        res.send("User added successfully");

        conn.disconnect();
    });
});
// ✅ Optional test API (for debugging DB connection)
app.get("/test", (req, res) => {
    const conn = getConnection();

    conn.exec("SELECT 1 FROM DUMMY", (err, result) => {
        if (err) {
            console.error("TEST ERROR:", err);
            return res.send("DB connection failed: " + err.message);
        }
        res.send("DB Connected Successfully!");
        conn.disconnect();
    });
});

// 🚨 REQUIRED for Cloud Foundry
app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});
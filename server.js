const express = require("express");
const bodyParser = require("body-parser");
const hana = require("@sap/hana-client");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const port = process.env.PORT || 3000;

// 🔍 Debug (optional but useful)
console.log("ENV CHECK:");
console.log("HANA_HOST:", process.env.HANA_HOST);
console.log("HANA_USER:", process.env.HANA_USER);

// ✅ HANA connection (ENV variables)
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

    const conn = getConnection();

    const query = `
        INSERT INTO "secopsdev"."SUPERUSER"
        ("USER_ID", "USER_NAME", "LOCATION")
        VALUES (?, ?, ?)
    `;

    conn.exec(query, [userId, userName, location], (err) => {
        if (err) {
            console.error("DB ERROR:", err);
            return res.status(500).send("Insert failed: " + err.message);
        }

        res.send("User added successfully");
        conn.disconnect();
    });
});

// 🚨 THIS IS THE MISSING PART (VERY IMPORTANT)
app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
});
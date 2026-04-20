require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const hana = require("@sap/hana-client");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const port = process.env.PORT || 3000;

console.log("ENV CHECK:");
console.log("HANA_HOST:", process.env.HANA_HOST);
console.log("HANA_USER:", process.env.HANA_USER);
console.log("VCAP_SERVICES set:", Boolean(process.env.VCAP_SERVICES));

function decodeUnicodeEscapes(value) {
    if (typeof value !== "string") return value;

    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    );
}

// ✅ Get HANA Config (Local + CF)
function getHanaConfig() {
    // 🔹 Local (.env)
    if (process.env.HANA_HOST && process.env.HANA_USER && process.env.HANA_PASSWORD) {
        console.log("HANA credential source: .env");

        return {
            serverNode: `${process.env.HANA_HOST}:${process.env.HANA_PORT || "443"}`,
            uid: process.env.HANA_USER,
            pwd: process.env.HANA_PASSWORD,
            encrypt: true,
            sslValidateCertificate: false,
            connectTimeout: 30000
        };
    }

    // 🔹 Cloud Foundry (VCAP)
    if (process.env.VCAP_SERVICES) {
        console.log("Reading from VCAP_SERVICES...");

        const services = JSON.parse(process.env.VCAP_SERVICES);
        const hanaService = services["user-provided"]
            ?.find(s => s.name === "secops")?.credentials;

        if (hanaService) {
            return {
                serverNode: `${hanaService.HANA_HOST}:${hanaService.HANA_PORT || "443"}`,
                uid: hanaService.HANA_USER,
                pwd: decodeUnicodeEscapes(hanaService.HANA_PASSWORD),
                encrypt: true,
                sslValidateCertificate: false,
                connectTimeout: 30000
            };
        }
    }

    throw new Error("HANA credentials not found");
}

//
// ✅ TEST CONNECTION API
//
app.get("/test", (req, res) => {
    const conn = hana.createConnection();
    const config = getHanaConfig();

    conn.connect(config, (err) => {
        if (err) {
            console.error("Connection failed:", err);
            return res.status(500).send("Connection failed: " + err.message);
        }

        conn.exec("SELECT 1 FROM DUMMY", (err) => {
            if (err) {
                console.error("Query failed:", err);
                return res.status(500).send("Query failed: " + err.message);
            }

            res.send("✅ DB Connected Successfully!");
            conn.disconnect();
        });
    });
});

//
// ✅ INSERT / UPSERT USER
//
app.post("/addUser", (req, res) => {
    const { userId, userName, location } = req.body;

    const conn = hana.createConnection();
    const config = getHanaConfig();

    conn.connect(config, (err) => {
        if (err) {
            console.error("Connection error:", err);
            return res.status(500).send(err.message);
        }

        const query = `
            UPSERT "SECOPSDEV"."SUPERUSER"
            ("USER_ID", "USER_NAME", "LOCATION")
            VALUES (?, ?, ?)
            WITH PRIMARY KEY
        `;

        conn.exec(query, [userId, userName, location], (err) => {
            if (err) {
                console.error("DB ERROR:", err);
                return res.status(500).send(err.message);
            }

            res.send("✅ User saved successfully");
            conn.disconnect();
        });
    });
});

//
// ✅ GET ALL USERS
//
app.get("/getUsers", (req, res) => {
    const conn = hana.createConnection();
    const config = getHanaConfig();

    conn.connect(config, (err) => {
        if (err) {
            console.error("Connection error:", err);
            return res.status(500).send(err.message);
        }

        const query = `SELECT * FROM "SECOPSDEV"."SUPERUSER"`;

        conn.exec(query, (err, result) => {
            if (err) {
                console.error("DB ERROR:", err);
                return res.status(500).send(err.message);
            }

            res.json(result);
            conn.disconnect();
        });
    });
});

//
// ✅ START SERVER
//
app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
});
const express = require("express");
const bodyParser = require("body-parser");
const hana = require("@sap/hana-client");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const port = process.env.PORT || 3000;

// HANA connection (Cloud Foundry will inject via VCAP_SERVICES)
function getConnection() {
    const conn = hana.createConnection();
    const hanaEnv = JSON.parse(process.env.VCAP_SERVICES);
    const service = hanaEnv["hana"][0].credentials;

    conn.connect({
        serverNode: service.host + ":" + service.port,
        uid: service.user,
        pwd: service.password,
        encrypt: true
    });

    return conn;
}

// API to insert user
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
            console.error(err);
            return res.status(500).send("Insert failed");
        }

        res.send("User added successfully");
        conn.disconnect();
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
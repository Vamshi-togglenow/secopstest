require("dotenv").config();

const readline = require("readline");
const hana = require("@sap/hana-client");

function decodeUnicodeEscapes(value) {
    if (typeof value !== "string") {
        return value;
    }
    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
    );
}

function connect() {
    const host = process.env.HANA_HOST;
    const port = process.env.HANA_PORT || "443";
    const user = process.env.HANA_USER;
    const password = decodeUnicodeEscapes(process.env.HANA_PASSWORD);

    if (!host || !user || !password) {
        throw new Error("Missing HANA credentials in .env");
    }

    const conn = hana.createConnection();
    conn.connect({
        serverNode: `${host}:${port}`,
        uid: user,
        pwd: password,
        encrypt: true,
        sslValidateCertificate: false,
        connectTimeout: 30000
    });
    return conn;
}

function runQuery(conn, sql) {
    return new Promise((resolve, reject) => {
        conn.exec(sql, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

async function main() {
    const queryFromArgs = process.argv.slice(2).join(" ").trim();
    let conn;

    try {
        conn = connect();
        console.log("Connected to HANA.");
    } catch (err) {
        console.error("Connection failed:", err.message);
        process.exit(1);
    }

    if (queryFromArgs) {
        try {
            const rows = await runQuery(conn, queryFromArgs);
            console.table(Array.isArray(rows) ? rows : [{ result: rows }]);
        } catch (err) {
            console.error("SQL error:", err.message);
            process.exitCode = 1;
        } finally {
            conn.disconnect();
        }
        return;
    }

    console.log('Type SQL and press Enter. Type "exit" to quit.');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "hana> "
    });

    rl.prompt();
    rl.on("line", async (line) => {
        const sql = line.trim();
        if (!sql) {
            rl.prompt();
            return;
        }
        if (sql.toLowerCase() === "exit" || sql.toLowerCase() === "quit") {
            rl.close();
            return;
        }

        try {
            const rows = await runQuery(conn, sql);
            console.table(Array.isArray(rows) ? rows : [{ result: rows }]);
        } catch (err) {
            console.error("SQL error:", err.message);
        }
        rl.prompt();
    });

    rl.on("close", () => {
        conn.disconnect();
        console.log("Disconnected.");
    });
}

main();

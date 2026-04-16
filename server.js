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
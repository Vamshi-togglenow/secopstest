const express = require("express");
const app = express();

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("🚀 SAP CI/CD Node App Working!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
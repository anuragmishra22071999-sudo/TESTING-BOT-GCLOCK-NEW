const express = require("express");
const bodyParser = require("body-parser");
const fca = require("ws3-fca"); // CommonJS default import

// ---- Config stored in memory ----
let config = {
  cookies: [],
  prefix: "!",
  adminID: ""
};

let activeBots = {};

// ---- Express Setup ----
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---- Web UI ----
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="font-family:sans-serif;max-width:500px;margin:auto;">
        <h2>🤖 Waleed Bot Setup</h2>
        <form method="post" action="/save">
          <label>Paste AppState JSON:</label><br>
          <textarea name="cookies" rows="10" cols="50">${JSON.stringify(config.cookies)}</textarea><br><br>
          <label>Prefix:</label><br>
          <input type="text" name="prefix" value="${config.prefix}" /><br><br>
          <label>Admin ID:</label><br>
          <input type="text" name="adminID" value="${config.adminID}" /><br><br>
          <button type="submit">Save & Start Bot</button>
        </form>
      </body>
    </html>
  `);
});

// ---- Save config and start bot ----
app.post("/save", async (req, res) => {
  try {
    config.cookies = JSON.parse(req.body.cookies);
    config.prefix = req.body.prefix || "!";
    config.adminID = req.body.adminID || "";

    await initializeBot();

    res.send("<h3>✅ Bot started successfully!</h3>");
  } catch (err) {
    console.error("Config save error:", err);
    res.status(500).send("❌ Failed to save config / start bot. Check logs.");
  }
});

// ---- Bot Core ----
async function initializeBot() {
  if (!config.cookies.length) {
    console.log("⚠️ No AppState provided yet.");
    return;
  }

  try {
    const api = await fca({ appState: config.cookies });
    console.log("✅ Bot logged in!");

    activeBots[config.adminID] = api;

    api.listen((err, event) => {
      if (err) return console.error("Listen error:", err);

      const { threadID, senderID, body, type } = event;

      if (!body || type !== "message") return;

      if (!body.startsWith(config.prefix)) return;

      const [cmd, ...args] = body.slice(config.prefix.length).trim().split(" ");

      if (senderID !== config.adminID) {
        return api.sendMessage("❌ Only Admin can use this bot.", threadID);
      }

      switch (cmd.toLowerCase()) {
        case "ping":
          api.sendMessage("🏓 Pong!", threadID);
          break;

        case "tid":
          api.sendMessage(`🔑 Thread ID: ${threadID}`, threadID);
          break;

        case "uid":
          api.sendMessage(`👤 Your UID: ${senderID}`, threadID);
          break;

        case "stop":
          api.sendMessage("🛑 Bot stopped.", threadID);
          api.stopListening();
          break;

        default:
          api.sendMessage("❓ Unknown command.", threadID);
      }
    });
  } catch (err) {
    console.error("Login failed:", err);
  }
}

// ---- Start Express Server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Web UI running on http://localhost:${PORT}`);
});

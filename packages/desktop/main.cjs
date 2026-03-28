const { app, BrowserWindow } = require("electron");
const net = require("net");
const path = require("path");
const http = require("http");

const bundlePath = path.join(__dirname, "bundle.cjs");

let mainWindow;
let PORT;

function getRandomFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function startServer() {
  PORT = await getRandomFreePort();

  process.env.LOGGER_DISABLE = "true";
  process.env.PORT = String(PORT);
  process.env.LOCALSTACK_ENDPOINT = process.env.LOCALSTACK_ENDPOINT || "http://localhost:4566";

  require(bundlePath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "LocalStack Explorer",
    icon: path.join(__dirname, "icon.png"),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Wait for server to be ready, then load
  pollHealth(() => {
    mainWindow.loadURL(`http://localhost:${PORT}`);
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function pollHealth(onReady) {
  let attempts = 0;
  let ready = false;

  function check() {
    if (ready) return;
    attempts++;
    const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
      if (res.statusCode === 200 && !ready) {
        ready = true;
        onReady();
      } else {
        retry();
      }
    });
    req.on("error", () => retry());
    req.setTimeout(2000, () => { req.destroy(); retry(); });
  }

  function retry() {
    if (ready) return;
    if (attempts > 200) {
      console.error("Server did not start in time");
      app.quit();
      return;
    }
    setTimeout(check, 100);
  }

  check();
}

app.whenReady().then(() => startServer().then(createWindow));

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

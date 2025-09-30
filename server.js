
const express = require('express');
const expressWs = require('express-ws');
const pty = require('node-pty');
const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

const app = express();
expressWs(app);

const workspaceDir = path.join(__dirname, 'workspace');

// Terminal WebSocket
app.ws('/terminal', (ws, req) => {
  const shell = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: workspaceDir,
    env: process.env
  });

  shell.on('data', (data) => {
    ws.send(data);
  });

  ws.on('message', (msg) => {
    shell.write(msg);
  });

  ws.on('close', () => {
    shell.kill();
  });
});

// API Endpoints
app.use(express.json());

app.get('/api/files', async (req, res) => {
  try {
    const files = await fs.readdir(workspaceDir);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/:filename', async (req, res) => {
  const filePath = path.join(workspaceDir, req.params.filename);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/:filename', async (req, res) => {
  const filePath = path.join(workspaceDir, req.params.filename);
  try {
    await fs.writeFile(filePath, req.body.content);
    res.json({ message: 'File saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/browser/screenshot', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
    const page = await browser.newPage();
    await page.goto(url);
    const screenshot = await page.screenshot();
    await browser.close();
    res.setHeader('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message });
  }
});

// Serve static files
app.use(express.static('public'));

const port = 8083;
app.listen(port, () => {
  console.log(`Sandbox listening on http://localhost:${port}`);
});

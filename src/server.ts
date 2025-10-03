import express, { Request, Response } from 'express';
import expressWs from 'express-ws';
import pty, { IPty } from 'node-pty';
import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
import WebSocket from 'ws';

const app = express();
const wsInstance = expressWs(app);
const aWss = wsInstance.getWss();

const workspaceDir = path.join(__dirname, '..', 'workspace');

// Terminal WebSocket
wsInstance.app.ws('/terminal', (ws: WebSocket, req: Request) => {
  const shell: IPty = pty.spawn('bash', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });

  shell.write(`cd ${workspaceDir}\r`);
  shell.write('clear\r');

  shell.onData((data: string) => {
    console.log('Sending data to client:', data);
    ws.send(data);
  });

  ws.on('message', (msg: string) => {
    console.log('Received message from client:', msg);
    shell.write(msg);
  });

  ws.on('close', () => {
    shell.kill();
  });
});

app.post('/api/shell/exec', (req: Request, res: Response) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const shell = pty.spawn('bash', ['-c', command], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: workspaceDir,
    env: process.env
  });

  let output = '';
  shell.onData((data: string) => {
    output += data;
  });

  shell.onExit(() => {
    res.json({ output });
  });
});

// API Endpoints
app.use(express.json());

app.get('/api/files', async (req: Request, res: Response) => {
  try {
    const files = await fs.readdir(workspaceDir);
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files/:filename', async (req: Request, res: Response) => {
  const filePath = path.join(workspaceDir, req.params.filename);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/:filename', async (req: Request, res: Response) => {
  const filePath = path.join(workspaceDir, req.params.filename);
  try {
    await fs.writeFile(filePath, req.body.content);
    res.json({ message: 'File saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/browser/screenshot', async (req: Request, res: Response) => {
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
  } catch (error: any) {
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

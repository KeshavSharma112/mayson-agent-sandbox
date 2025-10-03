import axios, { AxiosInstance } from 'axios';

interface SandboxOptions {
  baseURL: string;
}

interface ExecResult {
  output: string;
}

interface ReadResult {
  content: string;
}

export class Sandbox {
  private client: AxiosInstance;

  public shell: {
    exec: (args: { command: string }) => Promise<ExecResult>;
  };

  public file: {
    read: (args: { path: string }) => Promise<ReadResult>;
    write: (args: { path: string; content: string }) => Promise<void>;
  };

  public browser: {
    screenshot: () => Promise<Buffer>;
  };

  constructor(options: SandboxOptions) {
    this.client = axios.create({
      baseURL: options.baseURL,
    });

    this.shell = {
      exec: async ({ command }) => {
        const response = await this.client.post('/api/shell/exec', { command });
        return response.data;
      },
    };

    this.file = {
      read: async ({ path }) => {
        const response = await this.client.get(`/api/files/${path}`);
        return response.data;
      },
      write: async ({ path, content }) => {
        await this.client.post(`/api/files/${path}`, { content });
      },
    };

    this.browser = {
      screenshot: async () => {
        const response = await this.client.post('/api/browser/screenshot', {}, {
          responseType: 'arraybuffer',
        });
        return response.data;
      },
    };
  }
}

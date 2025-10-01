import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoldenLayout } from 'golden-layout';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'golden-layout/dist/css/goldenlayout-base.css';
import 'golden-layout/dist/css/themes/goldenlayout-dark-theme.css';
import './App.css';

// --- Component Definitions ---

const ChatComponent = React.memo(() => (
  <div className="chat-container">
    <div className="chat-header">Mayson Agent</div>
    <div className="chat-messages"></div>
    <div className="chat-input">
      <input type="text" placeholder="Type a message..." />
      <button>Send</button>
    </div>
  </div>
));

const VsCodeComponent = React.memo(() => <iframe src="/code/" className="iframe-pane" title="VS Code" />);
const BrowserComponent = React.memo(() => <iframe src="/vnc/vnc.html?path=vnc/websockify&autoconnect=true" className="iframe-pane" title="Browser" />);

const TerminalComponent = React.memo(({ glContainer }) => {
  const terminalRef = useRef(null);
  useEffect(() => {
    if (terminalRef.current && !terminalRef.current.terminal) {
      const term = new Terminal({ convertEol: true, theme: { background: '#1e1e1e' } });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      terminalRef.current.terminal = term;

      const ws = new WebSocket(`ws://${location.host}/terminal`);
      term.onData(data => ws.send(data));
      ws.onmessage = event => term.write(event.data);

      const handleResize = () => {
        // Use a small timeout to ensure the container has the correct dimensions
        setTimeout(() => fitAddon.fit(), 10);
      };

      if (glContainer) {
        glContainer.layoutManager.on('tab', (tab) => {
          if (tab.contentItem === glContainer) {
            handleResize();
          }
        });
        glContainer.on('resize', handleResize);
      }

      return () => {
        if (glContainer) {
          glContainer.off('resize', handleResize);
        }
        ws.close();
        term.dispose();
      };
    }
  }, [glContainer]);
  return <div ref={terminalRef} className="terminal-pane" />;
});

// --- Golden Layout React Wrapper ---

function reactComponent(container, Component) {
  const root = createRoot(container.element);
  root.render(<Component glContainer={container} />);
  container.on('destroy', () => root.unmount());
}

// --- Golden Layout App ---

function App() {
  const layoutRef = useRef(null);

  useEffect(() => {
    if (layoutRef.current) {
      const layout = new GoldenLayout(layoutRef.current);

      layout.registerComponentFactoryFunction('chat', (container) => reactComponent(container, ChatComponent));
      layout.registerComponentFactoryFunction('vscode', (container) => reactComponent(container, VsCodeComponent));
      layout.registerComponentFactoryFunction('terminal', (container) => reactComponent(container, TerminalComponent));
      layout.registerComponentFactoryFunction('browser', (container) => reactComponent(container, BrowserComponent));

      const layoutConfig = {
        settings: {
          showPopoutIcon: false,
          showMaximiseIcon: false,
          showCloseIcon: false,
        },
        dimensions: {
          headerHeight: 35,
        },
        root: {
          type: 'row',
          content: [
            {
              type: 'component',
              componentType: 'chat',
              isClosable: false,
              header: { show: false },
              width: 30,
            },
            {
              type: 'stack',
              isClosable: false,
              content: [
                {
                  type: 'component',
                  componentType: 'vscode',
                  title: 'VS Code',
                  isClosable: false,
                },
                {
                  type: 'component',
                  componentType: 'terminal',
                  title: 'Terminal',
                  isClosable: false,
                },
                {
                  type: 'component',
                  componentType: 'browser',
                  title: 'Browser',
                  isClosable: false,
                },
              ],
            },
          ],
        },
      };

      layout.loadLayout(layoutConfig);
    }
  }, []);

  return (
    <div className="app-container">
      <div ref={layoutRef} className="golden-layout-container" />
    </div>
  );
}

export default App;

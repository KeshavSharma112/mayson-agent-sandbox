import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('vscode');
  const terminalRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !terminalRef.current.terminal) {
      const term = new Terminal({ convertEol: true });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      terminalRef.current.terminal = term; // Attach terminal instance to the ref

      const ws = new WebSocket(`ws://${location.host}/terminal`);
      term.onData(data => ws.send(data));
      ws.onmessage = event => term.write(event.data);

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(terminalRef.current);

      // Cleanup on component unmount or tab change
      const termContainer = terminalRef.current;
      return () => {
        resizeObserver.disconnect();
        ws.close();
        term.dispose();
        if (termContainer) {
          termContainer.terminal = null;
        }
      };
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'vscode':
        return <iframe src="/code/" className="iframe-pane" title="VS Code" />;
      case 'terminal':
        return <div id="terminal-container" ref={terminalRef} className="terminal-pane" />;
      case 'browser':
        return <iframe src="/vnc/vnc.html?path=vnc/websockify" className="iframe-pane" title="Browser" />;
      default:
        return null;
    }
  };

  return (
    <div className="sandbox-container">
      <div className="chat-container">
        <h2>Chat</h2>
        <div className="chat-messages"></div>
        <div className="chat-input">
          <input type="text" placeholder="Type a message..." />
          <button>Send</button>
        </div>
      </div>
      <div className="main-container">
        <div className="tab-bar">
          <button className={`tab-button ${activeTab === 'vscode' ? 'active' : ''}`} onClick={() => setActiveTab('vscode')}>VS Code</button>
          <button className={`tab-button ${activeTab === 'terminal' ? 'active' : ''}`} onClick={() => setActiveTab('terminal')}>Terminal</button>
          <button className={`tab-button ${activeTab === 'browser' ? 'active' : ''}`} onClick={() => setActiveTab('browser')}>Browser</button>
        </div>
        <div className="tab-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default App;

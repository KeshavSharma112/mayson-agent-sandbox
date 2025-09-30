document.addEventListener('DOMContentLoaded', () => {
  // Tab switching logic
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const tab = button.getAttribute('data-tab');
      tabPanes.forEach(pane => {
        if (pane.id === tab) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });

  // Terminal setup
  const term = new Terminal({ convertEol: true });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal-container'));
  fitAddon.fit();

  const ws = new WebSocket(`ws://${location.host}/terminal`);
  term.onData(data => ws.send(data));
  ws.onmessage = event => term.write(event.data);

  // Make terminal responsive
  window.addEventListener('resize', () => fitAddon.fit());
});
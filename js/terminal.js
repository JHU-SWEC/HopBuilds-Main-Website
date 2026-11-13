/* Options a page can pass; the live homepage passes none.
   - extraProjects: [name, status] pairs listed after the three below.
   - extraCommands: { "name": { help, run, aliases } }. `run` returns the
     lines to print; `help` is its line in the help menu. */
export default function initTerminal({ extraProjects = [], extraCommands = {} } = {}) {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const term = document.querySelector(".hero-terminal");
  const linesEl = document.getElementById("term-lines");
  const input = document.getElementById("term-input");
  if (!term || !linesEl || !input) return;

  /* The page may name the brand (data-brand on .hero-terminal); the live
     homepage sets none and keeps "hopbuilds". */
  const BRAND = (term.dataset.brand || "hopbuilds").toLowerCase();

  const FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSe6RoRiIBXVkAm7XooWUKJWF9l-64u8DhUHADUEuasgLsnZww/viewform?usp=dialog";
  const MAX_LINES = 10;
  let userActive = false;

  const trim = () => {
    while (linesEl.children.length > MAX_LINES) linesEl.removeChild(linesEl.firstChild);
  };

  const printOut = (text) => {
    const div = document.createElement("div");
    div.className = "term-line term-out";
    div.textContent = text;
    linesEl.appendChild(div);
    trim();
  };

  const printCmd = (cmd) => {
    const div = document.createElement("div");
    div.className = "term-line";
    const p = document.createElement("span");
    p.className = "term-prompt";
    p.textContent = `${BRAND}@jhu % `;
    const c = document.createElement("span");
    c.textContent = cmd;
    div.append(p, c);
    linesEl.appendChild(div);
    trim();
  };

  const COMMANDS = {
    help: () => [
      "help       : this menu",
      "projects   : what we're shipping",
      `join       : apply to ${BRAND}`,
      ...Object.entries(extraCommands).map(([name, c]) => `${name.padEnd(11)}: ${c.help}`),
      "whoami     : ?",
      "clear      : clean slate",
    ],
    projects: () => [
      "lost@jhu       · live · lostatjhu.org",
      "jhu-rideshare  · in progress",
      "club-board     · in progress",
      ...extraProjects.map(([name, status]) => `${name.padEnd(15)}· ${status}`),
    ],
    join: () => {
      window.open(FORM_URL, "_blank", "noopener");
      return ["opening the application form…"];
    },
    whoami: () => [`future ${BRAND} member`],
    madooei: () => ["professor madooei: mentor, guide, legend."],
    clear: () => {
      linesEl.innerHTML = "";
      return [];
    },
  };

  Object.entries(extraCommands).forEach(([name, c]) => {
    [name, ...(c.aliases || [])].forEach((key) => {
      COMMANDS[key] = c.run;
    });
  });

  const run = (raw) => {
    const cmd = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!cmd) return;
    printCmd(raw.trim());
    if (COMMANDS[cmd]) {
      COMMANDS[cmd]().forEach(printOut);
    } else if (cmd.startsWith("sudo")) {
      printOut("[sudo] password for jay:");
      printOut("just kidding, you're in.");
    } else {
      printOut(`command not found: ${cmd}, try 'help'`);
    }
  };

  input.addEventListener("keydown", (e) => {
    userActive = true;
    if (e.key === "Enter") {
      run(input.value);
      input.value = "";
    }
  });
  input.addEventListener("focus", () => {
    userActive = true;
  });
  term.addEventListener("click", () => input.focus());

  printOut(`welcome to ${BRAND}.sh, built at 3410 N Charles St.`);

  /* auto-type 'help' once as a demo, unless the visitor beats us to it */
  if (reduceMotion) {
    COMMANDS.help().forEach(printOut);
    return;
  }
  const demo = "help";
  let i = 0;
  const typeNext = () => {
    if (userActive) return;
    if (i < demo.length) {
      input.value += demo[i++];
      setTimeout(typeNext, 140 + Math.random() * 120);
    } else {
      setTimeout(() => {
        if (userActive) return;
        run(input.value);
        input.value = "";
      }, 420);
    }
  };
  setTimeout(typeNext, 1600);
}

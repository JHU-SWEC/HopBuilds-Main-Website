export default function initTerminal() {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const term = document.querySelector(".hero-terminal");
  const linesEl = document.getElementById("term-lines");
  const input = document.getElementById("term-input");
  if (!term || !linesEl || !input) return;

  const FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLScCDca0vhUvHgQoS_NWhagKkoFUA1jHvasKyQlkR4wZK1cF2w/viewform?usp=dialog";
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
    p.textContent = "hopbuilds@jhu % ";
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
      "join       : apply to hopbuilds",
      "whoami     : ?",
      "clear      : clean slate",
    ],
    projects: () => [
      "lost@jhu       · live · lostatjhu.org",
      "hopparlays     · in progress",
      "jhu-rideshare  · in progress",
      "club-board     · in progress",
    ],
    join: () => {
      window.open(FORM_URL, "_blank", "noopener");
      return ["opening the application form…"];
    },
    whoami: () => ["future hopbuilds member"],
    madooei: () => ["professor madooei: mentor, course-credit-granter, legend."],
    clear: () => {
      linesEl.innerHTML = "";
      return [];
    },
  };

  const run = (raw) => {
    const cmd = raw.trim().toLowerCase();
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

  printOut("welcome to hopbuilds.sh, built at 3410 N Charles St.");

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

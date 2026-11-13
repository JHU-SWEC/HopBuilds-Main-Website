/**
 * Phone menu: a full-screen sheet behind the floating pill. The button says
 * its state (aria-expanded); Escape and any link inside close it, and focus
 * returns to the button.
 */
export default function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const sheet = document.getElementById("nav-sheet");
  if (!toggle || !sheet) return;
  const label = toggle.querySelector(".visually-hidden");

  const setOpen = (open, { restoreFocus = false } = {}) => {
    toggle.setAttribute("aria-expanded", String(open));
    sheet.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    if (label) label.textContent = open ? "Close menu" : "Menu";
    if (open) sheet.querySelector("a")?.focus();
    else if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  sheet.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) setOpen(false, { restoreFocus: true });
  });
  /* A sheet left open while the window widens past the phone layout would
     cover the page with no visible way to close it. */
  matchMedia("(min-width: 960px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
}

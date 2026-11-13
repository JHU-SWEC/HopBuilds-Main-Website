/**
 * The roster behind team.html. Edit this file to change who appears on the
 * page; the markup is built from it with createElement/textContent.
 *
 * Each member is { name, role, team?, links? }. An entry with
 * `placeholder: true` renders as an empty dashed slot ("To be added").
 *
 *   name   - shown as written
 *   role   - e.g. "Team lead", "Developer", "Designer", "Strategist"
 *   team   - optional; must match a `name` in TEAMS
 *   links  - optional [{ label: "LinkedIn", href: "https://…" }]
 */

export const MENTORS = [
  {
    name: "Professor Madooei",
    role: "Faculty mentor",
    note: "Teaches software engineering at Johns Hopkins and guides every team through the whole build.",
  },
];

/* Colours are the page's own fills: yellow, pink, mint, orange, lilac, blue. */
export const TEAMS = [
  { name: "Lost@JHU", status: "Live", color: "mint" },
  { name: "JHU Rideshare", status: "In progress", color: "yellow" },
  { name: "JHU Club Board", status: "In progress", color: "lilac" },
  { name: "Barkoff", status: "In progress", color: "pink" },
  { name: "Slopkins", status: "In progress", color: "orange" },
];

/* Teams and roles are not assigned yet. Add `team` (a name from TEAMS) and
   change `role` per person; the team filter appears as soon as anyone has a
   team, and only lists teams that have people. */
const member = (name) => ({ name, role: "Member" });

export const MEMBERS = [
  member("Daniel"),
  member("Jennifer"),
  member("Justin"),
  member("Miles"),
  member("Minh"),
  member("Shawn"),
  member("Jonny"),
  member("Leo"),
  member("Arnav"),
  member("Kyle"),
  member("Amy"),
  member("Annchi"),
  member("Sophia"),
  member("Aiden"),
  member("Lucas"),
];

/* Captions (alt text) for the "Off the clock" gallery, by file name. The
   gallery shows team-rainier.jpg plus EVERY .jpg in assets/web/team-life/,
   so a new photo dropped in that folder joins the loop automatically; give
   it a line here to describe it (without one it is "A SWEC team photo"). */
export const PHOTO_CAPTIONS = {
  "team-rainier.jpg": "Six SWEC members arm in arm on a mountain ridge above the clouds at Mount Rainier",
  "dsc02312.jpg": "A team member relaxing on a couch in the lounge",
  "dsc02320.jpg": "Team members talking around a table in the lounge",
  "img_2731.jpg": "The team together outdoors at night",
  "img_2784.jpg": "Team members working together in a campus classroom",
  "img_4140.jpg": "Friends chatting at a team gathering",
  "img_4143.jpg": "A team member enjoying a meal with friends",
  "img_8997.jpg": "Team members hanging out in an apartment",
  "swec_celly.jpg": "Friends gathered around the table for a celebration",
};

# The Family of Sheikh Mubarak Ali — Interactive Family Tree

A single, self-contained website that shows the whole family as a zoomable,
scrollable tree. Tap any name to open that person's profile (photo, dates,
profession, biography). It works on phones (pinch to zoom), tablets, and
computers, and it is **completely free to host**.

```
family-tree/
├── index.html        ← the app (open this in a browser)
├── family-data.js    ← ALL the family information — this is the file you edit
├── photos/           ← put photos here (optional)
└── README.md         ← this guide
```

---

## 1. How to view it

**Quickest:** double-click `index.html` — it opens in any browser, no internet
needed.

**To share it with the family (free, recommended): GitHub Pages.** See §4.

---

## 2. What it can do

- **Pan** — drag with a mouse or finger to move around.
- **Zoom** — mouse wheel, the `＋ / －` buttons, or **pinch** with two fingers.
- **Collapse / expand branches** — the little `+N` / `–` button under each card
  (N = how many descendants are hidden). "Expand all" is top-right.
- **Tap a name → profile** — spouse, parents, children (all clickable), plus
  space for a photo, birth/death dates, profession, and a biography.
- **Search** — type any name in the top bar to jump straight to that person.
- **Cross-family marriages** — where two branches married into each other, a
  🔗 link lets you hop across the tree (and back).
- **Share a person** — the "Copy link to this person" button copies a link that
  opens the site *directly on that profile*.
- **Introduction first** — the site opens on a family introduction, then leads
  into the tree. Re-open it any time with the ℹ️ button.
- **"To be added" placeholders** — missing names/details show as faint dashed
  cards so it's obvious what still needs filling in.

---

## 3. How to add or change information

Everything lives in **`family-data.js`**. You do **not** need to touch
`index.html`. Open `family-data.js` in any text editor (or right in GitHub — see
§4) and follow the pattern. Each person looks like this:

```js
{
  name: "Rizwan ul Haque",
  sex: "m",                         // "m", "f", or "" if unknown
  dob: "1975",                      // born  (optional)
  dod: "",                          // died  (optional — leave "" if living)
  profession: "Engineer",           // (optional)
  photo: "photos/rizwan.jpg",       // (optional — see below)
  bio: "Grew up in Lahore; moved to Karachi in 1998…",  // (optional)
  spouses: [ { name: "Romana" } ],
  children: [
    { name: "Hira", sex: "f" },
    { name: "Maryam", sex: "f" }
  ]
}
```

**To fill in a detail** (say, a birth year): find the person by name and add the
field. **To add a person:** copy an existing block, change the details, and drop
it into the correct `children: [ ... ]` list. **Only `name` is required** —
delete any field you don't need.

> Tip: every profile panel shows that person's `id` and a reminder of which file
> to edit, so you always know exactly which entry to update.

### Adding a photo
1. Put the image file in the `photos/` folder (e.g. `photos/altaf.jpg`).
2. On that person add: `photo: "photos/altaf.jpg",`
3. Save. If a photo is missing it simply falls back to the person's initials.

### About the placeholder names (X, xx, AA, BBB …)
These are the "name not known yet" markers from the original notes. The site
shows them faintly as "Name to be added." Replace the placeholder with the real
name whenever you learn it.

---

## 4. Publish it for free (GitHub Pages)

This gives you a real web address (e.g.
`https://faaizhaque.github.io/enigma-game/family-tree/`) that anyone can open —
no cost, no server, no app to install. Updates go live a minute after you save.

1. Make sure the `family-tree/` folder is on your repository's **main** branch
   (this work is currently on the branch `claude/family-tree-builder-97i22l` —
   merge it into `main`, or ask and it can be merged for you).
2. On GitHub, open the repo → **Settings** → **Pages**.
3. Under *Build and deployment*, set **Source: Deploy from a branch**, choose
   **Branch: `main`**, folder **`/ (root)`**, and click **Save**.
4. Wait ~1 minute, then visit
   `https://<your-username>.github.io/<repo>/family-tree/`.
5. **To make changes later:** edit `family-tree/family-data.js` directly on
   GitHub (click the file → the ✏️ pencil → make edits → *Commit changes*). The
   live site updates automatically.

> Prefer a cleaner address like `family.yourname.com`? The same files also work
> on Netlify or Cloudflare Pages (both free) by dragging the `family-tree`
> folder in, and both support a custom domain.

---

## 5. Notes on how the family was recorded

- The family is organised into the **seven branches** of Sheikh Mubarak Ali's
  children (4 sons, 3 daughters).
- **Marriages within the family** are kept as a single record to avoid
  duplicates: the children are listed under one parent, and the other parent's
  profile shows a 🔗 link to them. Examples encoded this way: Ramzan & his
  brother Sadiq's widow Sharifan; Suriya's children Shazia and Farrah who married
  into Branch 3; Imdad ul Haque (Branch 3) & Naseem (Branch 5); Suhail (Branch 3)
  & Aliya (Branch 6); Adil (Branch 3) & Amna (Branch 7); and the cousins Babar &
  Irum (both Branch 7).
- A few details in the original notes were **ambiguous** and are flagged inside
  the data with a short note (for example, "Zara married Nabeel" in Branch 4, and
  whether Suriya's husband *Ahsan ul Haque* is the same Ahsan in Branch 6 — left
  separate unless confirmed). Search the file for the word **"confirm"** to find
  them.
- Many people are marked **"details to be added"** — these are exactly the spots
  the original notes said would be provided later.

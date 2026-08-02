# LOOM Studio

Edit the LOOM website by clicking it. No terminal, no code, no waiting on anyone.

Studio only exists on your own machine while the site is running locally. It is
never part of the live website — visitors cannot see it and it isn't in the
published build.

---

## Starting it

Open Terminal, then:

```
cd "~/Desktop/LOOM PROJECT"
export PATH="$HOME/.local/node/bin:$PATH"
npm run studio
```

Leave that window open and go to **http://localhost:4930**.

You'll see a small **Studio** button in the bottom-left corner. Click it — or
just press **E** — to switch Studio on. Press **E** again (or **Esc**) to switch
it off and get the normal site back.

> If the terminal says *"Port 4931 is busy"*, Studio is already running in
> another window. Use that one.
>
> Don't run `npm run preview` at the same time — it wants the same port.

---

## The three modes

Pick one from the little bar above the Studio button.

### 1 · Text — change the words

The main one.

1. Move the mouse over any words on the page. A soft outline appears around
   whatever you can edit.
2. Click. The words become a text box, already selected.
3. Type the new version.
4. Press **Enter** to save. Press **Esc** to change your mind.

The page updates in front of you, and the change is written into the real
website — it's permanent, not a preview. A small message in the corner tells you
which file it went into.

**Things it will refuse to do, on purpose:**

- *"Nothing editable there"* — you clicked something that mixes words with other
  bits (a line with a coloured comma inside it, a button with an icon). Try
  clicking a plain line of text instead, or use **Ask** for that one.
- *"That exact text appears in more than one place"* — the same sentence is
  written twice in the site, and Studio will not guess which one you meant. Use
  **Ask** and describe which one.
- *"Could not find that text"* — the page you're looking at is out of date.
  Reload and try again.
- Quotes and angle brackets are blocked in some places because they'd break the
  site. Use a curly apostrophe — **’** — instead of a straight one.

### 2 · Note — leave yourself a comment

Click anywhere on the page to drop a numbered pin and type a note. Pins stay
where you put them, survive reloads, and can be reopened, edited, resolved or
deleted. Open **Notes** in the top bar to see them all in a list, jump to any of
them, or tick them off.

Notes change nothing on the site. They're just for you (or for whoever builds
the change later).

### 3 · Ask — have Claude do it

For anything bigger than retyping a sentence.

1. Click the part of the page you're talking about (optional — it just gives
   Claude a head start).
2. Type what you want in plain English: *"make this section darker"*,
   *"rewrite this in Arabic"*, *"swap these two cards around"*.
3. Press **Run** (or **⌘↵**).

You'll watch it work, step by step, in the panel. When it's finished it lists
the files it changed. **Stop** cancels it at any point; it gives up on its own
after ten minutes.

Ask writes real changes to the site, same as Text does. Reload the page to be
sure you're seeing the result.

---

## Keys

| Key | What it does |
|---|---|
| **E** | Studio on / off |
| **Enter** | Save the words you're editing |
| **Esc** | Cancel the edit → close the panel → close Studio |
| **⌘↵** | Run an Ask (or save a note) |

---

## Undoing

Press **Undo** in the Studio bar. It puts the last text edit back exactly as it
was. Press it again to go back another step, and again, as far back as you like
— every edit Studio has ever made is kept.

Undo covers **Text** edits. It does not cover **Ask** — for that, tell Claude
*"undo what you just did"* in a new Ask, or use git.

---

## If something looks wrong

- **The dot next to the modes is red** — the Studio server isn't running. Go
  back to the terminal and run `npm run studio` again.
- **Nothing highlights when you hover** — make sure Studio is actually on (the
  Studio button glows) and you're in **Text** mode.
- **The page went blank** — reload it. Nothing is lost; every edit is already
  saved to disk.
- **You want everything back** — the last few hundred edits are stored in
  `studio/.history/`, and the site is in git, so nothing is ever truly gone.

---

## For a developer, briefly

- `studio/server.mjs` — local HTTP server on `127.0.0.1:4931`, node builtins
  only. Confines every write to `src/`, refuses any `oldText` that isn't
  unique, writes atomically, and snapshots each file before touching it into
  `studio/.history/`.
- `studio/run.mjs` — runs Vite and the Studio server together (`npm run studio`);
  reuses an already-running dev server instead of starting a second one.
- `src/studio/` — the overlay. Mounted from `src/main.jsx` behind
  `import.meta.env.DEV` via a dynamic import, so it is absent from
  `npm run build` output entirely (verified).
- Source mapping reads React 18's `_debugSource` off the fiber, which names the
  JSX call site. Because most LOOM copy lives in `src/data/site.js` and headings
  render through `SplitWords`, that file is only a hint — the server falls back
  to an exact, uniqueness-checked search across `src/**`, and matches across
  wrapped JSX lines by whitespace-flexible search.

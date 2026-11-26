/* Vision & Sounds — Prompt Builder app */
(function () {
  "use strict";

  const PB = window.PB;
  const { t, arr } = PB.helpers;
  const DOMAINS = PB.domains;
  const byId = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));
  const LS_STATE = "vs.pb.state.v1";
  const LS_SAVED = "vs.pb.saved.v1";

  /* ---------------- storage (never required) ---------------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
        /* storage unavailable — fine */
      }
    },
  };

  /* ---------------- state ---------------- */
  const saved = store.get(LS_STATE, null);
  const state = Object.assign(
    { domain: "image", targets: {}, values: {}, opts: { format: "auto", enhancers: [], language: "UK English" } },
    saved || {}
  );
  if (!byId[state.domain]) state.domain = "image";

  const persist = () => store.set(LS_STATE, state);

  const domain = () => byId[state.domain];
  const target = (d = domain()) => d.targets.find((x) => x.id === state.targets[d.id]) || d.targets[0];
  function values(d = domain()) {
    if (!state.values[d.id]) {
      state.values[d.id] = {};
      d.fields.forEach((f) => {
        if (f.default !== undefined) state.values[d.id][f.id] = f.default;
      });
    }
    return state.values[d.id];
  }
  const visible = (f, d = domain()) => !f.show || f.show(values(d), target(d));
  const filled = (v) => (Array.isArray(v) ? v.length > 0 : t(v) !== "");

  /* ---------------- DOM helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
        else if (k === "dataset") Object.assign(n.dataset, v);
        else n.setAttribute(k, v === true ? "" : v);
      }
    }
    kids.flat().forEach((c) => c != null && c !== false && n.append(c.nodeType ? c : document.createTextNode(c)));
    return n;
  }

  const ui = {
    rail: $("[data-rail]"),
    search: $("[data-search]"),
    head: $("[data-head]"),
    targets: $("[data-targets]"),
    form: $("[data-form]"),
    globals: $("[data-globals]"),
    output: $("[data-output]"),
    meter: $("[data-meter]"),
    meterLabel: $("[data-meter-label]"),
    stats: $("[data-stats]"),
    toast: $("[data-toast]"),
    library: $("[data-library]"),
    libraryList: $("[data-library-list]"),
  };

  let toastTimer;
  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 1800);
  }

  async function copy(text, msg = "Copied to clipboard") {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = el("textarea", { style: "position:fixed;opacity:0" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (_) { /* ignore */ }
      ta.remove();
    }
    toast(msg);
  }

  /* ---------------- rail ---------------- */
  function renderRail() {
    const q = t(ui.search.value).toLowerCase();
    ui.rail.replaceChildren();
    PB.groups.forEach((g) => {
      const items = DOMAINS.filter((d) => d.group === g && (!q || (d.name + " " + d.tagline).toLowerCase().includes(q)));
      if (!items.length) return;
      ui.rail.append(
        el("div", { class: "rail-group" },
          el("p", { class: "rail-label", text: g }),
          items.map((d) =>
            el("button", {
              type: "button",
              class: "rail-item",
              "aria-current": d.id === state.domain ? "page" : null,
              onclick: () => selectDomain(d.id),
            },
              el("span", { class: "glyph", "aria-hidden": "true", text: d.glyph }),
              el("span", { class: "rail-name", text: d.name })
            )
          )
        )
      );
    });
    if (!ui.rail.children.length) ui.rail.append(el("p", { class: "rail-empty", text: "No match. Try “Anything else”." }));
  }

  function selectDomain(id) {
    state.domain = id;
    persist();
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    renderRail();
    renderBuilder();
    const cur = ui.rail.querySelector('[aria-current="page"]');
    if (cur && window.innerWidth < 960) cur.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }

  /* ---------------- builder ---------------- */
  function renderBuilder() {
    const d = domain();
    const v = values(d);

    ui.head.replaceChildren(
      el("p", { class: "eyebrow", text: d.group }),
      el("h1", { id: "domain-title", text: d.name }),
      el("p", { class: "lede", text: d.tagline })
    );

    ui.targets.replaceChildren(
      el("p", { class: "field-label", id: "target-label", text: "Target model / tool" }),
      el("div", { class: "segmented", role: "radiogroup", "aria-labelledby": "target-label" },
        d.targets.map((tg) =>
          el("button", {
            type: "button",
            role: "radio",
            class: "seg",
            "aria-checked": String(tg.id === target(d).id),
            onclick: () => {
              state.targets[d.id] = tg.id;
              persist();
              ui.targets.querySelectorAll(".seg").forEach((b) => b.setAttribute("aria-checked", String(b.textContent === tg.name)));
              refresh();
            },
          }, tg.name)
        )
      )
    );

    ui.form.replaceChildren();
    let section = null;
    let wrap = ui.form;
    d.fields.forEach((f) => {
      if (f.section && f.section !== section) {
        section = f.section;
        wrap = el("fieldset", { class: "form-section" }, el("legend", { text: f.section }));
        ui.form.append(wrap);
      }
      wrap.append(renderField(d, f, v));
    });

    renderGlobals();
    refresh();
  }

  function renderField(d, f, v) {
    const id = `f-${d.id}-${f.id}`;
    const set = (val) => {
      v[f.id] = val;
      persist();
      refresh();
    };
    const labelKids = [f.label, f.required ? el("span", { class: "req", "aria-label": "required", text: " *" }) : null];
    let control;
    let ideaBtn = null;

    if (f.examples && (f.type === "text" || f.type === "textarea")) {
      ideaBtn = el("button", {
        type: "button",
        class: "idea",
        title: "Fill with an example idea",
        onclick: () => {
          const pool = f.examples.filter((x) => x !== v[f.id]);
          const pick = pool[Math.floor(Math.random() * pool.length)];
          const input = document.getElementById(id);
          input.value = pick;
          autosize(input);
          set(pick);
        },
      }, "↻ Idea");
    }

    if (f.type === "text") {
      control = el("input", { id, type: "text", placeholder: f.placeholder || "", autocomplete: "off", oninput: (e) => set(e.target.value) });
      control.value = v[f.id] || "";
    } else if (f.type === "textarea") {
      control = el("textarea", { id, rows: "3", placeholder: f.placeholder || "", oninput: (e) => { autosize(e.target); set(e.target.value); } });
      control.value = v[f.id] || "";
      requestAnimationFrame(() => autosize(control));
    } else if (f.type === "range") {
      const out = el("output", { for: id, class: "range-val", text: String(v[f.id] ?? f.default ?? f.min) });
      const input = el("input", {
        id, type: "range", min: f.min, max: f.max, step: f.step || 1,
        oninput: (e) => { out.textContent = e.target.value; set(Number(e.target.value)); },
      });
      input.value = v[f.id] ?? f.default ?? f.min;
      control = el("div", { class: "range" }, input, out);
    } else {
      control = renderChips(d, f, v, id, set);
    }

    const isGroup = f.type === "chips" || f.type === "select";
    const label = isGroup
      ? el("p", { class: "field-label", id: id + "-label" }, labelKids)
      : el("label", { class: "field-label", for: id }, labelKids);

    return el("div", { class: `field field-${f.type}`, dataset: { field: f.id } },
      el("div", { class: "field-top" }, label, ideaBtn),
      control
    );
  }

  function renderChips(d, f, v, id, set) {
    const multi = !!f.multi;
    const current = () => (multi ? arr(v[f.id]) : t(v[f.id]));
    const box = el("div", { class: "chips", role: multi ? "group" : "radiogroup", "aria-labelledby": id + "-label", id });

    const draw = () => {
      const cur = current();
      const opts = [...f.options];
      if (multi) cur.forEach((c) => !opts.includes(c) && opts.push(c));
      else if (cur && !opts.includes(cur)) opts.push(cur);
      box.replaceChildren(
        ...opts.map((o) => {
          const on = multi ? cur.includes(o) : cur === o;
          return el("button", {
            type: "button",
            class: "chip",
            role: multi ? null : "radio",
            "aria-pressed": multi ? String(on) : null,
            "aria-checked": multi ? null : String(on),
            onclick: () => {
              if (multi) {
                const next = on ? cur.filter((x) => x !== o) : [...cur, o];
                set(next);
              } else {
                set(on ? "" : o);
              }
              draw();
            },
          }, o);
        }),
        el("input", {
          class: "chip-add",
          type: "text",
          placeholder: "+ Custom",
          "aria-label": `Add custom ${f.label.toLowerCase()}`,
          onkeydown: (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const val = t(e.target.value);
            if (!val) return;
            if (multi) set([...current().filter((x) => x !== val), val]);
            else set(val);
            draw();
            box.querySelector(".chip-add").focus();
          },
        })
      );
    };
    draw();
    return box;
  }

  function autosize(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight + 2, 420) + "px";
  }

  function renderGlobals() {
    const o = state.opts;
    const enh = Object.entries(PB.ENHANCERS);
    ui.globals.replaceChildren(
      el("legend", { text: "Prompt engineering" }),
      el("div", { class: "field" },
        el("p", { class: "field-label", id: "g-enh", text: "Enhancers" }),
        el("div", { class: "chips", role: "group", "aria-labelledby": "g-enh" },
          enh.map(([k, e]) =>
            el("button", {
              type: "button",
              class: "chip",
              "aria-pressed": String(o.enhancers.includes(k)),
              onclick: (ev) => {
                o.enhancers = o.enhancers.includes(k) ? o.enhancers.filter((x) => x !== k) : [...o.enhancers, k];
                ev.currentTarget.setAttribute("aria-pressed", String(o.enhancers.includes(k)));
                persist();
                refresh();
              },
            }, e.label)
          )
        )
      ),
      el("div", { class: "field-row" },
        el("div", { class: "field" },
          el("label", { class: "field-label", for: "g-format", text: "Structure" }),
          (() => {
            const s = el("select", { id: "g-format", onchange: (e) => { o.format = e.target.value; persist(); refresh(); } },
              [["auto", "Auto (best for target)"], ["markdown", "Markdown headings"], ["xml", "XML tags"], ["plain", "Plain text"]].map(([val, lab]) => el("option", { value: val, text: lab }))
            );
            s.value = o.format;
            return s;
          })()
        ),
        el("div", { class: "field" },
          el("label", { class: "field-label", for: "g-lang", text: "Language" }),
          (() => {
            const i = el("input", { id: "g-lang", type: "text", list: "g-lang-list", oninput: (e) => { o.language = e.target.value; persist(); refresh(); } });
            i.value = o.language;
            return i;
          })(),
          el("datalist", { id: "g-lang-list" }, ["UK English", "US English", "French", "Spanish", "German", "Portuguese", "Yoruba", "Scottish Gaelic", "Arabic"].map((x) => el("option", { value: x })))
        )
      )
    );
  }

  /* ---------------- compose & output ---------------- */
  let lastResult = null;

  function compose() {
    const d = domain();
    const tg = target(d);
    const v = {};
    const raw = values(d);
    d.fields.forEach((f) => {
      if (visible(f, d)) v[f.id] = raw[f.id];
    });
    try {
      return d.compose(v, { target: tg, opts: state.opts, domain: d });
    } catch (err) {
      console.error(err);
      return { prompt: "Something went wrong building this prompt. Try changing a field.", notes: [String(err)] };
    }
  }

  function strength() {
    const d = domain();
    const v = values(d);
    const vis = d.fields.filter((f) => visible(f, d) && f.type !== "range");
    const req = vis.filter((f) => f.required);
    const reqOk = req.filter((f) => filled(v[f.id])).length;
    const extra = vis.filter((f) => !f.required && filled(v[f.id])).reduce((s, f) => s + (f.weight || 1), 0);
    const score = Math.round((req.length ? (reqOk / req.length) * 55 : 55) + Math.min(extra / 6, 1) * 45);
    const missing = req.filter((f) => !filled(v[f.id])).map((f) => f.label);
    return { score, missing };
  }

  function refresh() {
    const d = domain();
    // conditional fields
    ui.form.querySelectorAll("[data-field]").forEach((node) => {
      const f = d.fields.find((x) => x.id === node.dataset.field);
      node.hidden = !visible(f, d);
    });
    ui.form.querySelectorAll(".form-section").forEach((fs) => {
      fs.hidden = ![...fs.querySelectorAll("[data-field]")].some((n) => !n.hidden);
    });
    const kind = target(d).kind;
    ui.globals.hidden = !(kind === "llm" || kind === "agent" || kind === "blender") || (d.id === "mcp" && /config/i.test(values(d).mode || ""));

    const r = (lastResult = compose());
    const blocks = [];
    blocks.push(block(r.promptLabel || "Prompt", r.prompt, true));
    if (t(r.negative)) blocks.push(block("Negative prompt", r.negative));
    (r.extra || []).forEach((x) => blocks.push(block(x.label, x.text)));
    if (r.notes && r.notes.length) {
      blocks.push(el("ul", { class: "notes" }, r.notes.map((n) => el("li", { text: n }))));
    }
    ui.output.replaceChildren(...blocks);

    const s = strength();
    ui.meter.style.setProperty("--score", s.score);
    ui.meter.setAttribute("aria-valuenow", String(s.score));
    const label = s.score >= 90 ? "Pro" : s.score >= 70 ? "Strong" : s.score >= 45 ? "Good" : "Draft";
    ui.meterLabel.textContent = s.missing.length ? `${label} · add ${s.missing.join(", ").toLowerCase()}` : label;

    const chars = (r.prompt || "").length;
    ui.stats.textContent = `${chars.toLocaleString()} chars · ~${Math.ceil(chars / 4).toLocaleString()} tokens`;
  }

  function block(label, text, main) {
    return el("section", { class: "out-block" + (main ? " main" : "") },
      el("header", null,
        el("h2", { text: label }),
        el("button", { type: "button", class: "mini", onclick: () => copy(text, `${label} copied`) }, "Copy")
      ),
      el("pre", { tabindex: "0" }, el("code", { text: text || "" }))
    );
  }

  function fullText() {
    const r = lastResult || compose();
    const parts = [r.prompt];
    if (t(r.negative)) parts.push("Negative prompt:\n" + r.negative);
    (r.extra || []).forEach((x) => parts.push(`${x.label}:\n${x.text}`));
    return parts.join("\n\n");
  }

  /* ---------------- actions ---------------- */
  function surprise() {
    const d = domain();
    const v = values(d);
    const rand = (a) => a[Math.floor(Math.random() * a.length)];
    const sample = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);
    d.fields.forEach((f) => {
      if (f.type === "text" || f.type === "textarea") {
        if (f.examples) v[f.id] = rand(f.examples);
      } else if (f.type === "chips" && f.multi) {
        v[f.id] = sample(f.options, 1 + Math.floor(Math.random() * 2));
      } else if (f.type === "select") {
        if (f.id !== "mode") v[f.id] = rand(f.options);
      }
    });
    persist();
    renderBuilder();
    toast("Surprise! Tweak anything you like.");
  }

  function reset() {
    delete state.values[domain().id];
    persist();
    renderBuilder();
    toast("Cleared");
  }

  const b64 = {
    enc(obj) {
      const bytes = new TextEncoder().encode(JSON.stringify(obj));
      let s = "";
      bytes.forEach((b) => (s += String.fromCharCode(b)));
      return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },
    dec(str) {
      const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0))));
    },
  };

  function shareLink() {
    const d = domain();
    const payload = { d: d.id, t: target(d).id, v: values(d), o: state.opts };
    const url = location.href.split("#")[0] + "#" + d.id + "=" + b64.enc(payload);
    copy(url, "Share link copied");
  }

  function readHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    const [id, data] = h.split("=");
    if (!byId[id]) return;
    state.domain = id;
    if (data) {
      try {
        const p = b64.dec(data);
        if (p && p.d === id && p.v && typeof p.v === "object") {
          state.values[id] = p.v;
          if (p.t) state.targets[id] = p.t;
          if (p.o && Array.isArray(p.o.enhancers)) state.opts = Object.assign(state.opts, p.o);
          setTimeout(() => toast("Loaded shared prompt"), 300);
        }
      } catch (e) {
        /* bad link — ignore */
      }
      history.replaceState(null, "", "#" + id);
    }
    persist();
  }

  function download() {
    const d = domain();
    const blob = new Blob([fullText() + "\n"], { type: "text/plain" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `prompt-${d.id}-${target(d).id}.txt` });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  /* ---------------- library ---------------- */
  function savePrompt() {
    const d = domain();
    const v = values(d);
    const firstText = d.fields.map((f) => v[f.id]).find((x) => typeof x === "string" && x.length > 3) || d.name;
    const name = window.prompt("Name this prompt", firstText.slice(0, 60));
    if (name === null) return;
    const list = store.get(LS_SAVED, []);
    list.unshift({ id: Date.now().toString(36), name: t(name) || d.name, domain: d.id, target: target(d).id, values: JSON.parse(JSON.stringify(v)), at: new Date().toISOString() });
    store.set(LS_SAVED, list.slice(0, 200));
    toast("Saved to your library");
  }

  function openLibrary() {
    const list = store.get(LS_SAVED, []);
    ui.libraryList.replaceChildren();
    if (!list.length) {
      ui.libraryList.append(el("p", { class: "empty", text: "Nothing saved yet. Build a prompt and press Save — it stays in this browser." }));
    }
    list.forEach((item) => {
      const d = byId[item.domain];
      if (!d) return;
      ui.libraryList.append(
        el("article", { class: "lib-item" },
          el("span", { class: "glyph", "aria-hidden": "true", text: d.glyph }),
          el("div", { class: "lib-meta" },
            el("strong", { text: item.name }),
            el("span", { text: `${d.name} · ${(d.targets.find((x) => x.id === item.target) || d.targets[0]).name} · ${new Date(item.at).toLocaleDateString()}` })
          ),
          el("button", {
            type: "button", class: "mini",
            onclick: () => {
              state.values[d.id] = JSON.parse(JSON.stringify(item.values));
              state.targets[d.id] = item.target;
              ui.library.close();
              selectDomain(d.id);
              toast("Loaded");
            },
          }, "Load"),
          el("button", {
            type: "button", class: "mini ghost", "aria-label": `Delete ${item.name}`,
            onclick: () => {
              store.set(LS_SAVED, store.get(LS_SAVED, []).filter((x) => x.id !== item.id));
              openLibrary();
            },
          }, "Delete")
        )
      );
    });
    if (!ui.library.open) ui.library.showModal();
  }

  /* ---------------- wire up ---------------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]");
    if (!a) return;
    const act = a.dataset.action;
    if (act === "copy") copy(fullText());
    if (act === "share") shareLink();
    if (act === "save") savePrompt();
    if (act === "download") download();
    if (act === "surprise") surprise();
    if (act === "reset") reset();
    if (act === "library") openLibrary();
    if (act === "close-library") ui.library.close();
  });

  ui.search.addEventListener("input", renderRail);
  ui.search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = ui.rail.querySelector(".rail-item");
      if (first) first.click();
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      copy(fullText());
    }
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault();
      ui.search.focus();
    }
  });

  window.addEventListener("hashchange", () => {
    readHash();
    renderRail();
    renderBuilder();
  });

  readHash();
  renderRail();
  renderBuilder();
})();

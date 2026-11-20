import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
  X,
  MessageCircle,
  Truck,
  ShieldCheck,
  TicketPercent,
  Trash2,
  Check,
  Search,
  PackageCheck,
  BatteryFull,
  Zap,
} from "lucide-react";
import "./styles.css";
import "./aurix-theme.css";

/* Images: src/image/<product id>-<colour>.png (e.g. buds-black.png), plus aurix-logo(.-white).png and black.png */
const IMG = {};
Object.entries(
  import.meta.glob("./image/*.{png,jpg,jpeg,webp}", {
    eager: true,
    query: "?url",
    import: "default",
  }),
).forEach(([p, url]) => {
  IMG[
    p
      .split("/")
      .pop()
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
  ] = url;
});

/* data.json lives in src/ next to this file and is fetched at runtime. Icons are referenced by name in the JSON. */
import DATA_URL from "./data.json?url";
const ICONS = {
  PackageCheck,
  MessageCircle,
  Truck,
  BatteryFull,
  ShieldCheck,
  Check,
  Zap,
};

/* ---------- helpers ---------- */
const cap = (s) => s[0].toUpperCase() + s.slice(1);
/* A product is unavailable if data.json sets "available": false, or lists the colour in "soldOut" */
const isOut = (p, col) => p.available === false || !!p.soldOut?.includes(col);
function useStore(key, init) {
  const [v, set] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* unavailable */
    }
  }, [key, v]);
  return [v, set];
}
/* Look up a bundled image by the filename written in data.json (extension optional) */
const asset = (name) =>
  IMG[
    String(name || "")
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
  ];
/* Logo filenames; defaults let the loading splash show before data.json arrives, then data.json overrides them */
const LOGOS = { logo: "aurix-logo.png", logoWhite: "aurix-logo-white.png" };
const Logo = ({ white, className }) => (
  <img
    className={className}
    src={asset(white ? LOGOS.logoWhite : LOGOS.logo)}
    alt="AURIX"
    draggable="false"
  />
);
const Img = ({ p, col, size = "md" }) => {
  const file = p.images?.[col];
  const src = asset(file);
  return src ? (
    <img
      className={`pimg pimg-${size}`}
      src={src}
      alt={`${p.name} ${cap(col)}`}
      loading="lazy"
      draggable="false"
    />
  ) : (
    <div
      className={`pimg pimg-${size}`}
      style={{
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        fontSize: size === "sm" ? 0 : 12,
        border: "1px dashed #9aa5a2",
      }}
    >
      Add {file || `${p.id}-${col}.png`}
    </div>
  );
};
function DragLogo() {
  const [d, setD] = useState(null),
    [pos, setPos] = useState([0, 0]);
  const drop = () => {
    setD(null);
    setPos([0, 0]);
  };
  return (
    <div
      className={d ? "drag-logo grabbing" : "drag-logo"}
      style={{ transform: `translate(${pos[0]}px, ${pos[1]}px)` }}
      title="Drag me"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setD([e.clientX - pos[0], e.clientY - pos[1]]);
      }}
      onPointerMove={(e) => d && setPos([e.clientX - d[0], e.clientY - d[1]])}
      onPointerUp={drop}
      onPointerCancel={drop}
    >
      <Logo />
    </div>
  );
}
const Splash = ({ leaving, tagline }) => (
  <div
    className={leaving ? "splash leave" : "splash"}
    role="status"
    aria-label="Loading AURIX"
  >
    <Logo white className="splash-wordmark" />
    {tagline && <p>{tagline}</p>}
    <div className="splash-bar">
      <i />
    </div>
  </div>
);

/* ---------- app ---------- */
function App({ data }) {
  const {
    site,
    delivery: DELIVERY,
    colors: COLORS,
    categories: CATEGORIES,
    nav: NAV,
    hero,
    shop,
    products: PRODUCTS,
    codes: CODES,
    offer,
    steps,
    story,
    faq,
    checkout,
    footer,
  } = data;

  const money = (n) =>
    `${site.currencySymbol}${Math.max(0, Math.round(n)).toLocaleString(site.currencyLocale)}`;

  const [cart, setCart] = useStore("ax_cart", {});
  const [customer, setCustomer] = useStore("ax_customer", {
    name: "",
    phone: "",
    address: "",
    zone: checkout.zones[0].id,
    payment: checkout.paymentMethods[0],
    note: "",
  });
  const [picks, setPicks] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [toast, setToast] = useState("");
  const [boot, setBoot] = useState("show");

  const filtered = useMemo(
    () =>
      PRODUCTS.filter(
        (p) =>
          (category === "All" || p.category === category) &&
          `${p.name} ${p.note} ${p.uses}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [PRODUCTS, category, search],
  );
  const lines = Object.entries(cart).flatMap(([key, qty]) => {
    const [id, col] = key.split("|"),
      p = PRODUCTS.find((x) => x.id === id);
    return p?.colors.includes(col) && !isOut(p, col)
      ? [{ key, p, col, qty, line: p.price * qty }]
      : [];
  });
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.line, 0);
  const off = applied
    ? applied.type === "percent"
      ? Math.round((subtotal * applied.value) / 100)
      : Math.min(subtotal, applied.value)
    : 0;
  const net = subtotal - off;
  const fee =
    !count || net >= DELIVERY.freeOver ? 0 : (DELIVERY[customer.zone] ?? 0);
  const total = net + fee;

  useEffect(() => {
    const a = setTimeout(() => setBoot("leave"), 2000),
      b = setTimeout(() => setBoot("done"), 2600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    const k = (e) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", k);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", k);
    };
  }, [cartOpen]);

  const colorOf = (p) => picks[p.id] || p.colors[0];
  const qty = (key, n) =>
    setCart((c) => {
      const x = { ...c, [key]: (c[key] || 0) + n };
      if (x[key] <= 0) delete x[key];
      return x;
    });
  const add = (p) => {
    if (isOut(p, colorOf(p))) return setToast(`${p.name} is not available`);
    qty(`${p.id}|${colorOf(p)}`, 1);
    setToast(`${p.name} added to basket`);
  };
  const set = (k) => (e) => setCustomer({ ...customer, [k]: e.target.value });
  function applyCode() {
    const c = CODES.find((x) => x.code === code.trim().toUpperCase());
    if (!code.trim()) return setCodeError("Enter a code first.");
    if (!c) {
      setApplied(null);
      return setCodeError(
        "This code is not valid. Check the spelling or ask us on WhatsApp.",
      );
    }
    setApplied(c);
    setCodeError("");
    setToast(`Code ${c.code} applied`);
  }
  function sendOrder() {
    if (!count) return setToast("Your basket is empty");
    if (
      !customer.name.trim() ||
      customer.phone.replace(/\D/g, "").length < 10 ||
      !customer.address.trim()
    )
      return setToast("Add your name, a valid phone number and address");
    const msg = [
      `*New order AX-${Date.now().toString(36).toUpperCase().slice(-6)}* — ${site.brand}`,
      "",
      `Name: ${customer.name}`,
      `Phone: ${customer.phone}`,
      `Address: ${customer.address}`,
      `Area: ${customer.zone === "inside" ? "Inside" : "Outside"} Chattogram city`,
      `Payment: ${customer.payment}`,
      ...(customer.note.trim() ? [`Note: ${customer.note.trim()}`] : []),
      "",
      "*Items*",
      ...lines.map(
        (l) => `• ${l.p.name} (${cap(l.col)}) × ${l.qty} = ${money(l.line)}`,
      ),
      "",
      `Subtotal: ${money(subtotal)}`,
      ...(off ? [`Code ${applied.code}: −${money(off)}`] : []),
      `Delivery: ${fee ? money(fee) : "Free"}`,
      `*Total: ${money(total)}*`,
    ].join("\n");
    window.open(
      `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  const redeem = (cls, btn, id) => (
    <div className={cls}>
      <TicketPercent size={17} />
      <input
        id={id}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && applyCode()}
        placeholder="Enter code"
        aria-label="Redeem code"
      />
      <button onClick={applyCode}>{btn}</button>
    </div>
  );
  const field = (k, label, ph) => {
    const Tag = k === "address" ? "textarea" : "input";
    return (
      <label key={k}>
        {label}
        <Tag
          value={customer[k]}
          onChange={set(k)}
          placeholder={ph}
          rows={k === "address" ? 2 : undefined}
        />
      </label>
    );
  };

  return (
    <div className="site">
      {boot !== "done" && (
        <Splash leaving={boot === "leave"} tagline={site.splashTagline} />
      )}
      <div className="topbar">
        {site.topbar.replace("{freeOver}", money(DELIVERY.freeOver))}
      </div>
      <header className="header">
        <a className="brand" href="#top" aria-label={`${site.brand} home`}>
          <Logo className="brand-logo" />
        </a>
        <nav>
          {NAV.map(({ id, label }) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <button
          className="basket-btn"
          onClick={() => setCartOpen(true)}
          aria-label={`Open basket, ${count} items`}
        >
          <ShoppingBag size={18} />
          <span>Basket</span>
          <b>{count}</b>
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <h1>{hero.title}</h1>
            <p>{hero.text}</p>
            <div className="hero-actions">
              <a className="btn btn-dark" href="#shop">
                {hero.primaryCta} <ArrowRight size={17} />
              </a>
              <a className="link-dark" href="#how">
                {hero.secondaryLink}
              </a>
            </div>
          </div>
          <DragLogo />
          <div className="hero-pic">
            <img
              src={asset(site.images.hero)}
              alt={`${site.brand} products`}
              draggable="false"
            />
          </div>
        </section>

        <section className="shop wrap" id="shop">
          <div className="shop-head">
            <div>
              <h2>{shop.title}</h2>
              <p>{shop.text}</p>
            </div>
            <label className="search">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={shop.searchPlaceholder}
                aria-label="Search products"
              />
            </label>
          </div>
          <div className="filters" role="tablist">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={category === c ? "chip on" : "chip"}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid">
            {filtered.map((p) => {
              const ck = colorOf(p);
              const sold = isOut(p, ck);
              return (
                <article className="card" key={p.id}>
                  <div className="card-art">
                    <Img p={p} col={ck} />
                  </div>
                  <div className="card-body">
                    <div className="meta">
                      <span>{p.category}</span>
                      <span className="heat">
                        <BatteryFull size={14} /> {p.spec}
                        {p.anc ? (
                          <>
                            <Zap size={13} className="on" /> ANC
                          </>
                        ) : null}
                      </span>
                    </div>
                    <h3>{p.name}</h3>
                    <p className="note">{p.note}</p>
                    <p className="uses">
                      <b>Specs:</b> {p.uses}
                    </p>
                    <div
                      className="swatches"
                      role="radiogroup"
                      aria-label={`Colour for ${p.name}`}
                    >
                      {p.colors.map((k) => (
                        <button
                          key={k}
                          role="radio"
                          aria-checked={ck === k}
                          aria-label={cap(k)}
                          title={cap(k)}
                          className={ck === k ? "swatch on" : "swatch"}
                          style={{
                            "--sw": COLORS[k],
                            opacity: isOut(p, k) ? 0.35 : 1,
                          }}
                          onClick={() => setPicks({ ...picks, [p.id]: k })}
                        />
                      ))}
                      <small>
                        {cap(ck)}
                        {sold ? " · Not available" : ""}
                      </small>
                    </div>
                    <div className="buy">
                      <strong>{money(p.price)}</strong>
                      <button
                        className="btn btn-gold"
                        onClick={() => add(p)}
                        disabled={sold}
                        style={
                          sold
                            ? { opacity: 0.5, cursor: "not-allowed" }
                            : undefined
                        }
                      >
                        {sold ? (
                          "Not available"
                        ) : (
                          <>
                            <Plus size={16} /> Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {!filtered.length && (
            <div className="empty-search">
              No products match “{search}”. Try a shorter name or clear the
              filter.
            </div>
          )}
        </section>

        <section className="offer wrap" id="offers">
          <div className="offer-card">
            <div className="offer-badge">
              <b>{offer.badgeValue}</b>
              <span>{offer.badgeLabel}</span>
            </div>
            <div className="offer-copy">
              <h2>{offer.title}</h2>
              <p>{offer.text}</p>
              {redeem("offer-row", offer.button)}
              {applied && (
                <>
                  <p className="ok">
                    <Check size={15} /> {applied.code} applied:{" "}
                    {applied.type === "percent"
                      ? `${applied.value}% off`
                      : `${money(applied.value)} off`}
                    .{" "}
                    {subtotal
                      ? `You save ${money(off)}.`
                      : "Add products to your basket to see your saving."}
                  </p>
                  <button
                    className="btn btn-dark offer-go"
                    onClick={() => setCartOpen(true)}
                  >
                    View basket <ArrowRight size={16} />
                  </button>
                </>
              )}
              {codeError && <p className="err">{codeError}</p>}
            </div>
          </div>
        </section>

        <section className="how" id="how">
          <div className="wrap">
            <h2>{steps.title}</h2>
            <ol>
              {steps.items.map(({ icon, title, text }) => {
                const Icon = ICONS[icon];
                return (
                  <li key={title}>
                    {Icon && <Icon />}
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="story wrap" id="story">
          <div className="story-art">
            <Logo className="story-wordmark" />
          </div>
          <div>
            <h2>{story.title}</h2>
            {story.paragraphs.map((t) => (
              <p key={t}>{t}</p>
            ))}
            <ul className="ticks">
              {story.ticks.map(({ icon, text }) => {
                const Icon = ICONS[icon];
                return (
                  <li key={text}>
                    {Icon && <Icon size={16} />} {text}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="faq wrap" id="faq">
          <h2>{faq.title}</h2>
          {faq.items.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </main>

      <footer className="footer">
        <div className="wrap foot-in">
          <div>
            <Logo white className="foot-logo" />
            <p>{footer.text}</p>
          </div>
          <div className="foot-links">
            {footer.links.map(({ href, label }) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </div>
          <small>
            © {new Date().getFullYear()} {site.brand}
          </small>
        </div>
      </footer>

      {cartOpen && (
        <div
          className="overlay"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setCartOpen(false)
          }
        >
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your basket"
          >
            <div className="d-head">
              <h2>
                Your basket <span>({count})</span>
              </h2>
              <button
                className="x"
                onClick={() => setCartOpen(false)}
                aria-label="Close basket"
              >
                <X />
              </button>
            </div>
            <div className="d-body">
              {lines.length ? (
                <>
                  <div className="ship-meter">
                    <p>
                      {net < DELIVERY.freeOver ? (
                        <>
                          Add <b>{money(DELIVERY.freeOver - net)}</b> more for
                          free delivery
                        </>
                      ) : (
                        <b>Free delivery unlocked.</b>
                      )}
                    </p>
                    <div className="bar">
                      <i
                        style={{
                          width: `${Math.min(100, (net / DELIVERY.freeOver) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  {lines.map((l) => (
                    <div className="line" key={l.key}>
                      <div className="thumb">
                        <Img p={l.p} col={l.col} size="sm" />
                      </div>
                      <div className="line-info">
                        <b>{l.p.name}</b>
                        <small>
                          {cap(l.col)} · {money(l.p.price)} each
                        </small>
                        <button
                          className="remove"
                          onClick={() => qty(l.key, -l.qty)}
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                      <div className="qty">
                        <button
                          onClick={() => qty(l.key, -1)}
                          aria-label="Decrease"
                        >
                          <Minus size={13} />
                        </button>
                        <span>{l.qty}</span>
                        <button
                          onClick={() => qty(l.key, 1)}
                          aria-label="Increase"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <b className="line-total">{money(l.line)}</b>
                    </div>
                  ))}
                  <div className="redeem">
                    <label htmlFor="redeem">Redeem code</label>
                    {redeem("redeem-row", "Apply", "redeem")}
                    {applied && (
                      <p className="ok">
                        <Check size={13} /> {applied.code} applied. You save{" "}
                        {money(off)}.
                      </p>
                    )}
                    {codeError && <p className="err">{codeError}</p>}
                  </div>
                  <div className="form">
                    <h3>Delivery details</h3>
                    {field("name", "Name")}
                    {field("phone", "Phone", "01576470685")}
                    {field("address", "Address", "House, road, area")}
                    <div
                      className="zones"
                      role="radiogroup"
                      aria-label="Delivery area"
                    >
                      {checkout.zones.map(({ id, label }) => (
                        <button
                          key={id}
                          role="radio"
                          aria-checked={customer.zone === id}
                          className={customer.zone === id ? "zone on" : "zone"}
                          onClick={() => setCustomer({ ...customer, zone: id })}
                        >
                          {label}
                          <small>{money(DELIVERY[id])}</small>
                        </button>
                      ))}
                    </div>
                    <label>
                      Payment
                      <select
                        value={customer.payment}
                        onChange={set("payment")}
                      >
                        {checkout.paymentMethods.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                    {field(
                      "note",
                      "Note for us (optional)",
                      "e.g. call before delivery",
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-cart">
                  <ShoppingBag size={34} />
                  <h3>Your basket is empty</h3>
                  <p>Pick a product and it will show up here.</p>
                  <button
                    className="btn btn-dark"
                    onClick={() => setCartOpen(false)}
                  >
                    Browse products
                  </button>
                </div>
              )}
            </div>
            {lines.length > 0 && (
              <div className="d-foot">
                <dl>
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{money(subtotal)}</dd>
                  </div>
                  {off > 0 && (
                    <div className="save">
                      <dt>Code {applied.code}</dt>
                      <dd>−{money(off)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Delivery</dt>
                    <dd>{fee ? money(fee) : "Free"}</dd>
                  </div>
                  <div className="grand">
                    <dt>Total</dt>
                    <dd>{money(total)}</dd>
                  </div>
                </dl>
                <button className="wa" onClick={sendOrder}>
                  <MessageCircle size={18} /> Send order on WhatsApp
                </button>
                <p>{checkout.footNote}</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

/* Fetches data.json, then renders the app */
function Root() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(DATA_URL, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => {
        try {
          return JSON.parse(t);
        } catch {
          throw new Error("response was not valid JSON");
        }
      })
      .then((d) => {
        Object.assign(LOGOS, d.site?.images);
        setData(d);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(`Could not load data.json (${e.message}).`);
      });
    return () => ctrl.abort();
  }, []);

  if (error)
    return (
      <div role="alert" style={{ padding: 32, textAlign: "center" }}>
        {error} Make sure <code>data.json</code> is in the <code>src</code>{" "}
        folder, next to <code>main.jsx</code>.
      </div>
    );
  if (!data) return <Splash />;
  return <App data={data} />;
}

/* Reuse the root across hot reloads so createRoot is only called once per container */
const container = document.getElementById("root");
const root = (container._reactRoot ??= createRoot(container));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

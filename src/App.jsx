  import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";
import { create } from "zustand";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  ArrowRight,
  ArrowUpRight,
  Check,
  Package,
  ChevronUp,
  Menu,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* =========================================================================
   IMAGES — unsplash CDN, wrapped so a failed load never shows a broken icon
   ========================================================================= */

const CRATE_PHOTO = "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?w=1200&q=80&auto=format&fit=crop";

const IMG = {
  boxWhiteBg: "https://images.unsplash.com/photo-1656543802898-41c8c46683a7?w=900&q=80&auto=format&fit=crop",
  boxOnTable: "https://images.unsplash.com/photo-1573376670774-4427757f7963?w=900&q=80&auto=format&fit=crop",
  boxWoodTable: "https://images.unsplash.com/photo-1624137527136-66e631bdaa0e?w=900&q=80&auto=format&fit=crop",
  boxesOpenPile: "https://images.unsplash.com/photo-1700165644892-3dd6b67b25bc?w=900&q=80&auto=format&fit=crop",
  kraftTexture1: "https://images.unsplash.com/photo-1616410731309-4e07df6b5d42?w=1600&q=80&auto=format&fit=crop",
  boxTextured: "https://images.unsplash.com/photo-1740842028123-56fd319de33a?w=900&q=80&auto=format&fit=crop",
  boxWhiteSurface: "https://images.unsplash.com/photo-1607166452427-7e4477079cb9?w=900&q=80&auto=format&fit=crop",
  handoff: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=1600&q=80&auto=format&fit=crop",
  boxWhiteSurface2: "https://images.unsplash.com/photo-1630448927918-1dbcd8ba439b?w=900&q=80&auto=format&fit=crop",
  boxesFloor: "https://images.unsplash.com/photo-1609143739217-01b60dad1c67?w=900&q=80&auto=format&fit=crop",
  rackBoxes: "https://images.unsplash.com/photo-1577702312572-5bb9328a9f15?w=900&q=80&auto=format&fit=crop",
  bottlePanel: "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?w=1200&q=80&auto=format&fit=crop",
  mailerPanel: "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=1200&q=80&auto=format&fit=crop",
  cratePanel: CRATE_PHOTO,
};

function Img({ src, alt, className, style }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`img-fallback ${className || ""}`} style={style}>
        <Package size={26} strokeWidth={1.4} />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className={className} style={style} loading="lazy" onError={() => setFailed(true)} />
  );
}

/* =========================================================================
   CART STORE
   ========================================================================= */

const useCart = create((set, get) => ({
  items: {},
  add: (id) => set((s) => ({ items: { ...s.items, [id]: (s.items[id] || 0) + 1 } })),
  setQty: (id, qty) =>
    set((s) => {
      const items = { ...s.items };
      if (qty <= 0) delete items[id];
      else items[id] = qty;
      return { items };
    }),
  clear: () => set({ items: {} }),
}));

/* =========================================================================
   CUSTOM CURSOR — dot + lagging ring, grows/labels on hoverables
   ========================================================================= */

function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);
    const move = (e) => {
      pos.current = { x: e.clientX, y: e.clientY };
      const t = e.target.closest("[data-cursor]");
      if (dotRef.current) dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      if (labelRef.current) labelRef.current.textContent = t ? t.getAttribute("data-cursor") : "";
      if (ringRef.current) ringRef.current.classList.toggle("cur-active", !!t);
    };
    window.addEventListener("mousemove", move);
    let raf;
    const tick = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.18;
      ring.current.y += (pos.current.y - ring.current.y) * 0.18;
      if (ringRef.current) ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div className="cur-wrap" aria-hidden="true">
      <div className="cur-dot" ref={dotRef} />
      <div className="cur-ring" ref={ringRef}>
        <span className="cur-label" ref={labelRef} />
      </div>
    </div>
  );
}

/* =========================================================================
   SCROLL REVEAL — IntersectionObserver toggles .in-view on .reveal nodes
   ========================================================================= */

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* =========================================================================
   MARGIN NOTE — vertical packing-slip annotation, fills the side gutters
   ========================================================================= */

function MarginNote({ side = "left", text, code }) {
  return (
    <div className={`margin-note margin-${side}`} aria-hidden="true">
      <span className="margin-text">{text}</span>
      {code && <span className="margin-code">{code}</span>}
    </div>
  );
}

/* =========================================================================
   ICONS
   ========================================================================= */

function IconBottle({ color }) {
  return (
    <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
      <path d="M14 3h6v4.5l2.5 3.5v17a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-17L14 7.5V3Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3h6" stroke={color} strokeWidth="1.6" />
      <path d="M11.5 15h11" stroke={color} strokeWidth="1.3" strokeDasharray="2 2" />
    </svg>
  );
}
function IconWing({ color }) {
  return (
    <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
      <path d="M17 4v26M17 4 6 12l3 1.4L17 9M17 4l11 8-3 1.4L17 9" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12 26h10l-2 3H14l-2-3Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconHull({ color }) {
  return (
    <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
      <path d="M6 20h22l-3 8H9l-3-8Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 20V8h5l4 4h5v8" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17 8v4" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}
function IconStampRing({ color = "currentColor", label }) {
  const id = `stamp-${label.replace(/\s+/g, "")}`;
  return (
    <svg viewBox="0 0 100 100" width="80" height="80">
      <defs>
        <path id={id} d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="1" strokeDasharray="1 4" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="1.4" />
      <text fontSize="7.4" letterSpacing="2.5" fill={color} fontFamily="'JetBrains Mono', monospace">
        <textPath href={`#${id}`} startOffset="2%">{label}</textPath>
      </text>
    </svg>
  );
}

/* =========================================================================
   CATALOG
   ========================================================================= */

const LINES = [
  { id: "bottle", letter: "B", label: "Bottle Box", accent: "#8B5E3C", Icon: IconBottle, bg: IMG.bottlePanel },
  { id: "overnight", letter: "O", label: "Overnight", accent: "#C1531C", Icon: IconWing, bg: IMG.mailerPanel },
  { id: "export", letter: "X", label: "Export Crate", accent: "#3F5741", Icon: IconHull, bg: IMG.cratePanel },
];

const PRODUCTS = [
  { id: "bb-classic", line: "bottle", name: "Bottle Box — Classic", spec: "Fits 500ml–750ml glass · single cavity", price: 0.62, unit: "box", image: IMG.boxWhiteBg },
  { id: "bb-duo", line: "bottle", name: "Bottle Box — Duo", spec: "Twin cavity · gift-ready lid", price: 0.89, unit: "box", image: IMG.boxOnTable },
  { id: "bb-mag", line: "bottle", name: "Bottle Box — Magnetic Flap", spec: "Rigid board · magnetic close", price: 1.35, unit: "box", image: IMG.boxTextured },
  { id: "on-slim", line: "overnight", name: "Overnight Mailer — Slim", spec: "Tear-strip seal · up to 1kg", price: 0.31, unit: "mailer", image: IMG.boxWoodTable },
  { id: "on-tear", line: "overnight", name: "Overnight Mailer — Tear-Seal", spec: "Tamper-evident · label zone", price: 0.38, unit: "mailer", image: IMG.boxWhiteSurface },
  { id: "on-bulk", line: "overnight", name: "Overnight Mailer — Bulk Pack", spec: "Flat-packed, 500 per carton", price: 0.27, unit: "mailer", image: IMG.boxWhiteSurface2 },
  { id: "ex-std", line: "export", name: "Export Crate — Standard", spec: "ISPM-15 timber · up to 40kg", price: 18.5, unit: "crate", image: IMG.boxesOpenPile },
  { id: "ex-heavy", line: "export", name: "Export Crate — Heavy Duty", spec: "Reinforced corners · up to 120kg", price: 34, unit: "crate", image: IMG.boxesFloor },
  { id: "ex-pallet", line: "export", name: "Export Crate — Palletised", spec: "Strapped + manifested, ready to ship", price: 46, unit: "pallet", image: IMG.rackBoxes },
];

const TESTIMONIALS = [
  { initials: "SA", name: "Studio Aviary", role: "Ceramics, 6-unit shelf run", quote: "We switched to the Bottle Box mid-quarter and our breakage claims went to zero the same month. Nobody at the warehouse even noticed the changeover." },
  { initials: "NR", name: "Northbound Roasters", role: "Coffee, subscription boxes", quote: "The tear-strip mailer shaved forty seconds off every pack station. Forty seconds times eleven thousand boxes a month adds up fast." },
  { initials: "LW", name: "Loop & Wick", role: "Candles, export to three regions", quote: "Vertex's crate stencils saved us a whole afternoon of relabeling at customs. Small thing on paper, huge thing on a Friday." },
];

/* =========================================================================
   NAVBAR — floating glass pill, classy
   ========================================================================= */

function Navbar({ cartCount, onCartClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [["top", "Cover"], ["shop", "Shop"], ["process", "Process"], ["the-box", "The Box"], ["dock", "Reviews"], ["contact", "Contact"]];
  return (
    <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#top" className="nav-brand" data-cursor="">
          <span className="nav-brand-mark"><Package size={16} /></span>
          VERTEX
        </a>
        <nav className="nav-links">
          {links.map(([id, name]) => (
            <a key={id} href={`#${id}`} data-cursor="">{name}</a>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="nav-cart" onClick={onCartClick} data-cursor="cart" aria-label="open cart">
            <ShoppingBag size={17} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span className="nav-cart-badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key={cartCount}>
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button className="nav-burger" onClick={() => setOpen((o) => !o)} aria-label="menu">
            <Menu size={18} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav className="nav-mobile" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {links.map(([id, name]) => (
              <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{name}</a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

/* =========================================================================
   HERO
   ========================================================================= */

function Hero({ onShopLine }) {
  const [split, setSplit] = useState(false);
  const [active, setActive] = useState("bottle");

  return (
    <section className={`ph-stage ${split ? "ph-split" : ""}`} id="top">
      <div className="ph-cover">
        <Img src={IMG.handoff} alt="" className="ph-cover-img" />
        <div className="ph-cover-tint" />
        <div className="ph-grain" />
        <div className="ph-cover-content">
          <span className="ph-eyebrow">VERTEX PACKAGING CO. · EST. SHOP</span>
          <h1>PACKAGING<br />THAT DELIVERS</h1>
          <p className="ph-cover-tag">Bottle Box · Overnight · Export Crate — three lines, priced by the unit, no quote required to start.</p>
          <button className="ph-explore" onClick={() => setSplit(true)} data-cursor="open">
            Explore the lines <span className="ph-arrow">→</span>
          </button>
        </div>
        <span className="ph-dot" />
      </div>

      <div className="ph-hero">
        <button className="ph-back" aria-label="back to cover" onClick={() => setSplit(false)} data-cursor="">←</button>
        {LINES.map((p) => (
          <div
            key={p.id}
            className={`ph-panel ${active === p.id ? "ph-active" : ""}`}
            style={{ "--ph-accent": p.accent }}
            onClick={() => setActive(p.id)}
            data-cursor={active === p.id ? "" : "view"}
          >
            <Img src={p.bg} alt="" className="ph-panel-img" />
            <div className="ph-panel-tint" />
            <span className="ph-letter">{p.label[0]}</span>
            <div className="ph-content">
              <span className="ph-brand">VERTEX / {p.id.toUpperCase()}</span>
              <div className="ph-icon-badge"><p.Icon color="#F3E7D8" /></div>
              <h2>{p.label}</h2>
              <p className="ph-tag">
                {p.id === "bottle" && "Snug fit. Zero rattle."}
                {p.id === "overnight" && "Sealed at dusk. Gone by dawn."}
                {p.id === "export" && "Built for the long haul."}
              </p>
              <button className="ph-cta" onClick={(e) => { e.stopPropagation(); onShopLine(p.id); }} data-cursor="shop">
                Shop {p.label} <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================================
   MARK STRIP
   ========================================================================= */

function MarkStrip() {
  const items = ["PANTONE-MATCHED PRINT", "FSC-CERTIFIED BOARD", "48HR PROTOTYPE TURNAROUND", "IN-HOUSE DIE LIBRARY", "CRUSH-TESTED CRATES", "PALLET-READY CARTONING"];
  return (
    <div className="mark-strip">
      <div className="mark-track">
        {[...items, ...items].map((t, i) => (<span key={i}>{t} <i>·</i></span>))}
      </div>
    </div>
  );
}

/* =========================================================================
   SHOP
   ========================================================================= */

function QtyStepper({ qty, onChange }) {
  return (
    <div className="qty-stepper">
      <button aria-label="decrease" onClick={() => onChange(Math.max(0, qty - 1))} data-cursor=""><Minus size={13} /></button>
      <span>{qty}</span>
      <button aria-label="increase" onClick={() => onChange(qty + 1)} data-cursor=""><Plus size={13} /></button>
    </div>
  );
}

function ProductCard({ product }) {
  const qty = useCart((s) => s.items[product.id] || 0);
  const setQty = useCart((s) => s.setQty);
  const add = useCart((s) => s.add);
  const [justAdded, setJustAdded] = useState(false);
  const line = LINES.find((l) => l.id === product.line);

  const handleAdd = () => {
    add(product.id);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <article className="product-card" data-cursor="view">
      <div className="product-media">
        <Img src={product.image} alt={product.name} className="product-img" />
        <span className="product-line-tag" style={{ "--tag-accent": line.accent }}>{line.label}</span>
        <AnimatePresence>
          {justAdded && (
            <motion.span className="stamp-pop" initial={{ opacity: 0, scale: 0.6, rotate: -14 }} animate={{ opacity: 1, scale: 1, rotate: -10 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.35 }}>
              PACKED <Check size={12} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="product-body">
        <h3>{product.name}</h3>
        <p className="product-spec">{product.spec}</p>
        <div className="product-row">
          <span className="product-price">${product.price.toFixed(2)}<i>/{product.unit}</i></span>
          {qty > 0 ? <QtyStepper qty={qty} onChange={(n) => setQty(product.id, n)} /> : (
            <button className="product-add" onClick={handleAdd} data-cursor="">Add <Plus size={13} /></button>
          )}
        </div>
      </div>
    </article>
  );
}

function Shop({ activeLine, setActiveLine }) {
  const filtered = useMemo(() => (activeLine === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.line === activeLine)), [activeLine]);
  return (
    <section className="shop" id="shop">
      <MarginNote side="left" text="HANDLE WITH CARE" code="VX·01" />
      <div className="section-head reveal">
        <IconStampRing color="#4C6B4F" label="ORDER BY THE UNIT · " />
        <div>
          <span className="eyebrow">The shop</span>
          <h2>Pick a line, set the count</h2>
        </div>
      </div>
      <div className="shop-tabs reveal">
        <button className={activeLine === "all" ? "shop-tab shop-tab-active" : "shop-tab"} onClick={() => setActiveLine("all")} data-cursor="">All</button>
        {LINES.map((l) => (
          <button key={l.id} className={activeLine === l.id ? "shop-tab shop-tab-active" : "shop-tab"} style={{ "--tab-accent": l.accent }} onClick={() => setActiveLine(l.id)} data-cursor="">
            <l.Icon color={activeLine === l.id ? "#F3E7D8" : l.accent} />
            {l.label}
          </button>
        ))}
      </div>
      <div className="product-grid">
        {filtered.map((p) => (<ProductCard key={p.id} product={p} />))}
      </div>
    </section>
  );
}

/* =========================================================================
   PROCESS SLIDESHOW
   ========================================================================= */

const PROCESS_SLIDES = [
  { tag: "01 / DESIGN", title: "Proof before print", copy: "We send a flat proof and a folded sample. Nothing goes to plate until you've signed off the exact box." },
  { tag: "02 / PRINT", title: "Plate-matched colour", copy: "Offset or digital, Pantone-matched. Interior and exterior print run in the same pass — no realignment drift." },
  { tag: "03 / ASSEMBLE", title: "Die-cut, fold, glue", copy: "Automated folder-gluers hold tolerances tighter than hand assembly ever could, at the volumes you need." },
  { tag: "04 / SHIP", title: "Palletised and manifested", copy: "Cartons palletised, wrapped, and manifested against your PO. Freight booked the same week as final QC." },
];

function ProcessSlideshow() {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const go = useCallback((next) => setIndex((i) => (next + PROCESS_SLIDES.length) % PROCESS_SLIDES.length), []);
  useEffect(() => {
    timer.current = setInterval(() => setIndex((i) => (i + 1) % PROCESS_SLIDES.length), 4200);
    return () => clearInterval(timer.current);
  }, []);
  const restart = (fn) => {
    clearInterval(timer.current);
    fn();
    timer.current = setInterval(() => setIndex((i) => (i + 1) % PROCESS_SLIDES.length), 4200);
  };
  return (
    <section className="process" id="process">
      <MarginNote side="right" text="THIS SIDE UP" code="VX·02" />
      <div className="section-head light reveal">
        <span className="eyebrow">How it moves</span>
        <h2>From proof to pallet</h2>
      </div>
      <div className="slideshow reveal">
        <button className="slide-arrow left" onClick={() => restart(() => go(index - 1))} aria-label="previous step" data-cursor="">←</button>
        <div className="slide-viewport">
          {PROCESS_SLIDES.map((s, i) => (
            <div key={s.tag} className={`slide ${i === index ? "slide-active" : ""}`}>
              <span className="slide-tag">{s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.copy}</p>
            </div>
          ))}
        </div>
        <button className="slide-arrow right" onClick={() => restart(() => go(index + 1))} aria-label="next step" data-cursor="">→</button>
      </div>
      <div className="slide-dots">
        {PROCESS_SLIDES.map((_, i) => (
          <button key={i} className={i === index ? "dot dot-active" : "dot"} onClick={() => restart(() => setIndex(i))} aria-label={`go to step ${i + 1}`} data-cursor="" />
        ))}
      </div>
    </section>
  );
}

/* =========================================================================
   THREE.JS — refined gift-box reveal with soft shadow, ribbon, burst
   ========================================================================= */

function makeCorrugateTexture(hex) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = "#3A2A1A";
  for (let y = -20; y < 280; y += 6) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y + 40); ctx.lineWidth = 1.4; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function makeShadowTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, "rgba(20,14,8,0.45)");
  g.addColorStop(1, "rgba(20,14,8,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function ThreeBox() {
  const mountRef = useRef(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    let width = mount.clientWidth, height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(2.3, 2.0, 3.3);
    camera.lookAt(0, 0.45, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const key = new THREE.DirectionalLight(0xfff2df, 1.3);
    key.position.set(3, 5, 2);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffe8cc, 0.55));
    const rim = new THREE.DirectionalLight(0xffd9a0, 0.5);
    rim.position.set(-3, 2.4, -2);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffb27a, 0.5, 8);
    fill.position.set(0, 1.6, 1.8);
    scene.add(fill);

    // soft contact shadow (static, not rotating)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 48),
      new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    scene.add(shadow);

    const kraftMat = new THREE.MeshStandardMaterial({ map: makeCorrugateTexture("#c9a66b"), roughness: 0.85, metalness: 0.03 });
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xc1531c, roughness: 0.55 });
    const insideMat = new THREE.MeshStandardMaterial({ color: 0x2a3d2c, roughness: 0.8 });
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xf3e7d8, roughness: 0.4 });

    const rotGroup = new THREE.Group();
    scene.add(rotGroup);

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.2), kraftMat);
    base.position.y = 0.55;
    rotGroup.add(base);

    const tape = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.14, 1.24), tapeMat);
    tape.position.y = 0.85;
    rotGroup.add(tape);

    // ribbon crossing the base, front-to-back and side-to-side
    const ribbonA = new THREE.Mesh(new THREE.BoxGeometry(1.64, 1.12, 0.1), ribbonMat);
    ribbonA.position.y = 0.55;
    rotGroup.add(ribbonA);
    const ribbonB = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.12, 1.24), ribbonMat);
    ribbonB.position.y = 0.55;
    rotGroup.add(ribbonB);

    const inside = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.9, 1.04), insideMat);
    inside.position.y = 0.5;
    rotGroup.add(inside);

    const product = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3, 1),
      new THREE.MeshStandardMaterial({ color: 0xf3e7d8, roughness: 0.35, flatShading: true, emissive: 0x3a2a10, emissiveIntensity: 0.08 })
    );
    product.position.y = 0.72;
    rotGroup.add(product);

    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 1.1, -0.6);
    rotGroup.add(lidGroup);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 1.22), kraftMat);
    lid.position.set(0, 0, 0.6);
    lidGroup.add(lid);
    const lidRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.34), ribbonMat);
    lidRibbon.position.set(0, 0.02, 0.6);
    lidGroup.add(lidRibbon);

    // confetti burst — hidden until opened
    const N = 46;
    const burstGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(N * 3);
    const velocities = [];
    const colors = new Float32Array(N * 3);
    const palette = [new THREE.Color("#C1531C"), new THREE.Color("#4C6B4F"), new THREE.Color("#F3E7D8"), new THREE.Color("#8B5E3C")];
    for (let i = 0; i < N; i++) {
      positions[i * 3] = 0; positions[i * 3 + 1] = 0.75; positions[i * 3 + 2] = 0;
      const c = palette[i % palette.length];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      velocities.push({
        x: (Math.random() - 0.5) * 1.6,
        y: Math.random() * 1.8 + 0.7,
        z: (Math.random() - 0.5) * 1.6,
        life: 0,
      });
    }
    burstGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    burstGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const burstMat = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
    const burst = new THREE.Points(burstGeo, burstMat);
    rotGroup.add(burst);
    let burstActive = false, burstT = 0;

    let openT = 0, dragVel = 0;
    let parX = 0, parZ = 0;

    const resize = () => {
      width = mount.clientWidth; height = mount.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const onDown = (e) => { dragging.current = true; lastX.current = e.touches ? e.touches[0].clientX : e.clientX; };
    const onMove = (e) => {
      const rect = mount.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      pointer.current.x = ((cx - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = ((cy - rect.top) / rect.height) * 2 - 1;
      if (!dragging.current) return;
      const dx = cx - lastX.current;
      lastX.current = cx;
      dragVel = dx * 0.01;
      rotGroup.rotation.y += dragVel;
    };
    const onUp = () => (dragging.current = false);

    mount.addEventListener("mousedown", onDown);
    mount.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    mount.addEventListener("touchstart", onDown, { passive: true });
    mount.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const wasOpen = openT > 0.5;
      const target = openRef.current ? 1 : 0;
      openT += (target - openT) * 0.08;
      lidGroup.rotation.x = -openT * (Math.PI * 0.64);
      product.visible = openT > 0.1;
      product.scale.setScalar(0.55 + openT * 0.45);
      product.rotation.y += 0.012;
      ribbonA.visible = ribbonB.visible = lidRibbon.visible = openT < 0.2;

      if (openRef.current && !wasOpen && openT > 0.15 && !burstActive) {
        burstActive = true; burstT = 0;
        for (let i = 0; i < N; i++) { positions[i * 3] = 0; positions[i * 3 + 1] = 0.75; positions[i * 3 + 2] = 0; velocities[i].life = 0; }
      }
      if (!openRef.current) burstActive = false;
      if (burstActive) {
        burstT += 0.016;
        burstMat.opacity = Math.max(0, 1 - burstT * 0.7);
        for (let i = 0; i < N; i++) {
          const v = velocities[i];
          positions[i * 3] += v.x * 0.02;
          positions[i * 3 + 1] += (v.y - burstT * 2.2) * 0.02;
          positions[i * 3 + 2] += v.z * 0.02;
        }
        burstGeo.attributes.position.needsUpdate = true;
        if (burstT > 1.4) burstActive = false;
      } else {
        burstMat.opacity += (0 - burstMat.opacity) * 0.2;
      }

      parX += ((pointer.current.y * 0.12) - parX) * 0.05;
      parZ += ((pointer.current.x * 0.12) - parZ) * 0.05;
      rotGroup.rotation.x = parX;

      if (!dragging.current) {
        rotGroup.rotation.y += dragVel;
        dragVel *= 0.94;
        rotGroup.rotation.y += 0.0014;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener("mousedown", onDown);
      mount.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      mount.removeEventListener("touchstart", onDown);
      mount.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { openRef.current = open; }, [open]);

  return (
    <section className="three-section" id="the-box">
      <MarginNote side="left" text="FRAGILE — GLASS" code="VX·03" />
      <div className="section-head reveal">
        <span className="eyebrow">See it, don't just spec it</span>
        <h2>Turn it. Open it.</h2>
        <p className="three-copy">Drag the carton to see the corrugate and the ribbon line up on every face. Click to untie the bow and watch the lid swing — the same reveal your customer gets on their doorstep.</p>
      </div>
      <div className={`three-stage ${open ? "three-open" : ""}`} ref={mountRef} onClick={() => setOpen((o) => !o)} data-cursor={open ? "close" : "open"}>
        <span className="three-hint">{open ? "click to close" : "click to open · drag to spin"}</span>
      </div>
    </section>
  );
}

/* =========================================================================
   WHY VERTEX
   ========================================================================= */

function WhyVertex() {
  const rows = [
    ["04.8M", "cartons printed last year"],
    ["1.1%", "return-to-sender rate on overnight mailers"],
    ["3 DAY", "average sample-to-approval time"],
    ["27", "export lanes crated for monthly"],
  ];
  return (
    <section className="why" id="why">
      <div className="section-head reveal">
        <span className="eyebrow">On the record</span>
        <h2>Numbers off the manifest</h2>
      </div>
      <div className="manifest reveal">
        {rows.map(([n, l], i) => (
          <div className="manifest-row" key={i}>
            <span className="manifest-num">{n}</span>
            <span className="manifest-rule" />
            <span className="manifest-label">{l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================================
   TESTIMONIALS
   ========================================================================= */

function Testimonials() {
  return (
    <section className="dock" id="dock">
      <MarginNote side="right" text="INSPECTED BY QC-04" code="VX·04" />
      <div className="dock-texture"><Img src={IMG.kraftTexture1} alt="" /></div>
      <div className="section-head light reveal">
        <span className="eyebrow">From the loading dock</span>
        <h2>What actually shipped</h2>
      </div>
      <div className="dock-grid">
        {TESTIMONIALS.map((t) => (
          <div className="dock-card reveal" key={t.name}>
            <p className="dock-quote">&ldquo;{t.quote}&rdquo;</p>
            <div className="dock-person">
              <span className="dock-avatar">{t.initials}</span>
              <div><strong>{t.name}</strong><span>{t.role}</span></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================================
   CART DRAWER
   ========================================================================= */

function CartDrawer({ open, onClose, onSendToSales }) {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const rows = Object.entries(items).map(([id, qty]) => ({ product: PRODUCTS.find((p) => p.id === id), qty })).filter((r) => r.product);
  const subtotal = rows.reduce((sum, r) => sum + r.product.price * r.qty, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="drawer-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}>
            <div className="drawer-perf" />
            <div className="drawer-head">
              <span className="drawer-eyebrow">PACK LIST</span>
              <h3>Your order</h3>
              <button className="drawer-close" onClick={onClose} aria-label="close cart" data-cursor=""><X size={18} /></button>
            </div>
            {rows.length === 0 ? (
              <div className="drawer-empty"><Package size={30} strokeWidth={1.3} /><p>Nothing on the list yet. Add a box from the shop.</p></div>
            ) : (
              <div className="drawer-items">
                {rows.map(({ product, qty }) => (
                  <div className="drawer-item" key={product.id}>
                    <Img src={product.image} alt={product.name} className="drawer-item-img" />
                    <div className="drawer-item-body">
                      <strong>{product.name}</strong>
                      <span>${product.price.toFixed(2)} / {product.unit}</span>
                      <QtyStepper qty={qty} onChange={(n) => setQty(product.id, n)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="drawer-foot">
              <div className="drawer-subtotal"><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
              <button className="drawer-submit" disabled={rows.length === 0} onClick={() => onSendToSales(rows, subtotal)} data-cursor="">
                Send pack list to sales <ArrowRight size={15} />
              </button>
              <p className="drawer-note">No card needed — this drops your list into the contact form below for a real quote.</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* =========================================================================
   SCROLL TO TOP
   ========================================================================= */

function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.button className="scroll-top" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="scroll to top" data-cursor="">
          <ChevronUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/* =========================================================================
   CONTACT / FOOTER
   ========================================================================= */

function ContactFooter({ prefill, onSuccess }) {
  const [values, setValues] = useState({ name: "", email: "", need: "" });
  const [sent, setSent] = useState(false);
  useEffect(() => { if (prefill) setValues((v) => ({ ...v, need: prefill })); }, [prefill]);

  const handleSubmit = () => {
    if (sent) return;
    setSent(true);
    if (onSuccess) onSuccess();
    setTimeout(() => {
      setValues({ name: "", email: "", need: "" });
      setSent(false);
    }, 1800);
  };

  return (
    <section className="contact" id="contact">
      <div className="section-head light reveal">
        <span className="eyebrow">Start a run</span>
        <h2>Tell us what's going in the box</h2>
      </div>
      <div className="contact-grid reveal">
        <div className="contact-fields">
          <label>Name<input type="text" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} placeholder="Your name" /></label>
          <label>Email<input type="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} placeholder="you@company.com" /></label>
          <label>What are we packing?<textarea rows={5} value={values.need} onChange={(e) => setValues((v) => ({ ...v, need: e.target.value }))} placeholder="Bottle box for 500ml glass jars, 2,000 units/month..." /></label>
          <button className="contact-submit" onClick={handleSubmit} disabled={sent} data-cursor="">
            {sent ? "Request logged ✓" : "Request a sample"}
          </button>
        </div>
        <div className="contact-stamp">
          <IconStampRing color="#F3E7D8" label="VERTEX PACKAGING CO. · EST." />
          <p className="contact-tracking">TRACKING · VX-2026-0703</p>
        </div>
      </div>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Vertex Packaging Co.</span>
        <span>Bottle Box · Overnight · Export Crate</span>
      </footer>
    </section>
  );
}

/* =========================================================================
   APP
   ========================================================================= */

export default function App() {
  const [cartOpen, setCartOpen] = useState(false);
  const [activeLine, setActiveLine] = useState("all");
  const [prefill, setPrefill] = useState("");
  const cartCount = useCart((s) => Object.values(s.items).reduce((a, b) => a + b, 0));
  const clearCart = useCart((s) => s.clear);
  useScrollReveal();

  const handleShopLine = (lineId) => {
    setActiveLine(lineId);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };
  const handleSendToSales = (rows, subtotal) => {
    const summary = rows.map((r) => `${r.qty} × ${r.product.name} ($${(r.product.price * r.qty).toFixed(2)})`).join("\n") + `\n\nEstimated subtotal: $${subtotal.toFixed(2)}`;
    setPrefill(summary);
    setCartOpen(false);
    setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 250);
  };

  return (
    <div className="vx-app">
      <CustomCursor />
      <Navbar cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      <Hero onShopLine={handleShopLine} />
      <MarkStrip />
      <Shop activeLine={activeLine} setActiveLine={setActiveLine} />
      <ProcessSlideshow />
      <ThreeBox />
      <WhyVertex />
      <Testimonials />
      <ContactFooter prefill={prefill} onSuccess={clearCart} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onSendToSales={handleSendToSales} />
      <ScrollTop />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

        :root{
          --ink:#17130D; --kraft:#C9A66B; --kraft-dark:#7C5A34; --crate:#241C13; --cream:#F4ECDD;
          --tape:#C1531C; --stamp:#3F5741; --stamp-deep:#26332A; --glass:rgba(244,236,221,0.62);
        }
        *{ box-sizing:border-box; cursor:none; }
        @media (pointer:coarse){ *{ cursor:auto; } }
        .vx-app{ font-family:'Inter', sans-serif; color:var(--ink); background:var(--cream); overflow-x:hidden; position:relative;
          background-image: radial-gradient(rgba(90,60,30,0.09) 1px, transparent 1px); background-size:22px 22px; }
        h1,h2,h3{ font-family:'Bricolage Grotesque', sans-serif; margin:0; }
        .eyebrow{ display:inline-block; font-family:'JetBrains Mono', monospace; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--stamp); margin-bottom:10px; }
        .section-head{ max-width:1180px; margin:0 auto; padding:74px 40px 30px; display:flex; align-items:center; gap:26px; position:relative; z-index:1; }
        .section-head.light{ color:var(--cream); }
        .section-head.light .eyebrow{ color:var(--tape); }
        .section-head h2{ font-size:clamp(26px,3.6vw,38px); line-height:1.15; font-weight:700; }
        .three-copy{ font-size:14px; opacity:0.75; max-width:460px; margin-top:8px; }
        .img-fallback{ display:flex; align-items:center; justify-content:center; width:100%; height:100%; background:linear-gradient(150deg,#d8bd8b,#b28a52); color:#4a341c; }
        .reveal{ opacity:0; transform:translateY(26px); transition:opacity 0.7s cubic-bezier(.2,.7,.2,1), transform 0.7s cubic-bezier(.2,.7,.2,1); }
        .reveal.in-view{ opacity:1; transform:none; }
        @media (prefers-reduced-motion:reduce){ .reveal{opacity:1; transform:none; transition:none;} }

        /* ---------------- custom cursor ---------------- */
        .cur-wrap{ position:fixed; inset:0; pointer-events:none; z-index:999; }
        .cur-dot{ position:fixed; top:0; left:0; width:6px; height:6px; margin:-3px; border-radius:50%; background:var(--tape); }
        .cur-ring{ position:fixed; top:0; left:0; width:34px; height:34px; margin:-17px; border-radius:50%; border:1.4px solid rgba(23,19,13,0.5); display:flex; align-items:center; justify-content:center; transition:width 0.25s ease, height 0.25s ease, margin 0.25s ease, background 0.25s ease, border-color .25s ease; }
        .cur-ring.cur-active{ width:74px; height:74px; margin:-37px; background:rgba(23,19,13,0.82); border-color:transparent; }
        .cur-label{ font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:1.5px; color:var(--cream); text-transform:uppercase; opacity:0; transition:opacity .2s ease; }
        .cur-ring.cur-active .cur-label{ opacity:1; }

        /* ---------------- margin notes (fills side gutters) ---------------- */
        .margin-note{ position:absolute; top:110px; bottom:70px; width:40px; display:none; align-items:center; justify-content:center; z-index:0; opacity:0.5; }
        .margin-left{ left:14px; } .margin-right{ right:14px; }
        .margin-text{ writing-mode:vertical-rl; font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:3px; white-space:nowrap; }
        .margin-code{ position:absolute; bottom:0; writing-mode:vertical-rl; font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:1px; opacity:0.7; }
        @media (min-width:1280px){ .margin-note{ display:flex; } }

        /* ---------------- navbar ---------------- */
        .nav{ position:fixed; top:16px; left:0; right:0; z-index:60; display:flex; justify-content:center; padding:0 16px; }
        .nav-inner{ width:100%; max-width:760px; display:flex; align-items:center; justify-content:space-between; gap:18px; background:rgba(244,236,221,0.72); backdrop-filter:blur(16px) saturate(1.3); border:1px solid rgba(23,19,13,0.08); border-radius:999px; padding:9px 10px 9px 18px; box-shadow:0 8px 30px rgba(23,19,13,0.08); transition:background .3s ease, box-shadow .3s ease; }
        .nav-scrolled .nav-inner{ background:rgba(244,236,221,0.92); box-shadow:0 12px 34px rgba(23,19,13,0.16); }
        .nav-brand{ display:flex; align-items:center; gap:8px; font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:600; letter-spacing:2px; color:var(--ink); text-decoration:none; }
        .nav-brand-mark{ width:26px; height:26px; border-radius:50%; background:var(--stamp); color:var(--cream); display:flex; align-items:center; justify-content:center; }
        .nav-links{ display:flex; gap:22px; }
        .nav-links a{ font-size:13px; color:var(--ink); text-decoration:none; opacity:0.75; transition:opacity .2s ease; }
        .nav-links a:hover{ opacity:1; }
        .nav-actions{ display:flex; align-items:center; gap:6px; }
        .nav-cart{ position:relative; width:36px; height:36px; border-radius:50%; border:none; background:var(--ink); color:var(--cream); display:flex; align-items:center; justify-content:center; cursor:pointer; }
        .nav-cart-badge{ position:absolute; top:-4px; right:-4px; background:var(--tape); color:#fff; font-size:10px; font-weight:700; width:17px; height:17px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono',monospace; }
        .nav-burger{ display:none; width:36px; height:36px; border-radius:50%; border:none; background:transparent; color:var(--ink); align-items:center; justify-content:center; cursor:pointer; }
        .nav-mobile{ overflow:hidden; max-width:760px; margin:8px auto 0; background:rgba(244,236,221,0.95); backdrop-filter:blur(16px); border-radius:20px; display:flex; flex-direction:column; }
        .nav-mobile a{ padding:12px 20px; font-size:14px; color:var(--ink); text-decoration:none; border-top:1px solid rgba(23,19,13,0.08); }
        @media (max-width:760px){ .nav-links{ display:none; } .nav-burger{ display:flex; } }

        /* ---------------- Hero ---------------- */
        .ph-stage{ position:relative; width:100%; height:min(92vh, 660px); overflow:hidden; }
        .ph-cover{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:3; transition:opacity 0.6s ease, transform 0.6s ease, visibility 0.6s; }
        .ph-cover-img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:saturate(0.85) brightness(0.5); }
        .ph-cover-tint{ position:absolute; inset:0; background:linear-gradient(160deg, rgba(70,45,25,0.72) 0%, rgba(20,15,10,0.8) 60%, rgba(15,11,8,0.92) 100%); }
        .ph-grain{ position:absolute; inset:0; opacity:0.05; background-image:radial-gradient(#fff 1px, transparent 1px); background-size:3px 3px; mix-blend-mode:overlay; }
        .ph-cover-content{ position:relative; z-index:2; text-align:center; color:var(--cream); padding:0 24px; }
        .ph-eyebrow{ display:block; font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:4px; opacity:0.9; margin-bottom:16px; }
        .ph-cover-content h1{ font-size:clamp(34px,7vw,62px); font-weight:800; line-height:1.02; letter-spacing:-1px; }
        .ph-cover-tag{ margin:18px 0 32px; font-size:14.5px; font-style:italic; opacity:0.85; max-width:460px; margin-left:auto; margin-right:auto; }
        .ph-explore{ border:none; padding:14px 30px; border-radius:999px; background:var(--cream); color:var(--ink); font-weight:600; font-size:14px; cursor:none; display:inline-flex; align-items:center; gap:8px; transition:transform 0.25s ease, box-shadow 0.25s ease; }
        .ph-explore:hover{ transform:translateY(-2px); box-shadow:0 12px 26px rgba(0,0,0,0.35); }
        .ph-arrow{ transition:transform 0.25s ease; }
        .ph-explore:hover .ph-arrow{ transform:translateX(4px); }
        .ph-dot{ position:absolute; bottom:26px; left:50%; transform:translateX(-50%); width:8px; height:8px; border-radius:50%; background:var(--cream); opacity:0.6; z-index:2; animation:ph-pulse 1.8s ease-in-out infinite; }
        @keyframes ph-pulse{ 0%,100%{opacity:.35; transform:translateX(-50%) scale(1);} 50%{opacity:.9; transform:translateX(-50%) scale(1.4);} }
        .ph-stage.ph-split .ph-cover{ opacity:0; transform:scale(0.96); visibility:hidden; pointer-events:none; }

        .ph-hero{ position:absolute; inset:0; display:flex; z-index:1; opacity:0; visibility:hidden; transition:opacity 0.6s ease 0.15s, visibility 0.6s ease 0.15s; }
        .ph-stage.ph-split .ph-hero{ opacity:1; visibility:visible; z-index:4; }
        .ph-back{ position:absolute; top:18px; left:18px; z-index:6; width:38px; height:38px; border-radius:50%; border:none; background:rgba(0,0,0,0.35); color:var(--cream); font-size:16px; cursor:none; display:flex; align-items:center; justify-content:center; opacity:0; transform:translateX(-8px); transition:opacity 0.3s ease 0.3s, transform 0.3s ease 0.3s, background 0.2s ease; }
        .ph-stage.ph-split .ph-back{ opacity:1; transform:translateX(0); }
        .ph-back:hover{ background:rgba(0,0,0,0.55); }

        .ph-panel{ position:relative; flex:1; cursor:none; transition:flex 0.6s cubic-bezier(.4,0,.2,1); display:flex; align-items:flex-end; justify-content:center; overflow:hidden; }
        .ph-panel-img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scale(1.08); transition:transform 1.2s ease; filter:saturate(0.9); }
        .ph-panel.ph-active .ph-panel-img{ transform:scale(1); }
        .ph-panel-tint{ position:absolute; inset:0; background:linear-gradient(0deg, rgba(15,11,8,0.88) 0%, rgba(15,11,8,0.42) 45%, color-mix(in srgb, var(--ph-accent) 44%, #1c140d) 100%); transition:background .5s ease; }
        .ph-letter{ position:relative; z-index:2; color:var(--cream); font-size:52px; font-weight:700; transition:opacity 0.35s ease; font-family:'Bricolage Grotesque',sans-serif; margin-bottom:26px; opacity:0.85; }
        .ph-panel.ph-active .ph-letter{ opacity:0; pointer-events:none; position:absolute; }
        .ph-content{ position:relative; z-index:2; display:flex; flex-direction:column; align-items:flex-start; color:var(--cream); opacity:0; transform:translateY(16px); transition:opacity 0.4s ease 0.15s, transform 0.4s ease 0.15s; pointer-events:none; padding:0 30px 42px; text-align:left; width:100%; }
        .ph-panel.ph-active .ph-content{ opacity:1; transform:translateY(0); pointer-events:auto; }
        .ph-content .ph-brand{ font-size:11px; letter-spacing:3px; opacity:0.85; font-family:'JetBrains Mono',monospace; margin-bottom:14px; }
        .ph-icon-badge{ width:52px; height:52px; border-radius:14px; background:var(--ph-accent); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 20px rgba(0,0,0,0.35); margin-bottom:16px; }
        .ph-content h2{ margin:0; font-size:clamp(24px,3vw,34px); font-weight:700; letter-spacing:0.5px; }
        .ph-tag{ margin:6px 0 0; font-size:13.5px; font-style:italic; opacity:0.85; }
        .ph-cta{ margin-top:20px; border:none; padding:10px 20px; border-radius:999px; background:var(--cream); color:var(--ink); font-weight:600; font-size:13px; cursor:none; display:inline-flex; align-items:center; gap:5px; transition:transform .2s ease; }
        .ph-cta:hover{ transform:translateY(-2px); }

        /* ---------------- Mark strip ---------------- */
        .mark-strip{ background:var(--ink); color:var(--cream); overflow:hidden; padding:11px 0; }
        .mark-track{ display:flex; gap:24px; width:max-content; animation:mark-scroll 22s linear infinite; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:2px; }
        .mark-track span{ display:flex; gap:24px; opacity:0.8; }
        .mark-track i{ color:var(--tape); font-style:normal; }
        @keyframes mark-scroll{ from{transform:translateX(0)} to{transform:translateX(-50%)} }

        /* ---------------- Shop ---------------- */
        .shop{ padding-bottom:20px; position:relative; }
        .shop-tabs{ max-width:1180px; margin:0 auto; padding:0 40px 26px; display:flex; gap:10px; flex-wrap:wrap; }
        .shop-tab{ border:1px solid rgba(90,60,30,0.22); background:rgba(255,248,236,0.7); backdrop-filter:blur(6px); border-radius:999px; padding:9px 16px; font-size:13px; font-weight:600; cursor:none; display:inline-flex; align-items:center; gap:8px; color:var(--ink); transition:transform .2s ease, box-shadow .2s ease; }
        .shop-tab:hover{ transform:translateY(-2px); }
        .shop-tab svg{ width:16px; height:16px; }
        .shop-tab-active{ background:var(--tab-accent, var(--ink)); color:#fff; border-color:transparent; }
        .product-grid{ max-width:1180px; margin:0 auto; padding:0 40px; display:grid; grid-template-columns:repeat(auto-fit,minmax(255px,1fr)); gap:22px; }
        .product-card{ background:rgba(255,248,236,0.72); backdrop-filter:blur(10px); border:1px solid rgba(90,60,30,0.14); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; cursor:none; transition:transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease, border-color .35s ease; }
        .product-card:hover{ transform:translateY(-8px); box-shadow:0 22px 40px rgba(23,19,13,0.18); border-color:rgba(90,60,30,0.3); }
        .product-media{ position:relative; aspect-ratio:4/3; background:#e6d4b0; overflow:hidden; }
        .product-img{ width:100%; height:100%; object-fit:cover; display:block; transition:transform .5s ease; }
        .product-card:hover .product-img{ transform:scale(1.07); }
        .product-line-tag{ position:absolute; top:10px; left:10px; background:var(--tag-accent); color:#fff; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; padding:4px 9px; border-radius:999px; }
        .stamp-pop{ position:absolute; bottom:10px; right:10px; background:var(--stamp); color:#fff; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; padding:5px 9px; border-radius:6px; border:1px dashed rgba(255,255,255,0.6); display:inline-flex; align-items:center; gap:4px; }
        .product-body{ padding:16px 18px 18px; display:flex; flex-direction:column; gap:8px; flex:1; }
        .product-body h3{ font-size:16px; font-weight:700; }
        .product-spec{ font-size:12.5px; opacity:0.75; margin:0; line-height:1.5; flex:1; }
        .product-row{ display:flex; align-items:center; justify-content:space-between; margin-top:6px; }
        .product-price{ font-family:'JetBrains Mono',monospace; font-weight:600; font-size:14px; }
        .product-price i{ font-style:normal; font-size:11px; opacity:0.6; }
        .product-add{ border:none; background:var(--ink); color:var(--cream); padding:8px 14px; border-radius:999px; font-size:12.5px; font-weight:600; cursor:none; display:inline-flex; align-items:center; gap:5px; transition:transform .2s ease; }
        .product-add:hover{ transform:translateY(-2px); }
        .qty-stepper{ display:flex; align-items:center; gap:10px; background:#eddcc0; border-radius:999px; padding:5px 10px; }
        .qty-stepper button{ border:none; background:var(--ink); color:var(--cream); width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:none; }
        .qty-stepper span{ font-family:'JetBrains Mono',monospace; font-size:13px; min-width:14px; text-align:center; }

        /* ---------------- Process slideshow ---------------- */
        .process{ background:var(--crate); color:var(--cream); position:relative; }
        .slideshow{ max-width:780px; margin:0 auto; padding:10px 40px 30px; display:flex; align-items:center; gap:18px; }
        .slide-arrow{ background:rgba(243,231,216,0.08); border:1px solid rgba(243,231,216,0.35); color:var(--cream); width:38px; height:38px; border-radius:50%; cursor:none; flex:none; transition:background .2s ease; }
        .slide-arrow:hover{ background:rgba(243,231,216,0.18); }
        .slide-viewport{ position:relative; flex:1; min-height:150px; }
        .slide{ position:absolute; inset:0; opacity:0; transform:translateX(16px); transition:opacity 0.45s ease, transform 0.45s ease; pointer-events:none; }
        .slide-active{ opacity:1; transform:translateX(0); pointer-events:auto; }
        .slide-tag{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:3px; color:var(--tape); }
        .slide h3{ font-size:24px; margin:10px 0 8px; font-weight:700; }
        .slide p{ font-size:14px; line-height:1.6; opacity:0.85; max-width:540px; }
        .slide-dots{ display:flex; justify-content:center; gap:8px; padding-bottom:56px; }
        .dot{ width:8px; height:8px; border-radius:50%; border:none; background:rgba(243,231,216,0.3); cursor:none; }
        .dot-active{ background:var(--tape); width:22px; border-radius:4px; }

        /* ---------------- Three.js box ---------------- */
        .three-section{ background:#fff8ec; position:relative; }
        .three-stage{ max-width:780px; height:440px; margin:0 auto 76px; border-radius:24px; background:radial-gradient(ellipse at 50% 30%, #f3e2be 0%, #e2cba3 55%, #d3b98b 100%); position:relative; cursor:none; overflow:hidden; box-shadow:inset 0 0 60px rgba(90,60,30,0.12); }
        .three-stage::before{ content:""; position:absolute; inset:0; background-image:radial-gradient(rgba(90,60,30,0.06) 1px, transparent 1px); background-size:16px 16px; pointer-events:none; }
        .three-hint{ position:absolute; bottom:16px; left:50%; transform:translateX(-50%); font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:1.5px; color:var(--kraft-dark); opacity:0.7; pointer-events:none; }

        /* ---------------- Why Vertex ---------------- */
        .why{ padding-bottom:20px; }
        .manifest{ max-width:780px; margin:0 auto; padding:0 40px 60px; }
        .manifest-row{ display:flex; align-items:baseline; gap:16px; padding:16px 0; border-bottom:1px dashed rgba(90,60,30,0.25); }
        .manifest-num{ font-family:'Bricolage Grotesque',sans-serif; font-size:27px; font-weight:700; color:var(--stamp); min-width:92px; }
        .manifest-rule{ flex:1; }
        .manifest-label{ font-size:13px; text-align:right; opacity:0.8; max-width:280px; }

        /* ---------------- Testimonials / dock ---------------- */
        .dock{ position:relative; background:var(--stamp-deep); color:var(--cream); overflow:hidden; }
        .dock-texture{ position:absolute; inset:0; opacity:0.14; }
        .dock-texture img{ width:100%; height:100%; object-fit:cover; }
        .dock-grid{ position:relative; max-width:1180px; margin:0 auto; padding:0 40px 70px; display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px; }
        .dock-card{ background:rgba(244,236,221,0.07); border:1px solid rgba(244,236,221,0.18); border-radius:18px; padding:24px; display:flex; flex-direction:column; gap:18px; backdrop-filter:blur(6px); transition:transform .3s ease, background .3s ease; }
        .dock-card:hover{ transform:translateY(-6px); background:rgba(244,236,221,0.11); }
        .dock-quote{ font-size:14px; line-height:1.65; font-style:italic; opacity:0.92; margin:0; }
        .dock-person{ display:flex; align-items:center; gap:12px; }
        .dock-avatar{ width:38px; height:38px; border-radius:50%; background:var(--tape); color:#fff; display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono',monospace; font-size:12px; font-weight:700; flex:none; }
        .dock-person div{ display:flex; flex-direction:column; }
        .dock-person strong{ font-size:13.5px; }
        .dock-person span{ font-size:11.5px; opacity:0.7; }

        /* ---------------- Cart drawer ---------------- */
        .drawer-scrim{ position:fixed; inset:0; background:rgba(15,11,8,0.55); backdrop-filter:blur(2px); z-index:90; }
        .drawer{ position:fixed; top:0; right:0; bottom:0; width:min(410px, 100vw); background:rgba(244,236,221,0.96); backdrop-filter:blur(14px); z-index:91; display:flex; flex-direction:column; box-shadow:-14px 0 40px rgba(0,0,0,0.3); }
        .drawer-perf{ height:10px; background-image:radial-gradient(circle at 7px 5px, var(--stamp-deep) 4px, transparent 4.2px); background-size:16px 10px; background-color:var(--ink); }
        .drawer-head{ position:relative; padding:18px 22px 12px; background:var(--ink); color:var(--cream); }
        .drawer-eyebrow{ font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:3px; color:var(--tape); }
        .drawer-head h3{ font-size:20px; margin-top:4px; font-weight:700; }
        .drawer-close{ position:absolute; top:16px; right:18px; background:rgba(244,236,221,0.12); border:none; color:var(--cream); width:30px; height:30px; border-radius:50%; cursor:none; display:flex; align-items:center; justify-content:center; }
        .drawer-empty{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; opacity:0.6; padding:24px; text-align:center; }
        .drawer-items{ flex:1; overflow-y:auto; padding:14px 18px; display:flex; flex-direction:column; gap:12px; }
        .drawer-item{ display:flex; gap:12px; background:rgba(255,248,236,0.8); border-radius:12px; padding:10px; border:1px solid rgba(90,60,30,0.12); }
        .drawer-item-img{ width:60px; height:60px; border-radius:8px; object-fit:cover; flex:none; }
        .drawer-item-body{ display:flex; flex-direction:column; gap:6px; justify-content:center; }
        .drawer-item-body strong{ font-size:13px; }
        .drawer-item-body span{ font-size:11.5px; opacity:0.65; font-family:'JetBrains Mono',monospace; }
        .drawer-foot{ border-top:1px dashed rgba(90,60,30,0.3); padding:16px 20px 22px; }
        .drawer-subtotal{ display:flex; justify-content:space-between; align-items:center; font-family:'JetBrains Mono',monospace; margin-bottom:12px; font-size:14px; }
        .drawer-submit{ width:100%; border:none; background:var(--stamp); color:#fff; padding:13px; border-radius:999px; font-weight:700; font-size:14px; cursor:none; display:flex; align-items:center; justify-content:center; gap:8px; transition:transform .2s ease; }
        .drawer-submit:hover:not(:disabled){ transform:translateY(-2px); }
        .drawer-submit:disabled{ opacity:0.5; cursor:default; }
        .drawer-note{ font-size:11px; opacity:0.6; text-align:center; margin:10px 0 0; }

        /* ---------------- Scroll to top ---------------- */
        .scroll-top{ position:fixed; bottom:26px; right:26px; z-index:70; width:46px; height:46px; border-radius:50%; border:1px solid rgba(23,19,13,0.12); background:rgba(244,236,221,0.85); backdrop-filter:blur(12px); color:var(--ink); display:flex; align-items:center; justify-content:center; cursor:none; box-shadow:0 10px 26px rgba(23,19,13,0.18); }

        /* ---------------- Contact / footer ---------------- */
        .contact{ background:var(--ink); color:var(--cream); }
        .contact-grid{ max-width:1000px; margin:0 auto; padding:0 40px 50px; display:grid; grid-template-columns:1.3fr 1fr; gap:40px; }
        .contact-fields{ display:flex; flex-direction:column; gap:16px; }
        .contact-fields label{ display:flex; flex-direction:column; gap:6px; font-size:12px; letter-spacing:1px; font-family:'JetBrains Mono',monospace; opacity:0.8; }
        .contact-fields input, .contact-fields textarea{ background:rgba(243,231,216,0.06); border:1px solid rgba(243,231,216,0.2); border-radius:8px; color:var(--cream); padding:10px 12px; font-family:'Inter',sans-serif; font-size:14px; resize:none; }
        .contact-fields input:focus, .contact-fields textarea:focus{ outline:2px solid var(--tape); border-color:transparent; }
        .contact-submit{ margin-top:6px; align-self:flex-start; border:none; padding:12px 26px; border-radius:999px; background:var(--tape); color:#fff; font-weight:700; font-size:14px; cursor:none; transition:transform .2s ease; }
        .contact-submit:hover:not(:disabled){ transform:translateY(-2px); }
        .contact-submit:disabled{ opacity:0.7; cursor:default; }
        .contact-stamp{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; opacity:0.85; }
        .contact-tracking{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:2px; }
        .site-footer{ max-width:1000px; margin:0 auto; padding:20px 40px 30px; display:flex; justify-content:space-between; font-size:12px; opacity:0.6; border-top:1px solid rgba(243,231,216,0.12); flex-wrap:wrap; gap:6px; }

        /* ---------------- Responsive ---------------- */
        @media (max-width:900px){ .contact-grid{ grid-template-columns:1fr; } }
        @media (max-width:640px){
          .product-grid{ grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); padding:0 20px; }
          .section-head{ padding:60px 20px 24px; }
          .ph-stage{ height:auto; min-height:580px; }
          .ph-hero{ flex-direction:column; }
          .ph-panel{ flex:none !important; min-height:76px; align-items:center; }
          .ph-panel.ph-active{ min-height:360px; align-items:flex-end; }
          .ph-letter{ font-size:26px; position:absolute; left:20px; margin-bottom:0; }
          .ph-panel.ph-active .ph-letter{ display:none; }
          .ph-cover-content h1{ font-size:30px; }
          .three-stage{ height:320px; margin-bottom:50px; }
          .drawer{ width:100vw; }
          .shop-tabs, .slideshow, .manifest, .dock-grid, .contact-grid, .site-footer{ padding-left:20px; padding-right:20px; }
          .cur-wrap{ display:none; }
          *{ cursor:auto; }
        }
        @media (prefers-reduced-motion: reduce){ .ph-panel-img, .mark-track{ animation:none; transition:none; } }
      `}</style>
    </div>
  );
}
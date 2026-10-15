"use client";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Eye,
  GripVertical,
  ImagePlus,
  LayoutTemplate,
  Menu,
  Save,
  Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
type Block = { id: string; label: string; kind: string; visible: boolean };
type Hero = {
  headline: string;
  supporting: string;
  dates: string;
  image: string;
};
const initialBlocks: Block[] = [
  { id: "hero", label: "Career Fair hero", kind: "Hero", visible: true },
  { id: "stats", label: "Fair at a glance", kind: "Stats", visible: true },
  { id: "dates", label: "Fair schedule", kind: "Events", visible: true },
  { id: "students", label: "Student information", kind: "Tabs", visible: true },
  {
    id: "recruiters",
    label: "Recruiter information",
    kind: "Tabs",
    visible: true,
  },
  { id: "team", label: "Meet the team", kind: "People", visible: true },
  { id: "contact", label: "Contact us", kind: "Contact", visible: true },
];
const teamAssets = [
  "Nathan Lam",
  "Raul Lozano",
  "Sofia Irahola",
  "Nayeon Lee",
  "Nikhila Manikandan",
  "Cathy Molyneux",
];
export default function Admin() {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selected, setSelected] = useState("hero");
  const [panel, setPanel] = useState<
    "pages" | "navigation" | "media" | "styles"
  >("pages");
  const [saved, setSaved] = useState(false);
  const [hero, setHero] = useState<Hero>({
    headline: "SEC Engineering Career Fair",
    supporting: "Where Aggie engineers meet what’s next.",
    dates: "September 9–10, 2026",
    image: "",
  });
  const [images, setImages] = useState<Record<string, string>>({});
  const frameRef = useRef<HTMLIFrameElement>(null);
  const blocksRef = useRef(blocks);
  const heroRef = useRef(hero);
  const imagesRef = useRef(images);
  const updateBlocks = (next: Block[]) => {
    blocksRef.current = next;
    setBlocks(next);
  };
  const updateHero = (update: Partial<Hero>) => {
    const next = { ...heroRef.current, ...update };
    heroRef.current = next;
    setHero(next);
  };
  const updateImages = (update: Record<string, string>) => {
    const next = { ...imagesRef.current, ...update };
    imagesRef.current = next;
    setImages(next);
  };
  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((config) => {
        if (!config) return;
        const definitions = new Map(
          initialBlocks.map((block) => [block.id, block]),
        );
        const ordered: Block[] = (
          Array.isArray(config.layout) ? config.layout : []
        ).flatMap((item: { id?: string; visible?: boolean }) => {
          const definition = definitions.get(item.id ?? "");
          return definition
            ? [{ ...definition, visible: item.visible !== false }]
            : [];
        });
        const included = new Set(ordered.map((block) => block.id));
        updateBlocks([
          ...ordered,
          ...initialBlocks.filter((block) => !included.has(block.id)),
        ]);
        updateHero(config.hero ?? {});
        updateImages(config.images ?? {});
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    doc
      .querySelectorAll<HTMLElement>("[data-studio-section]")
      .forEach((element) =>
        element.classList.toggle(
          "studio-selected",
          element.dataset.studioSection === selected,
        ),
      );
  }, [selected]);
  const sendDraft = () =>
    frameRef.current?.contentWindow?.postMessage(
      { type: "site-studio-draft", config: { layout: blocks, hero, images } },
      window.location.origin,
    );
  const bindCanvas = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    doc.querySelectorAll<HTMLElement>("section").forEach((section) => {
      const id = section.id === "top" ? "hero" : section.id;
      if (!initialBlocks.some((block) => block.id === id)) return;
      section.dataset.studioSection = id;
      section.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSelected(id);
      };
    });
    sendDraft();
  };
  useEffect(() => {
    sendDraft();
  }, [blocks, hero, images]);
  useEffect(() => {
    const connectCanvas = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.data?.type === "site-studio-ready"
      )
        bindCanvas();
    };
    window.addEventListener("message", connectCanvas);
    return () => window.removeEventListener("message", connectCanvas);
  }, []);
  const move = (index: number, delta: number) => {
    const next = [...blocksRef.current];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateBlocks(next);
  };
  const upload = (key: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      key === "hero"
        ? updateHero({ image: String(reader.result) })
        : updateImages({ [key]: String(reader.result) });
    reader.readAsDataURL(file);
  };
  const save = async () => {
    const current = heroRef.current;
    const safeHero = {
      headline: current.headline.trim() || "SEC Engineering Career Fair",
      supporting:
        current.supporting.trim() || "Where Aggie engineers meet what’s next.",
      dates: current.dates.trim() || "September 9–10, 2026",
      image: current.image,
    };
    const response = await fetch("/api/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layout: blocksRef.current.map(({ id, visible }) => ({ id, visible })),
        hero: safeHero,
        images: imagesRef.current,
      }),
    });
    if (!response.ok) return;
    heroRef.current = safeHero;
    setHero(safeHero);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const selectedBlock =
    blocks.find((block) => block.id === selected) ?? initialBlocks[0];
  const assetRows = teamAssets.map((name, index) => (
    <label className="asset-row" key={name}>
      <span>{name}</span>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => upload(`team-${index}`, event.target.files?.[0])}
      />
      <ImagePlus />
    </label>
  ));
  return (
    <div className="studio">
      <aside className="studio-sidebar">
        <Link href="/" className="studio-logo">
          SEC <span>site studio</span>
        </Link>
        <button className="site-switcher">
          Engineering Career Fair <ChevronDown />
        </button>
        <div className="studio-nav">
          <p>CONTENT</p>
          <button
            className={panel === "pages" ? "selected" : ""}
            onClick={() => setPanel("pages")}
          >
            <LayoutTemplate /> Pages
          </button>
          <button
            className={panel === "navigation" ? "selected" : ""}
            onClick={() => setPanel("navigation")}
          >
            <Menu /> Navigation
          </button>
          <button
            className={panel === "media" ? "selected" : ""}
            onClick={() => setPanel("media")}
          >
            <ImagePlus /> Media library
          </button>
          <p>SETTINGS</p>
          <button
            className={panel === "styles" ? "selected" : ""}
            onClick={() => setPanel("styles")}
          >
            <Type /> Site styles
          </button>
        </div>
        <div className="studio-user">
          <span>CF</span>
          <div>
            <strong>Career Fair Admin</strong>
            <small>Administrator</small>
          </div>
        </div>
      </aside>
      <section className="studio-workspace">
        <header className="studio-header">
          <div>
            <p>{panel.toUpperCase()}</p>
            <h1>
              {panel === "pages"
                ? "Visual editor"
                : panel === "media"
                  ? "Media library"
                  : panel === "styles"
                    ? "Site styles"
                    : "Navigation"}{" "}
              <span>● Live draft</span>
            </h1>
          </div>
          <div className="studio-actions">
            <Link href="/" target="_blank">
              <Eye /> Open site
            </Link>
            <button onClick={save} className="save">
              {saved ? <Check /> : <Save />}
              {saved ? "Saved" : "Save changes"}
            </button>
          </div>
        </header>
        {panel === "pages" && (
          <div className="visual-editor">
            <aside className="section-rail">
              <div className="panel-title">
                <div>
                  <h2>Sections</h2>
                  <p>Drag, hide, or select a section.</p>
                </div>
              </div>
              <div className="blocks">
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={`block ${selected === block.id ? "active" : ""}`}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("source", String(index))
                    }
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const from = Number(event.dataTransfer.getData("source"));
                      if (Number.isNaN(from) || from === index) return;
                      const next = [...blocksRef.current];
                      const [item] = next.splice(from, 1);
                      next.splice(index, 0, item);
                      updateBlocks(next);
                    }}
                    onClick={() => setSelected(block.id)}
                  >
                    <GripVertical />
                    <div>
                      <strong>{block.label}</strong>
                      <small>{block.kind}</small>
                    </div>
                    <div className="block-controls">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          move(index, -1);
                        }}
                        aria-label={`Move ${block.label} up`}
                      >
                        ↑
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          move(index, 1);
                        }}
                        aria-label={`Move ${block.label} down`}
                      >
                        ↓
                      </button>
                      <label
                        className="toggle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={block.visible}
                          onChange={() =>
                            updateBlocks(
                              blocksRef.current.map((item) =>
                                item.id === block.id
                                  ? { ...item, visible: !item.visible }
                                  : item,
                              ),
                            )
                          }
                        />
                        <i />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            <main className="canvas-panel">
              <div className="canvas-toolbar">
                <span>Click a section in the page to edit it</span>
                <span>Draft preview</span>
              </div>
              <div className="site-canvas">
                <iframe
                  ref={frameRef}
                  title="Live website preview"
                  src="/?studio-preview=1"
                />
              </div>
            </main>
            <aside className="edit-inspector">
              <p className="inspector-label">Editing</p>
              <h2>{selectedBlock.label}</h2>
              {selected === "hero" ? (
                <>
                  <label>
                    Headline
                    <input
                      value={hero.headline}
                      onChange={(event) =>
                        updateHero({ headline: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Supporting text
                    <textarea
                      value={hero.supporting}
                      onChange={(event) =>
                        updateHero({ supporting: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Event dates
                    <input
                      value={hero.dates}
                      onChange={(event) =>
                        updateHero({ dates: event.target.value })
                      }
                    />
                  </label>
                  <label className="upload">
                    Hero photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        upload("hero", event.target.files?.[0])
                      }
                    />
                    <ImagePlus />
                    <span>Replace image</span>
                  </label>
                </>
              ) : selected === "team" ? (
                <>
                  <p className="field-note">
                    Replace each portrait here. The carousel updates after you
                    save.
                  </p>
                  <div className="asset-list">{assetRows}</div>
                </>
              ) : (
                <>
                  <p className="field-note inspector-note">
                    This section is selected on the canvas. Drag it in the left
                    rail or use its visibility switch. Detailed copy remains
                    structured in the public content model.
                  </p>
                  <button
                    className="wide-button"
                    onClick={() => setSelected("hero")}
                  >
                    Edit hero copy
                  </button>
                </>
              )}
            </aside>
          </div>
        )}
        {panel === "media" && (
          <div className="utility-panel">
            <h2>Media library</h2>
            <p>
              Replace the hero or any team portrait from one place. Changes stay
              in the current draft until saved.
            </p>
            <label className="upload media-upload">
              Hero photo
              <input
                type="file"
                accept="image/*"
                onChange={(event) => upload("hero", event.target.files?.[0])}
              />
              <ImagePlus />
              <span>Choose hero image</span>
            </label>
            <div className="asset-list media-assets">{assetRows}</div>
          </div>
        )}
        {panel === "navigation" && (
          <div className="utility-panel">
            <h2>Primary navigation</h2>
            <p>
              Header navigation mirrors the public page and stays intentionally
              fixed while section anchors are editable in the visual editor.
            </p>
          </div>
        )}
        {panel === "styles" && (
          <div className="utility-panel">
            <h2>Site styles</h2>
            <p>
              Brand colors are locked to preserve Texas A&amp;M and SEC
              identity.
            </p>
            <div className="swatches">
              <span style={{ background: "#500000" }}>Maroon</span>
              <span style={{ background: "#e7d7c2" }}>Warm sand</span>
              <span style={{ background: "#f5f1e8", color: "#241b18" }}>
                Cream
              </span>
              <span style={{ background: "#241b18" }}>Ink</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

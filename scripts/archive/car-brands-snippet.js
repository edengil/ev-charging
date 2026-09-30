/** יצרני רכב — סמלים מקבצים ב־/brand/cars (Simple Icons / Wikimedia) */
const CAR_BRANDS = [
  { id: "hyundai", label: "יונדאי", color: "#002C5F", aliases: ["hyundai", "יונדאי", "היונדאי", "ioniq", "איוניק", "איוניק5", "ioniq5", "ioniq 5", "kona", "קונה"] },
  { id: "kia", label: "קיה", color: "#05141F", aliases: ["kia", "קיה", "ev6", "ev9", "niro", "נירו", "soul"] },
  { id: "tesla", label: "טסלה", color: "#CC0000", aliases: ["tesla", "טסלה", "model 3", "model y", "model s", "model x", "מודל"] },
  { id: "byd", label: "BYD", color: "#D70C19", aliases: ["byd", "אטו", "atto", "seal", "dolphin", "דולפין", "han", "tang"] },
  { id: "mg", label: "MG", color: "#A21017", aliases: ["mg", "אם ג׳י", "zs ev", "mg4", "mg5"] },
  { id: "vw", label: "פולקסווגן", color: "#1A1F71", aliases: ["vw", "volkswagen", "פולקסווגן", "id.3", "id.4", "id.5", "id3", "id4"] },
  { id: "cupra", label: "קופרה", color: "#1A1A1A", aliases: ["cupra", "קופרה", "born"], logoId: "vw" },
  { id: "skoda", label: "סקודה", color: "#4BA82E", aliases: ["skoda", "škoda", "סקודה", "enyaq", "אניאק"] },
  { id: "bmw", label: "BMW", color: "#1C69D4", aliases: ["bmw", "במוו", "i4", "ix", "iX3"] },
  { id: "mercedes", label: "מרצדס", color: "#333333", aliases: ["mercedes", "מרצדס", "benz", "eqa", "eqb", "eqc", "eqe", "eqs"] },
  { id: "audi", label: "אאודי", color: "#000000", aliases: ["audi", "אאודי", "אודי", "e-tron", "etron", "q4"] },
  { id: "toyota", label: "טויוטה", color: "#EB0A1E", aliases: ["toyota", "טויוטה", "bz4x", "prius"] },
  { id: "peugeot", label: "פיג׳ו", color: "#000000", aliases: ["peugeot", "פיג׳ו", "פיג'ו", "e-208", "e-2008"] },
  { id: "renault", label: "רנו", color: "#FFCC33", aliases: ["renault", "רנו", "megane e-tech", "zoe", "זואי"] },
  { id: "volvo", label: "וולוו", color: "#003057", aliases: ["volvo", "וולוו", "xc40", "ex30", "ex90"] },
  { id: "polestar", label: "פולסטאר", color: "#000000", aliases: ["polestar", "פולסטאר", "polestar 2"] },
  { id: "nissan", label: "ניסאן", color: "#C3002F", aliases: ["nissan", "ניסאן", "leaf", "ליף", "ariya"] },
  { id: "ford", label: "פורד", color: "#003478", aliases: ["ford", "פורד", "mustang mach", "mach-e"] },
  { id: "chevrolet", label: "שברולט", color: "#D4A017", aliases: ["chevrolet", "chevy", "שברולט", "bolt"] },
  { id: "geely", label: "ג׳ילי", color: "#5A666E", aliases: ["geely", "גילי", "ג׳ילי", "ג'ילי", "zeekr", "זיקר"] },
  { id: "geometry", label: "גאומטרי", color: "#5A666E", aliases: ["geometry", "גאומטרי", "גאומטרי c", "geometry c"], logoId: "geely" }
];

function normalizeCarText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['׳’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findCarBrand(query) {
  const q = normalizeCarText(query);
  if (!q) return null;
  const compact = q.replace(/[\s\-_.]/g, "");
  for (const b of CAR_BRANDS) {
    if (b.id === q || normalizeCarText(b.label) === q) return b;
    for (const a of b.aliases) {
      const na = normalizeCarText(a);
      if (!na) continue;
      if (q.includes(na) || compact.includes(na.replace(/[\s\-_.]/g, "")) || na.includes(q)) return b;
    }
  }
  return null;
}

function resolveClientCarBrand(client) {
  if (!client) return null;
  return findCarBrand(client.carBrand) || findCarBrand(client.carModel) || findCarBrand([client.carBrand, client.carModel].filter(Boolean).join(" "));
}

function carBrandLogoCandidates(brand) {
  if (!brand) return [];
  const id = brand.logoId || brand.id;
  const list = [`/brand/cars/${id}.svg`, `/brand/cars/${brand.id}.svg`, `/brand/cars/${id}.png`, `/brand/cars/${brand.id}.png`];
  if (id === "geometry" || brand.id === "geometry") list.push("/brand/cars/geely.svg");
  return [...new Set(list)];
}

function formatClientCarLine(client) {
  if (!client) return "";
  const brand = resolveClientCarBrand(client);
  const parts = [];
  if (brand) parts.push(brand.label);
  else if (client.carBrand) parts.push(client.carBrand);
  if (client.carModel) parts.push(client.carModel);
  if (client.carPlate) parts.push(client.carPlate);
  return parts.join(" · ");
}

function ClientAvatar({
  client,
  size = 40,
  fontSize = 17
}) {
  const brand = resolveClientCarBrand(client);
  const candidates = carBrandLogoCandidates(brand);
  const [srcIdx, setSrcIdx] = useState(0);
  const letter = client && client.name ? String(client.name).trim().charAt(0) || "?" : "?";
  const logo = brand && srcIdx < candidates.length ? candidates[srcIdx] : null;
  useEffect(() => {
    setSrcIdx(0);
  }, [brand && brand.id, client && client.id]);
  if (logo) {
    const pad = Math.max(4, Math.round(size * 0.12));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fff",
        border: "1.5px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,.06)",
        padding: pad
      },
      title: brand ? brand.label : "",
      "data-testid": "client-avatar-brand"
    }, /*#__PURE__*/React.createElement("img", {
      src: logo,
      alt: brand.label,
      style: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block"
      },
      onError: () => setSrcIdx(i => i + 1)
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: S.ava(size, fontSize),
    "data-testid": "client-avatar-letter"
  }, letter);
}

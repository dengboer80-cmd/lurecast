// Original vector illustrations: artistic reference, never identification evidence.
function fishArtwork(fish) {
  const name = fish.name;
  if (name === "翘嘴鲌") return referenceFish("culter");
  if (name === "中国花鲈") return referenceFish("seabass");
  const key =
    "fa-" + Array.from(name, (c) => c.codePointAt(0).toString(16)).join("-");
  const seed = Array.from(name).reduce(
    (n, c) => (n * 31 + c.codePointAt(0)) >>> 0,
    7,
  );
  let family = "silver",
    depth = 22,
    back = "#536f79",
    belly = "#d4e0db",
    accent = "#9ab7a8",
    pattern = "scales",
    tail = "fork",
    mouth = 27;
  if (/鲶|黄颡/.test(name)) {
    family = "catfish";
    depth = 20;
    back = name === "黄颡鱼" ? "#7a7135" : "#4c5951";
    belly = "#c9c395";
    pattern = "mottle";
    tail = name === "黄颡鱼" ? "fork" : "round";
    mouth = 20;
  } else if (/鳢/.test(name)) {
    family = "snakehead";
    depth = 19;
    back = "#4b6051";
    belly = "#c0c5a2";
    pattern = "mottle";
    tail = "round";
    mouth = 22;
  } else if (/鳜/.test(name)) {
    family = "mandarin";
    depth = 33;
    back = "#5a7453";
    belly = "#d4d0a1";
    accent = "#8d9d62";
    pattern = "mottle";
    tail = "round";
    mouth = 20;
  } else if (/石斑|平鲉|菖鲉|黑鲉/.test(name)) {
    family = "grouper";
    depth = 33;
    back = /赤点|菖/.test(name) ? "#8a5949" : "#58654f";
    belly = "#c2b99d";
    accent = "#9a8a68";
    pattern = "spots";
    tail = "round";
    mouth = 20;
  } else if (/牙鲆|舌鳎/.test(name)) {
    family = "flat";
    depth = /舌鳎/.test(name) ? 26 : 40;
    back = "#6f6c4f";
    belly = "#a99f72";
    pattern = "spots";
    tail = "round";
  } else if (/海鳗|带鱼/.test(name)) {
    family = "eel";
    depth = name === "带鱼" ? 10 : 15;
    back = name === "带鱼" ? "#748a95" : "#57625e";
    belly = "#d2dadd";
    pattern = name === "带鱼" ? "none" : "mottle";
    tail = "point";
  } else if (/狗鱼|梭鱼/.test(name)) {
    family = "pike";
    depth = 19;
    back = "#587451";
    belly = "#c4d1ac";
    pattern = name === "白斑狗鱼" ? "lightspots" : "bars";
    mouth = 10;
  } else if (/旗鱼/.test(name)) {
    family = "billfish";
    depth = 25;
    back = "#285f7b";
    belly = "#bcdce2";
    accent = "#4086a1";
    pattern = "bars";
    mouth = 4;
  } else if (name === "鬼头刀") {
    family = "mahi";
    depth = 34;
    back = "#358779";
    belly = "#e5d77b";
    accent = "#54aca6";
    pattern = "spots";
  } else if (/金枪|鲣|马鲛|日本鲭/.test(name)) {
    family = "tuna";
    depth = /马鲛/.test(name) ? 20 : 31;
    back = "#355d78";
    belly = "#c5d7db";
    accent = /黄鳍/.test(name) ? "#e5cf61" : "#748faa";
    pattern = /马鲛/.test(name)
      ? "spots"
      : /鲣|日本鲭/.test(name)
        ? "stripes"
        : "none";
  } else if (/孔雀|眼斑丽/.test(name)) {
    family = "peacock";
    depth = 31;
    back = "#5d7c43";
    belly = "#d6cf83";
    accent = "#d6a555";
    pattern = "bars";
    tail = "round";
    mouth = 21;
  } else if (
    /鳟|红点鲑|大西洋鲑|银鲑|狗鲑|粉红鲑|帝王鲑|红鲑|哲罗鲑/.test(name)
  ) {
    family = "salmon";
    depth = 24;
    back = /褐鳟/.test(name) ? "#88724b" : "#587c78";
    belly = "#d6d8b6";
    accent = name === "虹鳟" ? "#d797a5" : "#b5b4a0";
    pattern = "spots";
  } else if (/鲤|鲫|黄尾鲴/.test(name)) {
    family = "carp";
    depth = name === "鲫" ? 37 : 30;
    back = name === "鲤" ? "#8c754e" : "#68786b";
    belly = "#ddcfad";
    accent = "#b18b53";
    pattern = "scales";
    mouth = 31;
  } else if (/罗非|太阳鱼|黑莓鲈/.test(name)) {
    family = "sunfish";
    depth = 39;
    back = /太阳鱼/.test(name) ? "#507c83" : "#64715e";
    belly = "#c4bd84";
    accent = "#9da85e";
    pattern = "bars";
    tail = "round";
    mouth = 32;
  } else if (/黑鲈/.test(name)) {
    family = "bass";
    depth = 30;
    back = name === "小口黑鲈" ? "#8b7953" : "#4e6b4a";
    belly = "#d7d7ad";
    pattern = name === "小口黑鲈" ? "bars" : "stripe";
    mouth = 21;
  } else if (/河鲈|梭鲈/.test(name)) {
    family = "perch";
    depth = name === "梭鲈" ? 24 : 32;
    back = "#627b49";
    belly = "#d5d4a4";
    accent = "#dba369";
    pattern = "bars";
    mouth = 22;
  } else if (/笛鲷|真鲷/.test(name)) {
    family = "bream";
    depth = 35;
    back = "#9a5d57";
    belly = "#e6bbaa";
    accent = "#c17e6f";
    pattern = "spots";
  } else if (/鲷/.test(name)) {
    family = "bream";
    depth = 38;
    back = /黑/.test(name) ? "#556d75" : "#768d81";
    belly = "#d3d8c6";
    accent = /黄鳍/.test(name) ? "#dbbd61" : "#839e9c";
    pattern = "stripes";
  } else if (/鲹/.test(name)) {
    family = "jack";
    depth = /卵形/.test(name) ? 39 : 31;
    back = "#597d8b";
    belly = "#d4e3dc";
    accent = /蓝鳍/.test(name)
      ? "#4b9dc4"
      : /六带/.test(name)
        ? "#c9c078"
        : "#8eafb1";
    pattern = /六带/.test(name) ? "bars" : "none";
  } else if (/鲻/.test(name)) {
    family = "mullet";
    depth = 23;
    back = "#607c7b";
    belly = "#d5e0d8";
    pattern = "stripes";
    mouth = 31;
  } else if (/海鲢/.test(name)) {
    family = "tarpon";
    depth = 26;
    back = "#638c8f";
    belly = "#d7e4dc";
    pattern = "scales";
    mouth = 23;
  } else if (name === "巨骨舌鱼") {
    family = "arapaima";
    depth = 29;
    back = "#466b60";
    belly = "#afa585";
    accent = "#c9705c";
    pattern = "scales";
    tail = "round";
    mouth = 27;
  } else if (/尖吻鲈|军曹/.test(name)) {
    family = "elongated";
    depth = 24;
    back = "#536e71";
    belly = "#cbd6c8";
    pattern = "stripe";
    mouth = 22;
  } else if (/马口|鳍鱲|赤眼/.test(name)) {
    family = "minnow";
    depth = 20;
    back = "#586f80";
    belly = "#d9d8b5";
    accent = "#d49b79";
    pattern = "stripe";
    mouth = 24;
  } else if (/鳡|鯮/.test(name)) {
    family = "predator";
    depth = 21;
    back = "#6b7c53";
    belly = "#d9d9bb";
    accent = "#b9ab6f";
    pattern = "scales";
    mouth = 14;
  } else if (/白姑|斑头|六线/.test(name)) {
    family = "croaker";
    depth = 26;
    back = "#7b7f6e";
    belly = "#d2d3c0";
    pattern = /六线/.test(name) ? "stripes" : "mottle";
    tail = "round";
  }
  const y = 75,
    left = family === "flat" ? 30 : mouth,
    top = y - depth,
    bottom = y + depth;
  const body =
    family === "eel"
      ? `M${left} 70 Q70 ${top - 12} 134 68 Q187 87 257 66 Q218 101 151 86 Q77 ${bottom + 3} ${left} 80Z`
      : family === "flat"
        ? `M28 75 Q70 ${top - 11} 166 ${top + 4} Q209 48 229 75 Q195 ${bottom + 10} 111 ${bottom + 2} Q52 ${bottom} 28 75Z`
        : `M${left} 75 Q${family === "mahi" ? left : left + 13} ${top - 9} 81 ${top} Q153 ${top - 8} 226 70 L228 82 Q150 ${bottom + 7} 72 ${bottom - 2} Q${left + 9} ${bottom - 5} ${left} 75Z`;
  const tailPath =
    tail === "round"
      ? `M225 70 Q247 49 260 57 Q266 75 259 96 Q242 100 225 82Z`
      : tail === "point"
        ? `M225 70L263 67L225 83Z`
        : `M224 70L261 49L252 75L263 102L224 82Z`;
  let dorsal =
    family === "eel"
      ? `M48 65Q130 35 244 65L225 70Q128 59 48 70Z`
      : family === "billfish"
        ? `M75 ${top}Q112 -8 155 14L196 63Z`
        : family === "pike"
          ? `M167 ${top + 3}L191 30L207 65Z`
          : family === "snakehead" || family === "mahi" || family === "arapaima"
            ? `M75 ${top + 2}Q145 ${top - 19} 214 61L214 69Z`
            : `M87 ${top + 3}L94 ${top - 12}L102 ${top - 3}L112 ${top - 20}L121 ${top - 4}L132 ${top - 19}L142 ${top - 2}L158 ${top - 12}L177 ${top + 8}Z`;
  let texture = "";
  if (pattern === "bars")
    texture = Array.from(
      { length: 5 + (seed % 3) },
      (_, i) =>
        `<path d="M${73 + i * 23} ${top - 5}q-11 30 6 ${depth * 2 + 15}" stroke="#203c31" opacity=".46" stroke-width="${6 + (seed % 6)}" fill="none"/>`,
    ).join("");
  if (pattern === "stripe")
    texture = `<path d="M48 77Q135 66 232 78" stroke="${family === "salmon" ? accent : "#2a4937"}" stroke-width="8" opacity=".56" fill="none"/>`;
  if (pattern === "stripes")
    texture = Array.from(
      { length: 5 },
      (_, i) =>
        `<path d="M53 ${top + 8 + i * 8}Q145 ${top + i * 8} 236 ${67 + i * 4}" stroke="#334c51" stroke-width="1.7" opacity=".6" fill="none"/>`,
    ).join("");
  if (["spots", "lightspots", "mottle"].includes(pattern))
    texture = Array.from(
      { length: pattern === "mottle" ? 25 : 34 },
      (_, i) =>
        `<ellipse cx="${53 + ((i * 37 + seed) % 167)}" cy="${top + 5 + ((i * 19 + seed) % Math.max(10, depth * 2 - 10))}" rx="${pattern === "mottle" ? 4 + ((i + seed) % 5) : 1.5 + ((i + seed) % 2)}" ry="${pattern === "mottle" ? 3 + ((i + seed) % 4) : 1.5}" fill="${pattern === "lightspots" ? "#dfe3a4" : "#2f4539"}" opacity=".6"/>`,
    ).join("");
  if (pattern === "scales")
    texture = Array.from({ length: 5 }, (_, row) =>
      Array.from(
        { length: 19 },
        (_, col) =>
          `<path d="M${58 + col * 8 + (row % 2) * 4} ${top + 6 + row * depth * 0.35}q5 4 0 8" fill="none" stroke="${family === "arapaima" && col > 11 ? accent : "#395954"}" opacity=".36" stroke-width="${family === "arapaima" ? 1.4 : 0.7}"/>`,
      ).join(""),
    ).join("");
  const eyeX = family === "pike" ? 38 : family === "flat" ? 45 : 37,
    eyeY = family === "flat" ? 66 : top + depth * 0.65;
  return `<svg class="speciesart" viewBox="0 0 280 145" role="img" aria-label="${esc(name)}2D示意插画"><title>${esc(name)} · 原创艺术示意，非鉴定依据</title><defs><linearGradient id="${key}" x2="0" y2="1"><stop stop-color="${back}"/><stop offset=".65" stop-color="${belly}"/><stop offset="1" stop-color="${back}"/></linearGradient><clipPath id="${key}-clip"><path d="${body}"/></clipPath></defs><g fill="${accent}" stroke="${back}" stroke-width="1"><path d="${dorsal}"/><path d="M135 ${bottom - 3}L164 ${Math.min(137, bottom + 21)}L185 ${bottom - 4}Z"/>${family !== "eel" ? `<path d="${tailPath}"/>` : ""}</g><path d="${body}" fill="url(#${key})" stroke="${back}" stroke-width="1.4"/><g clip-path="url(#${key}-clip)">${texture}${family === "salmon" && name === "虹鳟" ? `<path d="M40 75Q147 61 234 77" stroke="#ce8c9f" opacity=".6" stroke-width="9" fill="none"/>` : ""}</g><path d="M57 ${top + 8}Q73 77 58 ${bottom - 7}" stroke="${back}" fill="none" stroke-width="1.4"/><path d="M69 79L112 ${Math.min(126, bottom + 15)}L95 76Z" fill="${accent}" stroke="${back}"/><circle cx="${eyeX}" cy="${eyeY}" r="4" fill="#c8c195"/><circle cx="${eyeX}" cy="${eyeY}" r="2.3" fill="#13221f"/><path d="M${left + 1} 78L42 82" fill="none" stroke="#3b514b"/>${family === "catfish" ? '<path d="M23 79Q11 85 6 99M34 84Q25 104 10 108M28 75Q14 64 4 68" stroke="#8da49b" fill="none"/>' : ""}${family === "flat" ? '<circle cx="51" cy="77" r="3" fill="#172724"/>' : ""}${family === "peacock" ? '<circle cx="229" cy="77" r="8" fill="#cbb55e"/><circle cx="229" cy="77" r="5" fill="#203528"/>' : ""}${family === "billfish" ? '<path d="M29 71L1 60L31 75" fill="#a9c6d0"/>' : ""}${family === "salmon" ? `<path d="M196 ${top + 7}q8 -17 15 2Z" fill="${back}"/>` : ""}${family === "tarpon" ? `<path d="M143 ${top - 5}Q169 ${top - 22} 179 ${top - 14}" stroke="${accent}" fill="none"/>` : ""}</svg>`;
}

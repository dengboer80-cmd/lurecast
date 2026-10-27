let catchDbPromise;
let journalPhotos = [];
let editingCatchId = null;
let journalObjectUrls = [];
function catchDb() {
  if (!catchDbPromise)
    catchDbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(Error("此浏览器不支持本机照片存储"));
      const request = indexedDB.open("lurecast-journal", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("catches", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        catchDbPromise = null;
        reject(request.error);
      };
      request.onblocked = () => {
        catchDbPromise = null;
        reject(Error("请关闭其他 LureCast 页面后重试"));
      };
    });
  return catchDbPromise;
}
async function catchRecords() {
  const db = await catchDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction("catches").objectStore("catches").getAll();
    r.onsuccess = () =>
      resolve(
        r.result.sort(
          (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
        ),
      );
    r.onerror = () => reject(r.error);
  });
}
async function writeCatch(record, remove = false) {
  const db = await catchDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("catches", "readwrite");
    const store = tx.objectStore("catches");
    if (remove) store.delete(record.id);
    else store.put(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error("保存已取消"));
  });
}
function allFish() {
  return [
    ...fishCatalogue,
    ...list("lc-custom-fish").filter((f) => f && typeof f.name === "string"),
  ].filter((f, i, a) => a.findIndex((v) => v.name === f.name) === i);
}
function renderFishList() {
  const q = document.getElementById("fishSearch").value.trim();
  const group = document.getElementById("fishHabitat").value;
  const records = allFish().filter(
    (f) => (!q || f.name.includes(q)) && (!group || f.habitat === group),
  );
  document.getElementById("fishLibrary").innerHTML =
    records
      .map(
        (f) =>
          `<article class="card cardpad"><h3>${esc(f.name)}</h3><p class="sub">${esc(f.habitat)}${f.custom ? " · 用户补充" : ""}</p><p>${esc(f.bait || "拟饵选择请结合实际鱼种核对")}</p><button class="pill" onclick="prefillCatch(this.dataset.name)" data-name="${esc(f.name)}">记录这条鱼</button></article>`,
      )
      .join("") ||
    '<p class="empty">未收录？可在下方补充鱼种，或直接在鱼获表填写名称。</p>';
}
function prefillCatch(name) {
  document.getElementById("catchSpecies").value = name;
  document
    .getElementById("catchForm")
    .scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("catchWeight").focus();
}
renderFish = function () {
  editingCatchId = null;
  journalPhotos = [];
  document.getElementById("fish").innerHTML =
    `<h1>鱼种与我的鱼获</h1><p class="sub">常见淡水与海水路亚鱼种参考，可自行补充。全球可被拟饵钓获的鱼种没有统一完整名录，本库不声称全部收录；不代表当地有该鱼或允许捕捞。放流、保护期和保护物种要求以当地规定为准。</p><div class="detailgrid"><div class="card fishcard">${referenceFish("culter")}<h2>翘嘴鲌</h2></div><div class="card fishcard">${referenceFish("seabass")}<h2>中国花鲈</h2></div></div><h2>鱼种库 (${allFish().length})</h2><label>搜索鱼种<input id="fishSearch" placeholder="输入鱼名" oninput="renderFishList()"></label><label>水域<select id="fishHabitat" onchange="renderFishList()"><option value="">全部</option><option>淡水</option><option>近海</option><option>海水洄游</option><option>自定义</option></select></label><div id="fishLibrary" class="fishlibrary"></div><form id="fishCustomForm" class="card cardpad"><h3>补充鱼种</h3><label>名称<input name="species" maxlength="60" required></label><button class="pill">加入鱼种库</button></form><form id="catchForm" class="card cardpad"><h2 id="catchFormTitle">记录我的鱼获</h2><p class="sub">一条鱼一条记录，重量单位公斤（kg）。照片和记录仅保存在这台设备，未上传云端；请勿清除网站数据。</p><label>鱼种<input id="catchSpecies" name="species" list="speciesOptions" required maxlength="60"><datalist id="speciesOptions">${allFish()
      .map((f) => `<option value="${esc(f.name)}">`)
      .join(
        "",
      )}</datalist></label><label>重量（公斤 kg）<input id="catchWeight" name="weight" type="number" inputmode="decimal" min="0.001" max="2000" step="0.001" required></label><label>日期<input name="date" type="date" value="${dateKey(dates[0])}" required></label><label>钓点<select name="spot"><option value="">不关联钓点</option>${userPoints.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join("")}</select></label><label>备注<textarea name="notes" maxlength="500"></textarea></label><label>鱼获照片（最多4张，可选相册或拍照）<input name="photos" type="file" accept="image/*" multiple></label><label><input name="clearPhotos" type="checkbox">移除原有照片</label><div id="catchPhotoStatus" class="sub"></div><button class="pill" id="catchSave">保存鱼获</button> <button type="button" class="textbtn" onclick="renderFish()">取消编辑</button><p id="catchError" role="alert"></p></form><div id="catchSummary" class="sub"></div><div id="catchRecords"><p>读取本机鱼获…</p></div>`;
  renderFishList();
  document.getElementById("fishCustomForm").onsubmit = (e) => {
    e.preventDefault();
    const name = String(new FormData(e.target).get("species")).trim();
    if (!name) return;
    if (allFish().some((f) => f.name === name)) return toast("该鱼种已在库中");
    if (
      commitList(
        "lc-custom-fish",
        [
          ...list("lc-custom-fish"),
          {
            name,
            habitat: "自定义",
            custom: true,
            bait: "用户自定义鱼种，请自行核实鉴别信息",
          },
        ],
        () => {},
      )
    )
      renderFish();
  };
  document.getElementById("catchForm").onsubmit = saveCatchForm;
  document.querySelector("#catchForm [name=photos]").onchange = (e) => {
    const count = e.target.files.length;
    document.getElementById("catchPhotoStatus").textContent = count
      ? `已选择${count}张，点击保存后存入本机`
      : "未选择新照片";
  };
  refreshCatchList();
};
async function photoBlob(file) {
  if (file.size > 12 * 1024 * 1024) throw Error("单张照片不能超过12MB");
  if (!file.type.startsWith("image/")) throw Error("请选择图片文件");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(
      1,
      1600 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw Error("图片转换失败");
    return blob;
  } catch {
    throw Error("此照片无法读取，请使用 JPEG、PNG 或 WebP 图片");
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function saveCatchForm(e) {
  e.preventDefault();
  const form = e.target,
    f = new FormData(form),
    species = String(f.get("species")).trim(),
    weightKg = Number(f.get("weight")),
    date = String(f.get("date"));
  const error = document.getElementById("catchError");
  error.textContent = "";
  if (
    !species ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    weightKg > 2000 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    error.textContent = "请填写有效鱼种、日期和公斤重量";
    return;
  }
  const files = [...form.elements.photos.files];
  if (files.length > 4) {
    error.textContent = "最多选择4张照片";
    return;
  }
  const button = document.getElementById("catchSave");
  button.disabled = true;
  try {
    const photos = files.length
      ? await Promise.all(files.map(photoBlob))
      : form.elements.clearPhotos.checked
        ? []
        : journalPhotos;
    const index = f.get("spot"),
      point = index !== "" ? userPoints[Number(index)] : null;
    await writeCatch({
      id:
        editingCatchId ||
        (typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) =>
              n.toString(16).padStart(2, "0"),
            ).join("")),
      species,
      weightKg,
      date,
      spotName: point?.name || "",
      spotKey: point ? `${point.lat},${point.lng},${point.name}` : "",
      notes: String(f.get("notes") || "").slice(0, 500),
      photos,
      createdAt: Date.now(),
    });
    renderFish();
    toast("鱼获和照片已保存到本机");
  } catch (err) {
    error.textContent =
      "保存失败，记录未更新：" + (err?.message || "本机存储不可用或空间不足");
  } finally {
    button.disabled = false;
  }
}
async function refreshCatchList() {
  try {
    const rows = await catchRecords();
    if (!document.getElementById("catchRecords")) return;
    journalObjectUrls.forEach((u) => URL.revokeObjectURL(u));
    journalObjectUrls = [];
    document.getElementById("catchSummary").textContent =
      `共${rows.length}条鱼获 · 总重量 ${rows.reduce((s, r) => s + r.weightKg, 0).toFixed(3)} kg`;
    document.getElementById("catchRecords").innerHTML =
      rows
        .map(
          (r) =>
            `<article class="card cardpad catchentry"><h3>${esc(r.species)} · ${Number(r.weightKg).toFixed(3)} kg</h3><p class="sub">${esc(r.date)}${r.spotName ? " · " + esc(r.spotName) : ""}</p><p>${esc(r.notes)}</p><div class="catchphotos">${(
              r.photos || []
            )
              .map((blob) => {
                const u = URL.createObjectURL(blob);
                journalObjectUrls.push(u);
                return `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="${esc(r.species)}的本机鱼获照片" loading="lazy"></a>`;
              })
              .join(
                "",
              )}</div><button class="pill" data-id="${esc(r.id)}" onclick="editCatch(this.dataset.id)">编辑</button> <button class="textbtn" data-id="${esc(r.id)}" onclick="deleteCatch(this.dataset.id)">删除</button></article>`,
        )
        .join("") ||
      '<div class="empty">还没有鱼获记录。照片可从相册选取或拍摄，保存后仅自己在本机可见。</div>';
  } catch (err) {
    if (document.getElementById("catchRecords"))
      document.getElementById("catchRecords").textContent =
        "本机鱼获存储不可用：" + err.message;
  }
}
async function editCatch(id) {
  const r = (await catchRecords()).find((v) => v.id === id);
  if (!r) return;
  editingCatchId = id;
  journalPhotos = r.photos || [];
  const f = document.getElementById("catchForm");
  f.elements.species.value = r.species;
  f.elements.weight.value = r.weightKg;
  f.elements.date.value = r.date;
  f.elements.notes.value = r.notes;
  f.elements.spot.value = String(
    userPoints.findIndex((p) => `${p.lat},${p.lng},${p.name}` === r.spotKey),
  );
  f.elements.photos.value = "";
  f.elements.clearPhotos.checked = false;
  document.getElementById("catchFormTitle").textContent = "编辑鱼获";
  document.getElementById("catchPhotoStatus").textContent =
    `已保留${journalPhotos.length}张原照片；选择新照片会替换`;
  f.scrollIntoView({ behavior: "smooth", block: "start" });
}
async function deleteCatch(id) {
  if (!confirm("删除这条鱼获及其本机照片？")) return;
  try {
    await writeCatch({ id }, true);
    refreshCatchList();
    toast("鱼获已删除");
  } catch {
    toast("删除失败，原记录已保留");
  }
}

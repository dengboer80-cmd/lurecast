function allFish() {
  return [
    ...fishCatalogue,
    ...list("lc-custom-fish").filter((f) => f && typeof f.name === "string"),
  ].filter((f, i, a) => a.findIndex((v) => v.name === f.name) === i);
}
function renderFishList() {
  const q = document.getElementById("fishSearch").value.trim(),
    group = document.getElementById("fishHabitat").value;
  const records = allFish().filter(
    (f) => (!q || f.name.includes(q)) && (!group || f.habitat === group),
  );
  document.getElementById("fishCount").textContent =
    `显示${records.length} / ${allFish().length}项`;
  document.getElementById("fishLibrary").innerHTML =
    records
      .map(
        (f) =>
          `<article class="card cardpad speciescard">${fishArtwork(f)}<h3>${esc(f.name)}</h3><p class="sub">${esc(f.habitat)}${f.custom ? " · 用户补充" : ""}</p><p>${esc(f.bait || "拟饵选择请结合实际鱼种核对")}</p><small class="sub">2D艺术示意 · 非鉴定图</small></article>`,
      )
      .join("") || '<p class="empty">没有匹配鱼种，可在下方补充。</p>';
}
renderFish = function () {
  document.getElementById("fish").innerHTML =
    `<h1>路亚鱼种库</h1><p class="sub">每项配原创2D示意插画，保留翘嘴鲌和中国花鲈的原有画法。外形、配色用于艺术参考，不能据此鉴定鱼种；不代表杭州存在该鱼或允许捕捞。</p><label>搜索鱼种<input id="fishSearch" placeholder="输入鱼名" oninput="renderFishList()"></label><label>水域<select id="fishHabitat" onchange="renderFishList()"><option value="">全部</option><option>淡水</option><option>近海</option><option>海水洄游</option><option>自定义</option></select></label><p id="fishCount" class="sub"></p><div id="fishLibrary" class="fishlibrary"></div><form id="fishCustomForm" class="card cardpad"><h3>补充鱼种</h3><label>名称<input name="species" maxlength="60" required></label><button class="pill">加入鱼种库</button></form>`;
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
            bait: "用户补充鱼种；示意外形不作为鉴定依据",
          },
        ],
        () => {},
      )
    )
      renderFish();
  };
};
navs[2][2] = "鱼种库";
renderNav();

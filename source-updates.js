(function (root, factory) {
  const ui = factory();
  if (typeof module === "object" && module.exports) module.exports = ui;
  else {
    root.WEDDING_SOURCE_UI = ui;
    document.querySelectorAll("[data-source-updates]").forEach(node => ui.render(node, root.WEDDING_PREPARATION));
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const price = value => Number(value).toLocaleString("ja-JP") + "円";
  const mediaTotal = media => media.orderLines.reduce((sum, item) => sum + item.includingTax * item.quantity, 0);

  function render(target, data, doc = target.ownerDocument) {
    const updates = data.sourceUpdates;
    if (!updates) return;
    target.replaceChildren();
    const topics = (target.dataset.sourceUpdates || "cuisine media attire").split(/\s+/);
    function node(tag, className, text) {
      const result = doc.createElement(tag);
      if (className) result.className = className;
      if (text !== undefined) result.textContent = text;
      return result;
    }
    function card(title, subtitle, reference) {
      const detail = node("details", "source-update-card");
      const summary = node("summary");
      const copy = node("span");
      copy.append(node("strong", "", title), node("small", "", subtitle));
      summary.append(copy);
      const body = node("div", "source-update-body");
      const source = node("a", "source-original-link", "原本を開く ↗");
      source.href = "https://drive.google.com/file/d/" + reference.id + "/view";
      source.target = "_blank"; source.rel = "noopener noreferrer";
      source.setAttribute("aria-label", title + "の原本：" + reference.title);
      detail.append(summary, body);
      target.append(detail);
      return { body, source };
    }
    function prices(items, describe, taxable = true) {
      const list = node("ul", "source-price-list");
      items.forEach(item => {
        const row = node("li");
        const copy = node("div");
        copy.append(node("strong", "", item.name || item.number), node("small", "", describe(item)));
        const amount = node("div", "source-price-amount");
        amount.append(node("strong", "", price(taxable ? item.includingTax : item.price)));
        if (taxable) amount.append(node("small", "", "税込／税抜 " + price(item.beforeTax)));
        row.append(copy, amount); list.append(row);
      });
      return list;
    }
    if (topics.includes("cuisine")) {
      const cuisine = updates.cuisine;
      const section = card("料理の候補・価格", "5コースと追加料理／まだ検討段階", data.documents[cuisine.document]);
      section.body.append(node("p", "source-update-status", cuisine.selectionStatus));
      section.body.append(prices(cuisine.courses, item => item.note + "（" + item.page + "ページ）"));
      const additions = node("details", "source-additions");
      additions.append(node("summary", "", "追加料理の価格も見る"));
      additions.append(prices(cuisine.additions, () => "料理メニュー一覧 6ページ"));
      section.body.append(additions, node("p", "source-update-note", cuisine.note), section.source);
    }
    if (topics.includes("media")) {
      const media = updates.media;
      const section = card("映像の注文内容・提出条件", "9月27日更新の注文書／10月12日追加資料", data.documents[media.document]);
      section.body.append(prices(media.orderLines, item => "数量 " + item.quantity + "／原本1ページ"));
      const total = node("p", "source-order-total", "記載3品の税込合計　" + price(mediaTotal(media)));
      section.body.append(total, node("p", "source-update-note", media.costNote));
      const info = node("dl", "source-facts");
      for (const [label, value] of [["オープニング", media.openingMovie], ["プロフィール", media.profileMovie], ["サンプル確認", media.sampleStatus]]) {
        info.append(node("dt", "", label), node("dd", "", value));
      }
      section.body.append(info, node("h3", "", "次に確認すること"));
      const notes = node("ul", "source-notes");
      media.notes.forEach(text => notes.append(node("li", "", text)));
      section.body.append(notes, section.source);
    }
    if (topics.includes("attire")) {
      const attire = updates.attire;
      const section = card("10月12日の衣裳試着", "白ドレス1点・色ドレス6点／最終選択は未記載", data.documents[attire.document]);
      section.body.append(node("p", "source-update-status", attire.selectionStatus));
      section.body.append(prices(attire.items, item => item.category + "・" + item.color + "／" + item.brand + "／衣裳コード " + item.code, false));
      section.body.append(node("p", "source-update-note", attire.note), section.source);
    }
  }
  return { render, price, mediaTotal };
});

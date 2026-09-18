(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.WEDDING_PREPARATION = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Drive内のPDFを目視確認した転記。未記載の日付・宿題は補完しない。
  const documents = {
    schedule: { title: "HappyWeddingSchedule.pdf", id: "1VA-WOWwM5L_0wDAOvovJB7Yzh9Zu5Y9R", pages: 1 },
    homework: { title: "HappyWeddingSchedule_手書き.pdf", id: "1u2ixXzdW1htRmOH_fzEAt-1O3ABka3D1", pages: 1 },
    video: { title: "動画担当者.pdf", id: "1VwGeAt9tEAG7r6CR71r1rIYK9t6Z5GqE", pages: 2 }
  };
  const phases = [
    { id: "homework", title: "次回までの宿題", period: "2nd打ち合わせ前まで" },
    { id: "appointments", title: "日程が決まっている打ち合わせ", period: "9月19日・9月27日" },
    { id: "video", title: "映像・BGMサイトの登録", period: "日付の記載なし" },
    { id: "meetings", title: "今後の打ち合わせ", period: "資料に記載された実施時期" },
    { id: "attire", title: "衣裳・ヘアメイク・前撮り", period: "衣裳合わせスケジュール" },
    { id: "deadlines", title: "式場の締切", period: "2027年2月" },
    { id: "final", title: "最終確認", period: "式の1〜2週間前" }
  ];
  const tasks = [
    { id: "pdf-onew-guests", phase: "homework", category: "ONE-W", text: "ONE-Wの招待者を仮登録する", dueDate: "2026-09-19", dueTime: "09:30", kind: "homework", period: "2nd打ち合わせ前まで", document: "homework", page: 1, excerpt: "One-Wの『招待者仮登録』" },
    { id: "pdf-onew-favorites", phase: "homework", category: "ONE-W", text: "カタログの気になるアイテムをお気に入り登録する", description: "ONE-Wの「カタログ」で、気になったアイテムに♡を付けます。", dueDate: "2026-09-19", dueTime: "09:30", kind: "homework", period: "2nd打ち合わせ前まで", document: "homework", page: 1, excerpt: "『カタログ』にて気になったアイテムをお気に入り登録（♡マーク）" },
    { id: "pdf-second-meeting", phase: "appointments", category: "2nd stage", text: "2nd打ち合わせ", description: "ペーパーアイテム紹介（席札・メニューカード・招待状・席次表）、ONE-W招待者登録確認、配席確認、写真ラインナップ（データ・アルバム）。約2時間。", dueDate: "2026-09-19", dueTime: "09:30", kind: "appointment", document: "schedule", page: 1, excerpt: "9/19（土）9:30〜／2nd stage" },
    { id: "pdf-costume-meeting", phase: "appointments", category: "衣裳", text: "衣裳合わせ", description: "所要時間は約2〜2.5時間。", dueDate: "2026-09-19", dueTime: "12:00", kind: "appointment", document: "schedule", page: 1, excerpt: "9/19（土）12:00〜／衣裳合わせ" },
    { id: "pdf-movie-meeting", phase: "appointments", category: "Movie", text: "映像打ち合わせ", description: "映像演出紹介、記録ビデオ、当日上映ムービー（オープニング・生い立ち等）。約2時間。", dueDate: "2026-09-27", dueTime: "14:00", kind: "appointment", document: "schedule", page: 1, excerpt: "9/27（日）14:00〜／Movie" },
    { id: "pdf-marrysys-email", phase: "video", category: "Marrysys", text: "メールの送受信を確認する", description: "check.prim@marrysys.jp 宛に、件名は披露宴日8桁「20270307」、本文は氏名フルネーム・携帯電話番号を記載。返信が届くか確認します。iCloudは返信に約1分かかる場合があります。", kind: "undated", document: "video", page: 1, excerpt: "STEP 1〜3／メールの送受信確認" },
    { id: "pdf-marrysys-registration", phase: "video", category: "Marrysys", text: "登録完了メールから本登録を行う", description: "代表1名の作業。数日中に届く登録完了メールのURLから、半角英数6文字以上のパスワードを設定します。", kind: "undated", document: "video", page: 2, excerpt: "STEP 4〜6／登録完了メールを確認・パスワード設定" },
    { id: "pdf-marrysys-profile", phase: "video", category: "Marrysys", text: "基本情報の氏名表記を確認する", description: "ログインIDは新郎の携帯番号。基本情報の氏名（漢字・アルファベット）を確認します。担当者とはメッセージで連絡でき、マイページはブックマークやホーム画面に追加できます。", kind: "undated", document: "video", page: 2, excerpt: "基本情報でお名前の漢字とアルファベットを必ずご確認ください" },
    { id: "pdf-third-meeting", phase: "meetings", category: "3rd stage", text: "3rd打ち合わせ", description: "内容提案（料理・ケーキ・アイテムの紹介）、配席。約2時間。", kind: "undated", document: "schedule", page: 1, excerpt: "3rd stage／内容提案・配席" },
    { id: "pdf-fourth-meeting", phase: "meetings", category: "4th stage", text: "会場装花・内容決定の打ち合わせ", description: "メイン・ゲストテーブルの装花打ち合わせ。配席・進行・引出物等の内容決定と見積書提示。約3時間。", kind: "window", period: "式の2〜3か月前", document: "schedule", page: 1, excerpt: "お式の2〜3か月前／4th stage" },
    { id: "pdf-emcee-meeting", phase: "meetings", category: "司会", text: "司会打ち合わせ", description: "披露宴の進行について決定。約1.5時間。", kind: "window", period: "式の1〜2か月前", document: "schedule", page: 1, excerpt: "お式の1〜2か月前／司会打合せ" },
    { id: "pdf-bgm-meeting", phase: "meetings", category: "BGM", text: "BGM打ち合わせ", description: "披露宴のBGMについて決定。約1.5時間。", kind: "window", period: "式の1〜2か月前", document: "schedule", page: 1, excerpt: "お式の1〜2か月前／BGM打ち合せ" },
    { id: "pdf-hair-bouquet", phase: "attire", category: "衣裳・美容", text: "ヘアメイク＆ブーケ", kind: "undated", document: "schedule", page: 1, excerpt: "衣裳合わせスケジュール／ヘアメイク＆ブーケ" },
    { id: "pdf-pre-wedding-photo", phase: "attire", category: "前撮り", text: "前撮り", description: "約5時間。前撮りは平日のみの案内です。", kind: "undated", document: "schedule", page: 1, excerpt: "前撮り 約5時間／平日のみのご案内" },
    { id: "pdf-family-costume", phase: "attire", category: "親族衣裳", text: "親族の衣裳合わせ", description: "約1時間。式の2か月前までに来館する案内です。", kind: "window", period: "式の2か月前まで", document: "schedule", page: 1, excerpt: "ご親族様の衣裳合わせ／ご結婚式の2か月前までにお越しくださいませ" },
    { id: "pdf-content-deadline", phase: "deadlines", category: "内容変更", text: "内容変更締切・ONE-Wロック", description: "料理・映像・写真・装花・引出物・ペーパーアイテム等。以後の人数変更は担当プランナーへ連絡する案内です。", dueDate: "2027-02-07", kind: "deadline", document: "schedule", page: 1, excerpt: "2027年2月7日（日）4週間前／内容変更締切日・ONE-Wロック" },
    { id: "pdf-quantity-deadline", phase: "deadlines", category: "数量変更", text: "数量変更締切", dueDate: "2027-02-21", kind: "deadline", document: "schedule", page: 1, excerpt: "2027年2月21日（日）2週間前／数量変更締切日" },
    { id: "pdf-payment-deadline", phase: "deadlines", category: "精算", text: "ご精算締切", dueDate: "2027-02-24", kind: "deadline", document: "schedule", page: 1, excerpt: "2027年2月24日（水）11日前／ご精算締切日" },
    { id: "pdf-final-meeting", phase: "final", category: "5th stage", text: "最終確認・準備物のお預かり・挙式リハーサル", description: "約2時間。式の2週間前から案内されます。", kind: "window", period: "式の1〜2週間前", document: "schedule", page: 1, excerpt: "5th stage／最終確認・ご準備物のお預かり・挙式リハーサル" },
    { id: "pdf-final-fitting", phase: "final", category: "必要な場合", text: "直前ドレスフィッティング", description: "サイズ確認。必要に応じて行う案内です。", kind: "conditional", period: "式の1〜2週間前・必要に応じて", document: "schedule", page: 1, excerpt: "必要に応じて直前ドレスフィッティング（サイズ確認）" }
  ].map(task => ({ dueDate: "", dueTime: "", period: "", description: "", owner: "ふたり", done: false, source: "pdf", ...task }));
  return { version: 1, documents, phases, tasks };
});

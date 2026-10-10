(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.WEDDING_PREPARATION = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Drive内のPDFと、本人が共有した式場からの連絡。未記載の日時は補完しない。
  const documents = {
    octoberContact: { type: "message", title: "式場からの次回打ち合わせの連絡", receivedDate: "2026-10-10", paragraphs: [
      "10/25(日)15：00～　次回のお打合せ宜しくお願い致します♪",
      "次回は少し時間長くいただきましておふたりの一日の流れと必要なアイテムについて紹介させていただきます。おふたりが「こんな演出したいな」なことがございましたら、その際にぜひ教えてくださいませ。",
      "①ONE-Wの配席にてゲスト様のお席位置のご検討",
      "②招待状→紙とWEBの送り分け予定　手作りできそうかご検討ください！",
      "写真→集合写真は親御様にご相談してみてください！"
    ] },
    schedule: { title: "プリムローズ_結婚式スケジュール（2027-03-07）.pdf", id: "1VA-WOWwM5L_0wDAOvovJB7Yzh9Zu5Y9R", pages: 1 },
    homework: { title: "プリムローズ_打ち合わせメモ（1回目）.pdf", id: "1u2ixXzdW1htRmOH_fzEAt-1O3ABka3D1", pages: 1 },
    video: { title: "プリムローズ_映像・BGM準備_メール送受信確認.pdf", id: "1VwGeAt9tEAG7r6CR71r1rIYK9t6Z5GqE", pages: 2 },
    secondMeeting: { title: "プリムローズ_打ち合わせメモ（2回目）.pdf", id: "1uPT1daAijO96AKQclYgCGZtAO7P5Q5rU", pages: 1 },
    seating: { title: "結婚式_席順表見本.pdf", id: "1C3FWgyuS-rUKOCw1uwNIUR4IhjaZKA5T", pages: 1 },
    relationships: { title: "結婚式_続柄の書き方.pdf", id: "1hHrX7_pmA2LIKh9elTomQu5AosBADHaV", pages: 1 },
    invitationSamples: { title: "結婚式_招待状文例集.pdf", id: "1UmSojnZEx-lQOcJdVn8D-3b_VzOkTO91", pages: 1 },
    attireGuide: { title: "プリムローズ_お衣裳合わせのご案内.pdf", id: "1Jt57cwjP5pMXruTbdwyCrO5l37r17gjO", pages: 1 },
    fittingList: { title: "プリムローズ_衣裳試着一覧.pdf", id: "1CR7-mlnhS5aeDeFq_IfT6qyIs8mTKpl8", pages: 2 },
    familyAttire: { title: "プリムローズ_ご親族様衣裳・着付け価格表.pdf", id: "1fa8mbFDSLBAQyfIsS9CczrCbq982E_-M", pages: 1 },
    timelineGuide: { title: "プリムローズ_タイムスケジュール表ガイド.pdf", id: "1CScsNTW9WQ6Wiaod4eZ4Htvw2kZDqnsG", pages: 1 }
  };
  const phases = [
    { id: "next", title: "10月25日に向けた準備", period: "2026年10月25日 15:00まで" },
    { id: "homework", title: "初回打ち合わせからの準備", period: "9月19日の2nd打ち合わせ前まで" },
    { id: "appointments", title: "日程が決まっている打ち合わせ", period: "9月19日・9月27日・10月25日" },
    { id: "video", title: "映像・BGMサイトの登録", period: "日付の記載なし" },
    { id: "meetings", title: "今後の打ち合わせ", period: "資料に記載された実施時期" },
    { id: "attire", title: "衣裳・ヘアメイク・前撮り", period: "衣裳合わせスケジュール" },
    { id: "invitation", title: "招待状の日程案内", period: "2027年1月" },
    { id: "deadlines", title: "式場の締切", period: "2027年2月" },
    { id: "final", title: "最終確認", period: "式の1〜2週間前" }
  ];
  const tasks = [
    { id: "pdf-second-seating", phase: "next", category: "ONE-W", text: "ONE-Wでゲストの席位置を検討する", description: "10月10日の連絡で、次回までにゲストのお席位置を検討するよう案内されています。席順表見本では、4th STAGEまでに配席を整える案内もあります。", dueDate: "2026-10-25", dueTime: "15:00", kind: "homework", source: "message", document: "octoberContact", relatedDocument: "secondMeeting", excerpt: "ONE-Wの配席にてゲスト様のお席位置のご検討" },
    { id: "pdf-second-invitation", phase: "next", category: "招待状", text: "紙とWEBの送り分け・手作りを検討する", description: "誰に紙・WEBで送るか、手作りできそうかを検討します。紙を式場へ注文する場合は、2回目の打ち合わせ資料で10月中の連絡が案内されています。", dueDate: "2026-10-25", dueTime: "15:00", kind: "homework", source: "message", document: "octoberContact", relatedDocument: "secondMeeting", excerpt: "招待状→紙とWEBの送り分け予定　手作りできそうかご検討ください！" },
    { id: "pdf-second-photo", phase: "next", category: "写真", text: "集合写真について親御様に相談する", description: "集合写真をどうするか、親御様に相談します。以前の資料にある写真データ200カット・150,000円は別の検討項目で、選択・契約済みではありません。", dueDate: "2026-10-25", dueTime: "15:00", kind: "homework", source: "message", document: "octoberContact", relatedDocument: "secondMeeting", excerpt: "写真→集合写真は親御様にご相談してみてください！" },
    { id: "pdf-paper-invitation", phase: "next", category: "紙の招待状", text: "紙の招待状を注文する場合は担当者へ連絡する", description: "ONE-Wのカタログで候補をお気に入り登録し、紙を注文する場合に連絡します。", kind: "conditional", period: "2026年10月中・紙を注文する場合", document: "secondMeeting", page: 1, excerpt: "紙のご注文の場合はONE-Wカタログのお気に入り／ご注文の場合は10月中にご連絡ください" },
    { id: "pdf-onew-guests", phase: "homework", category: "ONE-W", text: "ONE-Wの招待者を仮登録する", dueDate: "2026-09-19", dueTime: "09:30", kind: "homework", period: "2nd打ち合わせ前まで", document: "homework", page: 1, excerpt: "One-Wの『招待者仮登録』" },
    { id: "pdf-onew-favorites", phase: "homework", category: "ONE-W", text: "カタログの気になるアイテムをお気に入り登録する", description: "ONE-Wの「カタログ」で、気になったアイテムに♡を付けます。", dueDate: "2026-09-19", dueTime: "09:30", kind: "homework", period: "2nd打ち合わせ前まで", document: "homework", page: 1, excerpt: "『カタログ』にて気になったアイテムをお気に入り登録（♡マーク）" },
    { id: "pdf-second-meeting", phase: "appointments", category: "2nd stage", text: "2nd打ち合わせ", description: "ペーパーアイテム紹介（席札・メニューカード・招待状・席次表）、ONE-W招待者登録確認、配席確認、写真ラインナップ（データ・アルバム）。約2時間。", dueDate: "2026-09-19", dueTime: "09:30", kind: "appointment", document: "schedule", page: 1, excerpt: "9/19（土）9:30〜／2nd stage" },
    { id: "pdf-costume-meeting", phase: "appointments", category: "衣裳", text: "衣裳合わせ", description: "所要時間は約2〜2.5時間。", dueDate: "2026-09-19", dueTime: "12:00", kind: "appointment", document: "schedule", page: 1, excerpt: "9/19（土）12:00〜／衣裳合わせ" },
    { id: "pdf-movie-meeting", phase: "appointments", category: "Movie", text: "映像打ち合わせ", description: "映像演出紹介、記録ビデオ、当日上映ムービー（オープニング・生い立ち等）。約2時間。", dueDate: "2026-09-27", dueTime: "14:00", kind: "appointment", document: "schedule", page: 1, excerpt: "9/27（日）14:00〜／Movie" },
    { id: "pdf-marrysys-email", phase: "video", category: "Marrysys", text: "メールの送受信を確認する", description: "check.prim@marrysys.jp 宛に、件名は披露宴日8桁「20270307」、本文は氏名フルネーム・携帯電話番号を記載。返信が届くか確認します。iCloudは返信に約1分かかる場合があります。", kind: "undated", document: "video", page: 1, excerpt: "STEP 1〜3／メールの送受信確認" },
    { id: "pdf-marrysys-registration", phase: "video", category: "Marrysys", text: "登録完了メールから本登録を行う", description: "代表1名の作業。数日中に届く登録完了メールのURLから、半角英数6文字以上のパスワードを設定します。", kind: "undated", document: "video", page: 2, excerpt: "STEP 4〜6／登録完了メールを確認・パスワード設定" },
    { id: "pdf-marrysys-profile", phase: "video", category: "Marrysys", text: "基本情報の氏名表記を確認する", description: "ログインIDは新郎の携帯番号。基本情報の氏名（漢字・アルファベット）を確認します。担当者とはメッセージで連絡でき、マイページはブックマークやホーム画面に追加できます。", kind: "undated", document: "video", page: 2, excerpt: "基本情報でお名前の漢字とアルファベットを必ずご確認ください" },
    { id: "pdf-third-meeting", phase: "meetings", category: "3rd stage", text: "3回目の打ち合わせ", description: "当日の一日の流れと必要なアイテムの紹介。希望する演出があれば相談できます。今回は長めの打ち合わせの案内で、終了時刻はまだ案内されていません。", dueDate: "2026-10-25", dueTime: "15:00", kind: "appointment", source: "message", document: "octoberContact", relatedDocument: "secondMeeting", excerpt: "10/25(日)15：00～／一日の流れと必要なアイテム／少し時間長く" },
    { id: "pdf-fourth-meeting", phase: "meetings", category: "4th stage", text: "会場装花・内容決定の打ち合わせ", description: "メイン・ゲストテーブルの装花打ち合わせ。配席・進行・引出物等の内容決定と見積書提示。約3時間。", kind: "window", period: "式の2〜3か月前", document: "schedule", page: 1, excerpt: "お式の2〜3か月前／4th stage" },
    { id: "pdf-emcee-meeting", phase: "meetings", category: "司会", text: "司会打ち合わせ", description: "披露宴の進行について決定。約1.5時間。", kind: "window", period: "式の1〜2か月前", document: "schedule", page: 1, excerpt: "お式の1〜2か月前／司会打合せ" },
    { id: "pdf-bgm-meeting", phase: "meetings", category: "BGM", text: "BGM打ち合わせ", description: "披露宴のBGMについて決定。約1.5時間。", kind: "window", period: "式の1〜2か月前", document: "schedule", page: 1, excerpt: "お式の1〜2か月前／BGM打ち合せ" },
    { id: "pdf-hair-bouquet", phase: "attire", category: "衣裳・美容", text: "ヘアメイク＆ブーケ", kind: "undated", document: "schedule", page: 1, excerpt: "衣裳合わせスケジュール／ヘアメイク＆ブーケ" },
    { id: "pdf-pre-wedding-photo", phase: "attire", category: "前撮り", text: "前撮り", description: "約5時間。前撮りは平日のみの案内です。", kind: "undated", document: "schedule", page: 1, excerpt: "前撮り 約5時間／平日のみのご案内" },
    { id: "pdf-family-costume", phase: "attire", category: "親族衣裳", text: "親族の衣裳合わせ", description: "約1時間。式の2か月前までに来館する案内です。", kind: "window", period: "式の2か月前まで", document: "schedule", page: 1, excerpt: "ご親族様の衣裳合わせ／ご結婚式の2か月前までにお越しくださいませ" },
    { id: "pdf-invitation-reply-guidance", phase: "invitation", category: "招待状", text: "招待状の返信日として案内された日", description: "2回目の打ち合わせメモでは、2027年1月19日（火・大安）を返信日として作成するよう案内されています。ONE-Wなどで実際に公開する期限は、送信前に確認してください。", dueDate: "2027-01-19", kind: "guidance", document: "secondMeeting", page: 1, excerpt: "ご返信 2027年1月19日（火）大安 にて作成をお願いいたします" },
    { id: "pdf-content-deadline", phase: "deadlines", category: "内容変更", text: "内容変更締切・ONE-Wロック", description: "料理・映像・写真・装花・引出物・ペーパーアイテム等。以後の人数変更は担当プランナーへ連絡する案内です。", dueDate: "2027-02-07", kind: "deadline", document: "schedule", page: 1, excerpt: "2027年2月7日（日）4週間前／内容変更締切日・ONE-Wロック" },
    { id: "pdf-quantity-deadline", phase: "deadlines", category: "数量変更", text: "数量変更締切", dueDate: "2027-02-21", kind: "deadline", document: "schedule", page: 1, excerpt: "2027年2月21日（日）2週間前／数量変更締切日" },
    { id: "pdf-payment-deadline", phase: "deadlines", category: "精算", text: "ご精算締切", dueDate: "2027-02-24", kind: "deadline", document: "schedule", page: 1, excerpt: "2027年2月24日（水）11日前／ご精算締切日" },
    { id: "pdf-final-meeting", phase: "final", category: "5th stage", text: "最終確認・準備物のお預かり・挙式リハーサル", description: "約2時間。式の2週間前から案内されます。", kind: "window", period: "式の1〜2週間前", document: "schedule", page: 1, excerpt: "5th stage／最終確認・ご準備物のお預かり・挙式リハーサル" },
    { id: "pdf-final-fitting", phase: "final", category: "必要な場合", text: "直前ドレスフィッティング", description: "サイズ確認。必要に応じて行う案内です。", kind: "conditional", period: "式の1〜2週間前・必要に応じて", document: "schedule", page: 1, excerpt: "必要に応じて直前ドレスフィッティング（サイズ確認）" }
  ].map(task => ({ dueDate: "", dueTime: "", period: "", description: "", owner: "ふたり", done: false, source: "pdf", ...task }));
  const meetingBrief = {
    document: "octoberContact", taskId: "pdf-third-meeting",
    preparationIds: ["pdf-second-seating", "pdf-second-invitation", "pdf-second-photo"],
    summary: "当日の一日の流れと、必要なアイテムの紹介があります。",
    durationNote: "今回は長めの打ち合わせです。終了時刻は未案内です。",
    optionalTopic: "やってみたい演出があれば、この日に相談できます。"
  };
  return { version: 3, documents, phases, tasks, meetingBrief };
});

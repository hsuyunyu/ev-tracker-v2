# 搬遷：ev-tracker-119e6 → wattwise-rose

目標：帳號、資料、網頁、iOS App 全部搬到新專案 `wattwise-rose`，最後停用 `ev-tracker-119e6`。

**2026-10-04 已完成切換**：網頁與 iOS App 都已改連新專案，`main` 即為新專案的版本。

| | 舊 | 新 |
|---|---|---|
| Project ID | `ev-tracker-119e6` | `wattwise-rose` |
| 網頁網址 | `ev-tracker-119e6.firebaseapp.com` | `wattwise.web.app` |
| Hosting site | `ev-tracker-119e6` | `wattwise` |
| iOS Bundle ID | `com.rosehsu.EVTracker` | `com.rosehsu.WattWise` |

## 進度（2026-10-04）

- 階段 1～3 已完成：
  - 帳號：只搬了 2 個 Google 帳號（uid 不變）；舊專案另有 20 個匿名帳號（最後登入 2026-01），未搬。
  - 資料：160 份文件，`--verify` 兩邊一致。
  - 網頁：已部署到 `wattwise.web.app`，實測登入、數字、新增刪除都正常。
  - iOS：已實機驗證登入與帳本。切換時另外踩到 `Info.plist` 的 `GIDClientID` 還是舊用戶端，
    點登入就閃退，已修正（iOS repo `2a8ae81`）。
- 階段 4 尚未開始。在完成前，**舊網址與舊版 App 仍連著舊專案**，在那邊記的帳不會出現在新專案。
- ⚠️ **舊專案還不能停用**：root 集合 `stock-prices` 在 2026-10-02 仍有寫入，表示有 WattWise
  以外的程式在用 `ev-tracker-119e6`。要先弄清楚是誰、搬去哪，才能做階段 4 的最後一步。
- 舊專案另有已廢棄的 root 集合（`records`、`vehicles`、`recurring`、`settings`、`trips`、
  `artifacts`、`stock-report`），預設不搬；是否用 `--all` 留底尚未決定。

---

## 階段 1：開通新專案（已完成）

- [x] **Firestore**：`asia-east1`、Standard、原生模式，與舊專案相同。
- [x] **Authentication**：啟用 Google 登入。
- [x] **OAuth 重新導向網址**（已實測登入）：Google Cloud Console → API 和服務 → 憑證 → 網頁用戶端，
      「已授權的重新導向 URI」加入 `https://wattwise.web.app/__/auth/handler`。
      少了這步，手機登入會 `redirect_uri_mismatch`（舊專案的 web.app 就是卡在這裡）。
- [x] **已授權網域**：已加入 `wattwise.web.app`。
- [x] **iOS App**：以新的 Bundle ID `com.rosehsu.WattWise` 註冊，設定檔已下載（先不要放進專案）。
- [x] **本機憑證**（搬資料的腳本要用）：

```bash
gcloud auth application-default login
```

## 階段 2：預演（已完成，可重複做）

- [x] 部署規則到新專案（規則檔在 iOS repo）：

```bash
cd /Users/rosehsu/Projects/wattwise && firebase deploy --only firestore:rules --project wattwise-rose
```

- [x] 預演資料複製，看會搬哪些集合、各幾筆（只讀舊專案，不寫入）：

```bash
npm run migrate
```

- [x] 實際複製一次並比對，確認腳本沒問題。切換當天會再跑一次，以當時的資料為準：

```bash
npm run migrate -- --write
```

```bash
npm run migrate -- --verify
```

## 階段 3：切換（2026-10-04 已完成）

從這裡開始，**所有人先不要用 App 和網頁記帳**，直到階段 3 結束。
兩邊同時寫入會讓資料分岔，之後無法自動合併。

1. **搬帳號**（保留原本的 uid —— 帳本成員是用 uid 記的，換了就對不上）：

```bash
mkdir -p migration && firebase auth:export migration/users.json --project ev-tracker-119e6
```

```bash
firebase auth:import migration/users.json --project wattwise-rose
```

   `migration/` 已列入 `.gitignore`，裡面有使用者個資，搬完請刪除。

2. **搬資料並比對**（`--verify` 必須顯示「兩邊一致」才往下做）：

```bash
npm run migrate -- --write
```

```bash
npm run migrate -- --verify
```

3. **部署網頁**到新專案：

```bash
npm run build && firebase deploy --only hosting --project wattwise-rose
```

4. **登入 `https://wattwise.web.app` 驗證**：帳本有載入、筆數與總額跟舊站一致、新增一筆再刪掉。
   這一步沒過就不要往下做，舊站仍可照常使用。

5. **iOS App**：
   - 把 `WattWise/Resources/GoogleService-Info.plist` 換成新專案的。
   - `Info.plist` 的 URL scheme 改成新 plist 的 `REVERSED_CLIENT_ID`。
   - `project.yml` 的 Bundle ID 改三處：iPhone App → `com.rosehsu.WattWise`、
     手錶 App → `com.rosehsu.WattWise.watchkitapp`、`WKCompanionAppBundleIdentifier`。
   - `xcodegen generate` 後重新建置安裝到手機與手錶，登入確認資料正常。
   - Bundle ID 換了，手機會把它當成新的 App：舊的要手動刪除，並重新允許通知。

6. 合併這個分支回 `main`，並更新 iOS repo 的 `CLAUDE.md` / `AGENTS.md`（專案 ID、網址、部署指令）。

## 階段 4：收尾

- [ ] 舊網址改成導向新網址（在 `main` 之外另外部署一個只有轉址的頁面到 `ev-tracker-119e6`）。
- [ ] 鎖住舊專案的 Firestore（規則改成全部拒絕），避免有人用舊版 App 繼續寫入。
- [ ] 觀察至少兩週，確認沒有人還在用舊專案。
- [ ] 刪除 `migration/` 與本機的匯出檔。
- [ ] 確認 `stock-prices` 等非 WattWise 的使用者已搬走（見上方「進度」）。
- [ ] 停用 `ev-tracker-119e6`。專案刪除後 30 天內還能還原，之後無法復原。

## 退回方式

階段 3 的第 1～4 步都不會動到舊專案，任何一步出問題：不要做後面的步驟，大家繼續用舊站即可。
第 5 步之後若要退回，把 iOS 的 plist 換回舊的重新安裝，並從 `main` 重新部署網頁到舊專案。
退回前在新專案記的帳需要手動補回舊專案。

## 腳本說明

`scripts/migrate-firestore.mjs` 複製 `users`、`householdInvites`、`households` 及底下所有子集合，
文件 ID 原樣保留，來源專案全程只讀。預演時會列出被略過的舊 root 集合（2026 年初遷移前留下的），
要一起搬就加 `--all`。

# Test Plan — MyDigitalAhLong

---

## 1. Group Management

### 1.1 Create New Group

| Step | Action                                                              | Expected Result                                                                                 |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1    | Click the `+` tab button in the group tabs bar                      | A prompt dialog appears with title "New group name:" and a random name pre-filled               |
| 2    | Type "Trip to Langkawi" in the dialog input and click "let's go 🚀" | A new group tab "Trip to Langkawi" appears, becomes the active tab, all sections reset to empty |
| 3    | Leave the dialog input empty and click "let's go 🚀"                | Nothing happens — dialog closes, no new group is created                                        |
| 4    | Click "nvm 🏃" in the prompt dialog                                 | Dialog closes, no new group is created                                                          |

### 1.2 Switch Group

| Step | Action                                          | Expected Result                                                                                                                     |
| ---- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Click a non-active group tab (e.g. "Hutang FC") | That tab becomes active (highlighted), the members list, expenses, settlement, and transaction log update to show that group's data |

### 1.3 Rename Group

| Step | Action                                         | Expected Result                                                                        |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1    | Click the group name heading (h2)              | A prompt dialog appears with title "Group name:" and the current group name pre-filled |
| 2    | Type "Japan Trip 2026" and click "let's go 🚀" | The heading and the active tab update to "Japan Trip 2026"                             |
| 3    | Clear the input and click "let's go 🚀"        | Dialog closes, group name remains unchanged                                            |

### 1.4 Delete Group

| Step | Action                                     | Expected Result                                                                                                     |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 1    | Click the 🗑️ button next to the group name | A confirm dialog appears: `Delete group "GroupName"? 💀`                                                            |
| 2    | Click "do it 🫡"                           | The group is removed, the next available group becomes active, UI updates                                           |
| 3    | Click "nah fam 🙅"                         | Dialog closes, nothing is deleted                                                                                   |
| 4    | When only 1 group exists, click 🗑️ button  | Confirm dialog still appears — deletion is allowed                                                                  |
| 5    | Confirm deletion of the last group         | Group is deleted, landing page is shown with "No groups yet!" message and "🚀 Start a Group" button, URL is cleared |

### 1.5 Landing Page (No Groups)

| Step | Action                                         | Expected Result                                                                           |
| ---- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | Open the app with no groups in localStorage    | Landing page is shown with title, "No groups yet!" message, and "🚀 Start a Group" button |
| 2    | Click "🚀 Start a Group"                       | A prompt dialog appears with title "New group name:" and a random name pre-filled         |
| 3    | Type "Weekend Trip" and click "let's go 🚀"    | A new group is created, landing page hides, app content shows with the new group active   |
| 4    | Leave the dialog input empty and click confirm | Nothing happens — dialog closes, landing page remains visible                             |
| 5    | URL when on landing page                       | URL has no hash fragment (clean path only)                                                |

---

## 2. Members

### 2.1 Add Member

| Step | Action                                                                           | Expected Result                                                                                                                                                               |
| ---- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Type "Alice" in the "Add member name" input, leave payment empty, click "Add"    | "Alice" appears as a member tag in the gang section. Toast shows "👋 Alice joined the gang". "Alice" appears in the "Paid by" dropdown, split checkboxes, and "I am" selector |
| 2    | Type "Bob" in member input, type "DuitNow 012-345" in payment input, click "Add" | "Bob" tag appears with a 💳 icon. Payment method is saved to localStorage                                                                                                     |
| 3    | Submit the form with empty name input                                            | Nothing happens (HTML required validation prevents submit)                                                                                                                    |
| 4    | Type "Alice" again (duplicate) and click "Add"                                   | Nothing changes — duplicate is silently ignored                                                                                                                               |

### 2.2 Member Menu (tap member tag)

| Step | Action                                                     | Expected Result                                                                                                                                                                    |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Click the "Alice" member tag                               | A dialog opens showing Alice's avatar, name, and payment method (or "no payment method set"). Buttons: ✏️ Rename, 🎭 Change Icon, 💳 Edit Payment, 🗑️ Remove Member, close          |
| 2    | Click "🎭 Change Icon"                                     | An avatar grid dialog appears with 54 emoji options. The current avatar is highlighted                                                                                             |
| 3    | Click a new emoji (e.g. 😎) in the avatar grid             | Dialog closes. Alice's avatar updates to 😎 everywhere (member list, expenses, settlement). Toast: "😎 Icon updated for Alice"                                                     |
| 4    | Click "💳 Edit Payment"                                    | A prompt dialog appears with title "Payment method for Alice:" and current payment pre-filled                                                                                      |
| 5    | Type "Touch 'n Go 019-999" and confirm                     | Dialog closes. Alice's tag now shows 💳. Payment is stored in localStorage. Toast shows update message                                                                             |
| 6    | Click "❌ Remove Payment" (only visible if payment exists) | Dialog closes. Payment removed. 💳 icon disappears from tag. Toast confirms                                                                                                        |
| 7    | Click "🗑️ Remove Member"                                   | A confirm dialog: `Remove Alice? Their expenses go poof too 💨`                                                                                                                    |
| 8    | Confirm removal                                            | Alice is removed from members list, all her expenses are removed, her name is removed from split lists of remaining expenses (expenses with no one left in split are also removed) |
| 9    | Click "✏️ Rename"                                          | A prompt dialog appears with title `Rename "Alice" to:` and "Alice" pre-filled                                                                                                     |
| 10   | Type "Alicia" and confirm                                  | Member name updates to "Alicia" everywhere (member list, expenses paidBy/splitAmong/addedBy, avatar, payment). Toast: `✏️ Renamed "Alice" → "Alicia"`                              |
| 11   | Click "close"                                              | Dialog closes, no changes                                                                                                                                                          |

### 2.3 "I am" Selector

| Step | Action                                  | Expected Result                                                                                                                                     |
| ---- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Select "Alice" from the "I am" dropdown | Value is saved to localStorage. "Paid by" dropdown now defaults to "Alice" when adding expenses. Alice can see delete buttons on expenses she added |
| 2    | When no members exist                   | Dropdown shows only "who dis?" (disabled placeholder)                                                                                               |

---

## 3. Expenses

### 3.1 Add Expense

| Step | Action                                                                                                                 | Expected Result                                                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Fill: Description="Lunch", Currency="RM MYR", Amount=30.00, Paid by="Alice", all members checked → click "Add Expense" | Expense appears in the Expenses section showing "Lunch RM30.00 Paid by Alice · Split: Alice, Bob". Toast: "🧧 Added: Lunch (RM30.00)". Description and amount inputs clear. Settlement section updates |
| 2    | Uncheck "Bob" in split checkboxes, fill remaining fields and submit                                                    | Expense is split only among checked members                                                                                                                                                            |
| 3    | Change currency to "S$ SGD", amount=50, submit                                                                         | Expense shows as S$50.00. Settlement groups expenses by currency                                                                                                                                       |
| 4    | Leave description empty and click "Add Expense"                                                                        | Error dialog: "Fill in all fields lah 🫠"                                                                                                                                                              |
| 5    | Leave amount empty and click "Add Expense"                                                                             | Error dialog: "Fill in all fields lah 🫠"                                                                                                                                                              |
| 6    | Leave "Paid by" unselected and click "Add Expense"                                                                     | Error dialog: "Fill in all fields lah 🫠"                                                                                                                                                              |
| 7    | Uncheck all split checkboxes and click "Add Expense"                                                                   | Error dialog: "Fill in all fields lah 🫠"                                                                                                                                                              |

### 3.2 Delete Expense

| Step | Action                                                             | Expected Result                                                                                                                        |
| ---- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | "I am" is set to "Alice". Click "Delete" on an expense Alice added | Confirm dialog: `Delete "Lunch"? 🗑️`                                                                                                   |
| 2    | Click "do it 🫡"                                                   | Expense disappears from the Expenses list. Transaction log shows "❌ Deleted: Lunch" with the original amount. Settlement recalculates |
| 3    | Click "nah fam 🙅"                                                 | Dialog closes, expense remains                                                                                                         |
| 4    | "I am" is set to "Bob". Look at expense added by Alice             | No "Delete" button is shown for that expense                                                                                           |
| 5    | Expense is after a settlement in the same currency                 | Expense shows 🔒 settled icon, no delete button                                                                                        |

### 3.3 Empty State

| Step | Action                   | Expected Result                                                      |
| ---- | ------------------------ | -------------------------------------------------------------------- |
| 1    | No expenses in the group | Expenses section shows: "🎶 nothing here yet... go spend some money" |

---

## 4. Settlement (Who Owes Who)

### 4.1 View Debts

| Step | Action                                    | Expected Result                                                   |
| ---- | ----------------------------------------- | ----------------------------------------------------------------- |
| 1    | Alice paid RM30 split among Alice and Bob | Settlement shows: "Bob owes Alice RM15.00" under "RM MYR" heading |
| 2    | Multiple currencies with expenses         | Settlement groups debts by currency with separate headings        |
| 3    | No expenses                               | Settlement shows: "add some expenses first lah 🫠"                |
| 4    | All debts are settled                     | Settlement shows celebration: "ALL SETTLED BABYYYY" with confetti |

### 4.2 Click a Debt (Pay Up Modal)

| Step | Action                                      | Expected Result                                                                                                                                     |
| ---- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Click the debt row "Bob owes Alice RM15.00" | Meme modal appears showing a random shaming emoji, the debt info, a meme quote, and if Alice has a payment method it shows "💳 Pay via: ..."        |
| 2    | Click "Mark as Settled" button in the modal | Modal closes. A settlement expense "💸 Settlement: Bob → Alice" (RM15.00) is added. After 300ms, a "settled" modal appears with a celebratory quote |
| 3    | Click ✕ or click outside the modal          | Modal closes, nothing happens                                                                                                                       |

### 4.3 Settle via Button on Debt Row

| Step | Action                                                                       | Expected Result                                                                                       |
| ---- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1    | Click the "Mark as Settled" button (data-settle-from) directly on a debt row | Confirm dialog: `Mark Bob → Alice (RM15.00) as settled?` (includes payment method if set)             |
| 2    | Confirm                                                                      | Settlement expense added, debts recalculate, expenses before this in same currency become locked (🔒) |

---

## 5. Transaction Log

| Step | Action                       | Expected Result                                                                                                |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | Add an expense "Dinner RM50" | Transaction log shows 🧾 icon, "Dinner", "Alice · 2026-06-11 14:30 · by Alice", "RM50.00" (most recent on top) |
| 2    | Delete an expense            | Transaction log shows ❌ icon, "❌ Deleted: Dinner", with the original amount                                  |
| 3    | Settle a debt                | Transaction log shows 🤝 icon, "💸 Settlement: Bob → Alice", highlighted differently                           |
| 4    | No expenses                  | Shows "no transactions yet"                                                                                    |

---

## 6. Sharing

### 6.1 Copy Link

| Step | Action                      | Expected Result                                                                                                            |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | Click "🔗 Copy Link" button | Current page URL (with compressed state in hash) is copied to clipboard. Toast: "Link copied! Share it with your group 🔗" |
| 2    | Clipboard permission denied | A dialog shows: "Copy this link manually (clipboard denied lol)"                                                           |

### 6.2 Social Share

| Step | Action               | Expected Result                                                  |
| ---- | -------------------- | ---------------------------------------------------------------- |
| 1    | Click WhatsApp icon  | Opens `wa.me/?text=...` in new tab with the page URL and message |
| 2    | Click Telegram icon  | Opens `t.me/share/url?...` in new tab                            |
| 3    | Click X/Twitter icon | Opens `twitter.com/intent/tweet?...` in new tab                  |
| 4    | Click Facebook icon  | Opens `facebook.com/sharer/...` in new tab                       |

### 6.3 Open Shared Link

| Step | Action                                         | Expected Result                                                                                      |
| ---- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1    | Open a URL with a valid fflate-compressed hash | The group data is decoded from the hash and imported into localStorage. UI renders that group's data |
| 2    | Open a URL with an invalid/corrupt hash        | Falls back to loading from localStorage or creating a new empty group                                |

### 6.4 Import Group via Paste Link

| Step | Action                                                                    | Expected Result                                                                             |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1    | Paste a valid shared URL (with hash) into the import input and submit     | Group is decoded and imported. UI switches to the imported group. Toast confirms import      |
| 2    | Paste a URL without a hash fragment and submit                            | Toast: "No group data found in that link 🤔"                                                |
| 3    | Paste a URL with an invalid/corrupt hash and submit                       | Toast: "Invalid link — couldn't decode group data 💀"                                       |

---

## 7. Currency Preferences

### 7.1 Reorder Currencies (Desktop Drag)

| Step | Action                                               | Expected Result                                                                                                                     |
| ---- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Drag the "S$ SGD" pill before "RM MYR" pill and drop | Currency order updates. "S$ SGD" is now the first option in the expense currency dropdown. Toast: "Reordered! SGD is now on top 👆" |

### 7.2 Reorder Currencies (Mobile Touch)

| Step | Action                                           | Expected Result                                                       |
| ---- | ------------------------------------------------ | --------------------------------------------------------------------- |
| 1    | Touch and drag a currency pill to a new position | Same behavior as desktop drag — reorders and persists to localStorage |

---

## 8. Dialog System

| Step | Action                                         | Expected Result                                                                                      |
| ---- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1    | Any dialog opens                               | Shows a random emoji and a random meme quote matching the dialog type (error/confirm/prompt/success) |
| 2    | Click outside the dialog overlay (on backdrop) | Dialog closes, triggers cancel callback                                                              |
| 3    | In a prompt dialog, press Enter                | Submits the input value (same as clicking confirm)                                                   |
| 4    | In a prompt dialog, press Escape               | Closes dialog (same as clicking cancel)                                                              |
| 5    | Error dialog                                   | Only shows one "aight bet 👍" button                                                                 |
| 6    | Confirm dialog                                 | Shows "nah fam 🙅" and "do it 🫡" buttons                                                            |
| 7    | Prompt dialog                                  | Shows input field, "nvm 🏃" and "let's go 🚀" buttons                                                |

---

## 9. State Persistence

| Step | Action                                          | Expected Result                                           |
| ---- | ----------------------------------------------- | --------------------------------------------------------- |
| 1    | Add members and expenses, then refresh the page | All data is preserved — loaded from localStorage          |
| 2    | Add data, copy the URL, open in incognito       | Data is decoded from the URL hash and displayed correctly |
| 3    | Switch groups and refresh                       | The last active group tab is remembered and restored      |
| 4    | Change "I am" selection and refresh             | The selection persists via localStorage                   |
| 5    | Change avatar/payment for a member and refresh  | Avatars and payment methods persist via localStorage      |

---

## 10. Edge Cases

| Step | Action                                           | Expected Result                                                                  |
| ---- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1    | Add expense with amount 0.01 (minimum)           | Expense is added successfully with RM0.01                                        |
| 2    | Add expense where payer is not in the split list | Payer's balance goes positive (they are owed), split members go negative         |
| 3    | All members removed from a group                 | Expenses list is empty, settlement empty, "I am" dropdown shows only placeholder |
| 4    | Very long member name or description             | UI handles overflow gracefully (text truncates or wraps)                         |
| 5    | Multiple settlements in the same currency        | Each settlement locks all prior expenses in that currency                        |
| 6    | Expense amount with many decimals (e.g. 10.999)  | Amount is rounded to 2 decimal places (11.00)                                    |

---

## 11. Theme Toggle

| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Click the theme toggle button (☀️/🌙) | Theme switches between light and dark. `data-theme` attribute on `<html>` updates. Button icon changes |
| 2 | Refresh the page after toggling | Theme persists (saved in localStorage) |
| 3 | Clear localStorage theme preference | Falls back to system preference (`prefers-color-scheme`) |
| 4 | Change OS dark mode setting with no saved preference | App follows system setting automatically |

---

## 12. Split All/None Toggle

| Step | Action | Expected Result |
| ---- | ------ | --------------- |
| 1 | Group has 3+ members. Click "all" toggle button | All split checkboxes become checked |
| 2 | Click "none" toggle button | All split checkboxes become unchecked |
| 3 | Group has 2 or fewer members | Toggle buttons are not shown |

---

## 13. PWA Install

### 13.1 Install Banner

| Step | Action                                              | Expected Result                                                                                         |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1    | Open the app in a browser (not standalone)          | Install banner is visible at the bottom with "📲 Install app for quick access" and an "Install" button  |
| 2    | Click "Install" (Chromium browser)                  | Native browser install prompt appears. On accept, toast: "App installed! 🎉" and banner hides           |
| 3    | Click "Install" (Safari/Firefox — no native prompt) | Toast shows manual instructions: "Tap Share (↑) → Add to Home Screen" (iOS) or "Menu (⋮) → Install app" |
| 4    | Open the app in standalone mode (already installed) | Install banner is hidden                                                                                |

### 13.2 Install Modal (after 3 expenses)

| Step | Action                                       | Expected Result                                                                     |
| ---- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1    | Add 1st and 2nd expense                      | No install modal appears                                                            |
| 2    | Add 3rd expense                              | A confirm dialog appears: "📲 Install MyDigitalAhLong for quick access?"            |
| 3    | Click "do it 🫡" in the modal (Chromium)     | Native install prompt fires. On accept, toast: "App installed! 🎉" and banner hides |
| 4    | Click "nah fam 🙅" in the modal              | Dialog closes, no install action taken                                              |
| 5    | Add more expenses after modal was shown once | Modal does not appear again (one-time prompt)                                       |
| 6    | App is already in standalone mode            | Modal never appears regardless of expense count                                     |

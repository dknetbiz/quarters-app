# NJHPS Quarters Management — Complete Setup Guide

## What you'll have after this setup
- A web app (PWA) running at `https://YOUR_USERNAME.github.io/quarters-app/`
- Accessible from any phone/PC browser — no install needed
- All data stored in YOUR Google Sheet — you own it
- Every change logged with user name + timestamp

---

## STEP 1 — Create the Google Sheet

1. Go to **sheets.google.com** → New spreadsheet
2. Name it: `NJHPS Quarters Management`
3. Create these exact tabs (click + at bottom):
   - `Quarters`
   - `Employees`
   - `Allotments`
   - `Key_Register`
   - `Rent_Recovery`
   - `Audit_Log`
4. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**THIS_PART**`/edit`
   Save this — you need it later.

---

## STEP 2 — Google Cloud Console Setup

### 2a. Create a Project
1. Go to **console.cloud.google.com**
2. Click "Select a project" → "New Project"
3. Name: `quarters-app` → Create

### 2b. Enable APIs
1. Go to **APIs & Services → Library**
2. Search and enable: **Google Sheets API**
3. Search and enable: **Google Drive API**
4. Search and enable: **Google Identity** (usually auto-enabled)

### 2c. Create OAuth Client ID
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. If asked, configure consent screen first:
   - User Type: **External**
   - App name: `NJHPS Quarters`
   - Your email → Save
   - Add scope: `../auth/spreadsheets`
   - Add your email as Test User → Save
4. Back to Create Credentials → OAuth client ID:
   - Application type: **Web application**
   - Name: `quarters-app`
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for local dev)
     - `https://YOUR_GITHUB_USERNAME.github.io` (for production)
   - Click **Create**
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`)

### 2d. Create API Key
1. **Create Credentials → API Key**
2. Click **Edit** on the new key → Restrict it:
   - API restrictions: Google Sheets API only
3. Copy the **API Key**

---

## STEP 3 — GitHub Setup

### 3a. Create Repository
1. Go to **github.com** → New repository
2. Name: `quarters-app`
3. Public → Create
4. Upload all project files (or use git push)

### 3b. Add Secrets
1. Repository → **Settings → Secrets and variables → Actions**
2. Add these 3 secrets (New repository secret):

| Secret Name | Value |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Your OAuth Client ID |
| `VITE_SPREADSHEET_ID` | Your Google Sheet ID |
| `VITE_API_KEY` | Your API Key |

### 3c. Enable GitHub Pages
1. Repository → **Settings → Pages**
2. Source: **GitHub Actions**
3. Save

---

## STEP 4 — Deploy

Push code to the `main` branch → GitHub Actions auto-builds and deploys.

After ~2 minutes: `https://YOUR_USERNAME.github.io/quarters-app/`

---

## STEP 5 — Local Development (optional)

```bash
# Copy env file
cp .env.example .env

# Fill in your values in .env

# Install and run
npm install
npm run dev

# Opens at http://localhost:5173/quarters-app/
```

---

## STEP 6 — First Run

1. Open the app URL
2. Click **Continue with Google**
3. Sign in with your Google account
4. The app auto-creates headers in all 6 sheet tabs
5. Start adding quarters from the Quarters tab

---

## Sheet Structure Reference

### Quarters tab
| Quarter_ID | Quarter_No | Type | Block | Location | Status | Remarks |

### Employees tab
| Emp_ID | Name | Designation | Department | Category | Active |

### Allotments tab
| Allotment_ID | Quarter_ID | Emp_ID | Allotment_Date | Allotment_Type | Rent | Vacated_Date | Status | Remarks |

### Key_Register tab
| Key_ID | Quarter_ID | Held_By | Issued_Date | Returned_Date | Status | Remarks |

### Rent_Recovery tab
| Rent_ID | Allotment_ID | Quarter_ID | Emp_ID | Month | Standard_Rent | Actual_Recovery | Difference | Remarks |

### Audit_Log tab (auto-filled)
| Timestamp | User_Email | User_Name | Action | Module | Record_ID | Old_Value | New_Value |

---

## Importing Existing Excel Data

Once the sheet is set up, run the migration script:

```bash
pip install pandas openpyxl gspread google-auth
python migrate_data.py
```

(Migration script handles AllQuatersStatus2_New.xlsx, Key_Register.xlsx, MainDaata.xlsx, Rent_Register.xlsx)

---

## Authorizing More Users

1. Go to Google Cloud Console → OAuth consent screen
2. Add their email under **Test users**
3. Or publish the app (removes test user restriction) — for internal use, test users is fine with up to 100 users

---

## PWA Install (Mobile)

**Android Chrome:**
- Open app URL → Menu → "Add to Home Screen"

**iPhone Safari:**
- Open app URL → Share button → "Add to Home Screen"

App will open fullscreen like a native app.

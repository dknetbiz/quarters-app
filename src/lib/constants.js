// ============================================================
// CONFIGURATION — Fill these after Google Cloud setup
// ============================================================

export const CONFIG = {
  // From Google Cloud Console → APIs & Services → Credentials
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID.apps.googleusercontent.com',

  // Your Google Spreadsheet ID (from the URL)
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  SPREADSHEET_ID: import.meta.env.VITE_SPREADSHEET_ID || 'YOUR_SPREADSHEET_ID',

  // Google Sheets API Key (for read operations)
  API_KEY: import.meta.env.VITE_API_KEY || 'YOUR_API_KEY',

  // Scopes needed
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
}

// ============================================================
// SHEET TAB NAMES — must match exactly in your Google Sheet
// ============================================================
export const SHEETS = {
  QUARTERS:    'Quarters',
  EMPLOYEES:   'Employees',
  ALLOTMENTS:  'Allotments',
  KEY_REGISTER:'Key_Register',
  RENT:        'Rent_Recovery',
  AUDIT:       'Audit_Log',
}

// ============================================================
// COLUMN DEFINITIONS — A=0, B=1, C=2 ... (0-indexed)
// ============================================================
export const COLS = {
  QUARTERS: {
    ID: 0, QUARTER_NO: 1, TYPE: 2, BLOCK: 3,
    LOCATION: 4, STATUS: 5, REMARKS: 6
  },
  EMPLOYEES: {
    ID: 0, NAME: 1, DESIGNATION: 2, DEPARTMENT: 3, CATEGORY: 4, ACTIVE: 5
  },
  ALLOTMENTS: {
    ID: 0, QUARTER_ID: 1, EMP_ID: 2, ALLOTMENT_DATE: 3,
    ALLOTMENT_TYPE: 4, RENT: 5, VACATED_DATE: 6, STATUS: 7, REMARKS: 8
  },
  KEY_REGISTER: {
    ID: 0, QUARTER_ID: 1, HELD_BY: 2, ISSUED_DATE: 3,
    RETURNED_DATE: 4, STATUS: 5, REMARKS: 6
  },
  RENT: {
    ID: 0, ALLOTMENT_ID: 1, QUARTER_ID: 2, EMP_ID: 3,
    MONTH: 4, STANDARD_RENT: 5, ACTUAL_RECOVERY: 6, DIFFERENCE: 7, REMARKS: 8
  },
  AUDIT: {
    TIMESTAMP: 0, USER_EMAIL: 1, USER_NAME: 2, ACTION: 3,
    MODULE: 4, RECORD_ID: 5, OLD_VALUE: 6, NEW_VALUE: 7
  }
}

// ============================================================
// DROPDOWN OPTIONS
// ============================================================
export const QUARTER_TYPES = ['Type-I','Type-II','Type-III','Type-IV','Type-A','Type-B','Type-C','Type-D','Type-FA','Type-FB','Type-C&D','Type-D1']
export const LOCATIONS     = ['Jhakri','Shimla','LHEP','RHPS','Duttnagar','Kalpa']
export const STATUSES      = ['Occupied','Vacant','Under Repair','Reserved']
export const CATEGORIES    = ['General','SC','ST','OBC']
export const ALLOTMENT_TYPES = ['Allotment','First Change','Second Change','Women Quota','Medical Ground','Compassionate']
export const DEPARTMENTS   = ['NJHPS','RHPS','LHEP','CISF','BSNL','FA','Other']

// ============================================================
// CONFIGURATION
// ============================================================
export const CONFIG = {
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  SPREADSHEET_ID:   import.meta.env.VITE_SPREADSHEET_ID   || 'YOUR_SPREADSHEET_ID',
  API_KEY:          import.meta.env.VITE_API_KEY           || 'YOUR_API_KEY',
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
  ORDERS:      'Draft_Orders',   // NEW — draft allotment order workflow
  AUDIT:       'Audit_Log',
}

// ============================================================
// COLUMN DEFINITIONS
// ============================================================
export const COLS = {
  QUARTERS:  { ID:0, QUARTER_NO:1, TYPE:2, BLOCK:3, LOCATION:4, STATUS:5, REMARKS:6 },
  EMPLOYEES: { ID:0, NAME:1, DESIGNATION:2, DEPARTMENT:3, CATEGORY:4, ACTIVE:5, GRADE_LEVEL:6, SENIORITY_DATE:7 },
  ALLOTMENTS:{ ID:0, QUARTER_ID:1, EMP_ID:2, ALLOTMENT_DATE:3, ALLOTMENT_TYPE:4, RENT:5, VACATED_DATE:6, STATUS:7, REMARKS:8 },
  KEY_REGISTER:{ ID:0, QUARTER_ID:1, HELD_BY:2, ISSUED_DATE:3, RETURNED_DATE:4, STATUS:5, REMARKS:6 },
  RENT:      { ID:0, ALLOTMENT_ID:1, QUARTER_ID:2, EMP_ID:3, MONTH:4, STANDARD_RENT:5, ACTUAL_RECOVERY:6, DIFFERENCE:7, REMARKS:8 },
  ORDERS:    {
    ID:0, ORDER_NO:1, DRAFT_DATE:2, EFFECTIVE_DATE:3,
    CATEGORY:4, MODE:5, QUARTER_ID:6, OLD_QUARTER_ID:7,
    EMP_ID:8, ENTITY_NAME:9, ENTITY_TYPE:10, SJVN_UNIT:11,
    RENT:12, REMARKS:13, STATUS:14, ISSUED_DATE:15,
    REJECTED_DATE:16, REJECTED_REASON:17, CREATED_BY:18
  },
  AUDIT:     { TIMESTAMP:0, USER_EMAIL:1, USER_NAME:2, ACTION:3, MODULE:4, RECORD_ID:5, OLD_VALUE:6, NEW_VALUE:7 },
}

// ============================================================
// COMPANY & UNIT
// ============================================================
export const COMPANY     = 'SJVN Limited'
export const UNIT        = 'NJHPS'
export const UNIT_FULL   = 'National Jalvidyut Power Station'
export const UNIT_ADDR   = 'NJHPS, Jhakri — 172 201, District Rampur Bushahr, H.P.'

// ============================================================
// TYPE MASTER
// id       — value stored in the sheet (never change once data exists)
// display  — short label shown in UI (1, 2, A, CD …)
// group    — logical grouping; multiple stored types can belong to one group
//            e.g. Type-I, Type-II and Type-A all belong to group 'A'
// ============================================================
export const TYPE_MASTER = [
  { id: 'Type-I',   display: '1',   group: 'A'  },
  { id: 'Type-II',  display: '2',   group: 'A'  },
  { id: 'Type-A',   display: 'A',   group: 'A'  },
  { id: 'Type-0C',  display: '0C',  group: 'A'  },  // converted 0/C&D rooms — A-equivalent per Rule 4(b)
  { id: 'Type-III', display: '3',   group: 'B'  },
  { id: 'Type-B',   display: 'B',   group: 'B'  },
  { id: 'Type-IV',  display: '4',   group: 'C'  },  // Rule 4(b): MIG equivalent → C
  { id: 'Type-C',   display: 'C',   group: 'C'  },
  { id: 'Type-D',   display: 'D',   group: 'D'  },
  { id: 'Type-D1',  display: 'D1',  group: 'D1' },
  { id: 'Type-C&D', display: 'CD',  group: 'CD' },
  { id: 'Type-0',   display: '0',   group: '0'  },  // "0"/unclassified (non-family C&D single, EWS/Type-I at Parwanoo)
  { id: 'Type-FA',  display: 'FA',  group: 'FA' },
  { id: 'Type-FB',  display: 'FB',  group: 'FB' },
]

export const GROUP_ORDER = ['A', 'B', 'C', 'D', 'D1', 'CD', '0', 'FA', 'FB']

/** Short UI label for a stored type id (e.g. 'Type-I' → '1') */
export function typeDisplay(id) {
  return TYPE_MASTER.find(t => t.id === id)?.display ?? id
}
/** Group key for a stored type id (e.g. 'Type-I' → 'A') */
export function typeGroup(id) {
  return TYPE_MASTER.find(t => t.id === id)?.group ?? id.replace(/^Type-/i, '')
}
/** All stored type ids that belong to a group */
export function getGroupTypes(group) {
  return TYPE_MASTER.filter(t => t.group === group).map(t => t.id)
}
/** Unique groups that actually have data (for filter chips) */
export const TYPE_GROUPS = [...new Set(TYPE_MASTER.map(t => t.group))]

// ============================================================
// DROPDOWN OPTIONS
// ============================================================
export const QUARTER_TYPES   = TYPE_MASTER.map(t => t.id)   // raw ids for sheet storage
export const LOCATIONS       = ['Jhakri','Kotla','Jeori','Nathpa','Shimla','LHEP','RHPS','Duttnagar','Kalpa','Other']
export const STATUSES        = ['Occupied','Vacant','Under Repair','Reserved']
export const CATEGORIES      = ['General','SC','ST','OBC','EWS']
export const ALLOTMENT_TYPES = ['New Allotment','First Change','Second Change','Management Quota','O&M Quota','Medical Ground','Compassionate','Renewal']

// ============================================================
// EMPLOYEE GRADE LEVELS (Rule 5 — SJVN Allotment Policy)
// ============================================================
export const EMPLOYEE_LEVELS = [
  'W1','W2','W3','W4','W5','W6',    // Workmen (Upto W6) → entitled Type A
  'W7','W8','W9','W10','W11',       // Sr. Workmen (W7+) → entitled Type B
  'S1','S2','S3','S4',              // Supervisors → entitled Type B
  'E1','E2','E3','E4',              // Jr. Executives → entitled Type B
  'E5','E6',                        // Mid Executives → entitled Type C
  'E7',                             // Sr. Executive → entitled Type D
  'E8',                             // Top Management → entitled Type D1
]

// Grade level → entitled quarter type group (Rule 5 of NJHPS Allotment Policy)
export const GRADE_ENTITLEMENT = {
  W1:'A', W2:'A', W3:'A', W4:'A', W5:'A', W6:'A',
  W7:'B', W8:'B', W9:'B', W10:'B', W11:'B',
  S1:'B', S2:'B', S3:'B', S4:'B',
  E1:'B', E2:'B', E3:'B', E4:'B',
  E5:'C', E6:'C',
  E7:'D',
  E8:'D1',
}

/** Entitled quarter type group for a grade level — returns null if level unknown */
export function getEntitledGroup(level) {
  return GRADE_ENTITLEMENT[level] || null
}

// SJVN Departments / Units
export const DEPARTMENTS = ['NJHPS','RHPS','LHEP','SJVN-HO','NAGJP','WANGTU','NATHPA (PSS)','CISF','BSNL','FA','Trainees','External Agency','Other']

// SJVN units (for inter-unit allotments)
export const SJVN_UNITS  = ['NJHPS','RHPS','LHEP','SJVN-HO (Shimla)','NAGJP (Naitwar)','Wangtu HEP','Khirvire WEP','Luhri-I HEP','Other SJVN Unit']

// Outside agency types
export const ENTITY_TYPES = [
  'Central School (KV)','Police (HP Police)','Post Office','CISF',
  'Intelligence Bureau (IB)','Bank (SBI / Other)','Hospital / Dispensary',
  'Court / Judiciary','Revenue Department','PWD / HPPWD','Other Govt. Agency',
]

// Allottee categories (for order form)
export const ALLOTTEE_CATEGORIES = ['SJVN Employee','Outside Agency','Apprentice / Trainee']

// Order workflow modes
export const ORDER_MODES = ['New Allotment','Change','Renewal','Surrender']

// Order status
export const ORDER_STATUSES = ['Draft','Issued','Rejected','Withdrawn']

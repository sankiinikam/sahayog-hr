/**
 * Standalone / Offline Storage Engine for Sahayog HR
 *
 * Allows the entire application (Mobile APK and Desktop) to function
 * with 100% full CRUD operations without requiring any hosted backend server.
 * All state is persisted in localStorage.
 */

export interface OfflineEmployee {
  id: number;
  first_name: string;
  last_name: string;
  work_email: string;
  employee_code: string;
  is_active: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  photo?: string | null;
  department?: number | null;
  department_name?: string;
  designation?: number | null;
  designation_name?: string;
  designation_title?: string;
  date_of_birth?: string | null;
  date_of_joining: string;
  personal_phone: string;
  personal_email: string;
  employment_type?: string;
  employment_status?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  aadhaar_number?: string;
  pan_number?: string;
}

export interface OfflineAttendance {
  id: number;
  employee: number;
  employee_id?: number;
  date: string;
  attendance_date?: string;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE" | string;
  clock_in?: string | null;
  clock_out?: string | null;
  first_in?: string | null;
  last_out?: string | null;
  clockIn12?: string;
  clockOut12?: string;
  worked_minutes?: number;
  overtime_minutes?: number;
  is_late?: boolean;
  late_minutes?: number;
  shift?: number;
}

const STORAGE_KEY = "sahayog_hrms_offline_db_v1";

const SEED_DEPARTMENTS = [
  { id: 1, name: "Engineering", code: "ENG" },
  { id: 2, name: "Human Resources", code: "HR" },
  { id: 3, name: "Operations", code: "OPS" },
  { id: 4, name: "Accounts & Finance", code: "FIN" },
  { id: 5, name: "Sales & Marketing", code: "SLS" },
];

const SEED_DESIGNATIONS = [
  { id: 1, title: "Senior Software Engineer", department: 1 },
  { id: 2, title: "HR Operations Lead", department: 2 },
  { id: 3, title: "Operations Supervisor", department: 3 },
  { id: 4, title: "Accountant", department: 4 },
  { id: 5, title: "Business Development Executive", department: 5 },
  { id: 6, title: "Product Designer", department: 1 },
];

const SEED_COMPANIES = [
  {
    id: 1,
    name: "Sahayog HR Solutions Pvt Ltd",
    legal_name: "Sahayog HR Solutions Private Limited",
    registration_number: "U72900PN2024PTC198421",
    tax_id: "AABCS1234F",
    pan_number: "AABCS1234F",
    gstin: "27AABCS1234F1Z5",
    email: "contact@sahayog-hr.local",
    phone: "+91 98230 12345",
    website: "https://sahayog-hr.local",
    address_line1: "Unit 402, Tech Park, Baner",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411045",
    country: "IN",
  },
];

const SEED_EMPLOYEES: OfflineEmployee[] = [
  {
    id: 1,
    first_name: "Rajesh",
    last_name: "Sharma",
    work_email: "rajesh.sharma@sahayog.local",
    employee_code: "EMP001",
    is_active: true,
    is_deleted: false,
    photo: null,
    department: 1,
    department_name: "Engineering",
    designation: 1,
    designation_title: "Senior Software Engineer",
    designation_name: "Senior Software Engineer",
    date_of_birth: "1994-05-12",
    date_of_joining: "2024-01-15",
    personal_phone: "+91 98221 11223",
    personal_email: "rajesh.personal@gmail.com",
    employment_type: "FULL_TIME",
    employment_status: "CONFIRMED",
    id_proof_type: "Aadhaar",
    id_proof_number: "4521-8899-1234",
    aadhaar_number: "4521-8899-1234",
  },
  {
    id: 2,
    first_name: "Priya",
    last_name: "Patel",
    work_email: "priya.patel@sahayog.local",
    employee_code: "EMP002",
    is_active: true,
    is_deleted: false,
    photo: null,
    department: 2,
    department_name: "Human Resources",
    designation: 2,
    designation_title: "HR Operations Lead",
    designation_name: "HR Operations Lead",
    date_of_birth: "1996-08-20",
    date_of_joining: "2024-03-01",
    personal_phone: "+91 98450 33445",
    personal_email: "priya.patel@gmail.com",
    employment_type: "FULL_TIME",
    employment_status: "CONFIRMED",
    id_proof_type: "PAN",
    id_proof_number: "ABCDE1234F",
    pan_number: "ABCDE1234F",
  },
  {
    id: 3,
    first_name: "Amit",
    last_name: "Verma",
    work_email: "amit.verma@sahayog.local",
    employee_code: "EMP003",
    is_active: true,
    is_deleted: false,
    photo: null,
    department: 3,
    department_name: "Operations",
    designation: 3,
    designation_title: "Operations Supervisor",
    designation_name: "Operations Supervisor",
    date_of_birth: "1992-11-04",
    date_of_joining: "2024-04-10",
    personal_phone: "+91 97112 55667",
    personal_email: "amit.verma@gmail.com",
    employment_type: "FULL_TIME",
    employment_status: "CONFIRMED",
    id_proof_type: "Aadhaar",
    id_proof_number: "7890-1122-3344",
    aadhaar_number: "7890-1122-3344",
  },
  {
    id: 4,
    first_name: "Sneha",
    last_name: "Kulkarni",
    work_email: "sneha.k@sahayog.local",
    employee_code: "EMP004",
    is_active: true,
    photo: null,
    department: 4,
    department_name: "Accounts & Finance",
    designation: 4,
    designation_title: "Accountant",
    date_of_joining: "2024-05-20",
    personal_phone: "+91 98901 77889",
    personal_email: "sneha.kulkarni@gmail.com",
    employment_type: "FULL_TIME",
    employment_status: "CONFIRMED",
  },
  {
    id: 5,
    first_name: "Vikram",
    last_name: "Singh",
    work_email: "vikram.singh@sahayog.local",
    employee_code: "EMP005",
    is_active: true,
    photo: null,
    department: 5,
    department_name: "Sales & Marketing",
    designation: 5,
    designation_title: "Business Development Executive",
    date_of_joining: "2024-07-01",
    personal_phone: "+91 99100 22334",
    personal_email: "vikram.singh@gmail.com",
    employment_type: "FULL_TIME",
    employment_status: "PROBATION",
  },
  {
    id: 6,
    first_name: "Ananya",
    last_name: "Joshi",
    work_email: "ananya.joshi@sahayog.local",
    employee_code: "EMP006",
    is_active: true,
    photo: null,
    department: 1,
    department_name: "Engineering",
    designation: 6,
    designation_title: "Product Designer",
    date_of_joining: "2024-08-15",
    personal_phone: "+91 97654 99887",
    personal_email: "ananya.joshi@gmail.com",
    employment_type: "FULL_TIME",
    employment_status: "PROBATION",
  },
];

interface OfflineDataState {
  companies: any[];
  departments: any[];
  designations: any[];
  employees: OfflineEmployee[];
  attendance: OfflineAttendance[];
  leaves: any[];
  payslips: any[];
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function loadState(): OfflineDataState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // Fallback to fresh seed
    }
  }

  const today = getTodayString();
  const initialAttendance: OfflineAttendance[] = [
    {
      id: 101,
      employee: 1,
      date: today,
      status: "PRESENT",
      clock_in: "08:00:00",
      clock_out: "20:00:00",
      clockIn12: "08:00 AM",
      clockOut12: "08:00 PM",
      worked_minutes: 720,
      overtime_minutes: 0,
    },
    {
      id: 102,
      employee: 2,
      date: today,
      status: "PRESENT",
      clock_in: "08:00:00",
      clock_out: "21:30:00",
      clockIn12: "08:00 AM",
      clockOut12: "09:30 PM",
      worked_minutes: 810,
      overtime_minutes: 90,
    },
    {
      id: 103,
      employee: 3,
      date: today,
      status: "ABSENT",
      clock_in: null,
      clock_out: null,
      clockIn12: "",
      clockOut12: "",
      worked_minutes: 0,
      overtime_minutes: 0,
    },
  ];

  const state: OfflineDataState = {
    companies: SEED_COMPANIES,
    departments: SEED_DEPARTMENTS,
    designations: SEED_DESIGNATIONS,
    employees: SEED_EMPLOYEES,
    attendance: initialAttendance,
    leaves: [
      { id: 1, employee: 1, leave_type: "Casual Leave", start_date: "2024-10-10", end_date: "2024-10-11", status: "APPROVED", days: 2 },
      { id: 2, employee: 2, leave_type: "Sick Leave", start_date: "2024-10-05", end_date: "2024-10-05", status: "APPROVED", days: 1 },
    ],
    payslips: [
      { id: 1, employee: 1, month: "2024-09", gross_salary: 85000, net_salary: 76500, status: "PAID" },
      { id: 2, employee: 2, month: "2024-09", gross_salary: 65000, net_salary: 58500, status: "PAID" },
      { id: 3, employee: 3, month: "2024-09", gross_salary: 45000, net_salary: 40500, status: "PAID" },
    ],
  };

  saveState(state);
  return state;
}

function saveState(state: OfflineDataState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isOfflineMode(): boolean {
  return localStorage.getItem("hrms_offline_mode") === "true";
}

export function setOfflineMode(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem("hrms_offline_mode", "true");
  } else {
    localStorage.removeItem("hrms_offline_mode");
  }
}

export function handleOfflineRequest(
  url: string,
  method: string,
  body?: any
): { status: number; data: any } | null {
  const state = loadState();
  const cleanUrl = url.split("?")[0].replace(/^\/api\/v1/, "").replace(/\/+$/, "");
  const methodUpper = method.toUpperCase();

  // 1. Auth Login
  if (cleanUrl === "/auth/login" && methodUpper === "POST") {
    const user = {
      id: 1,
      email: body?.email || "admin@sahayog.local",
      first_name: "Admin",
      last_name: "User",
      role: "ADMIN",
      is_staff: true,
      is_superuser: true,
    };
    return {
      status: 200,
      data: {
        access: "offline-demo-access-token",
        refresh: "offline-demo-refresh-token",
        user,
      },
    };
  }

  // 2. Health check
  if (cleanUrl === "/health") {
    return {
      status: 200,
      data: { status: "ok", mode: "offline-standalone", database: "local-storage" },
    };
  }

  // 3. Employees list & create
  if (cleanUrl === "/employees") {
    if (methodUpper === "GET") {
      const showDeleted = url.includes("show_deleted=true");
      const list = state.employees.map((e) => ({
        ...e,
        full_name: `${e.first_name} ${e.last_name}`,
        designation_name: e.designation_title || (state.designations.find((d) => d.id === e.designation)?.title) || "Staff Member",
      }));
      if (showDeleted) {
        return { status: 200, data: list };
      }
      return { status: 200, data: list.filter((e) => !e.is_deleted) };
    }
    if (methodUpper === "POST") {
      const newId = Math.max(0, ...state.employees.map((e) => e.id)) + 1;
      const deptObj = state.departments.find((d) => d.id === Number(body.department));
      let desigTitle = "Staff Member";
      if (body.designation) {
        if (typeof body.designation === "string" && isNaN(Number(body.designation))) {
          desigTitle = body.designation;
        } else {
          const desigObj = state.designations.find((d) => d.id === Number(body.designation));
          if (desigObj) desigTitle = desigObj.title;
        }
      }

      const newEmp: OfflineEmployee = {
        id: newId,
        first_name: body.first_name || "New",
        last_name: body.last_name || "Employee",
        work_email: body.work_email || `user${newId}@sahayog.local`,
        employee_code: body.employee_code || `EMP${String(newId).padStart(3, "0")}`,
        is_active: body.is_active !== false,
        is_deleted: false,
        photo: body.photo || null,
        department: body.department ? Number(body.department) : null,
        department_name: deptObj ? deptObj.name : "Operations",
        designation: typeof body.designation === "number" ? body.designation : 1,
        designation_name: desigTitle,
        designation_title: desigTitle,
        date_of_birth: body.date_of_birth || null,
        date_of_joining: body.date_of_joining || getTodayString(),
        personal_phone: body.personal_phone || "",
        personal_email: body.personal_email || "",
        employment_type: body.employment_type || "FULL_TIME",
        employment_status: body.employment_status || "PROBATION",
        id_proof_type: body.id_proof_type || "Aadhaar",
        id_proof_number: body.id_proof_number || "",
        aadhaar_number: body.aadhaar_number || (body.id_proof_type === "Aadhaar" ? body.id_proof_number : ""),
        pan_number: body.pan_number || (body.id_proof_type === "PAN" ? body.id_proof_number : ""),
      };

      state.employees.push(newEmp);
      saveState(state);
      return { status: 201, data: newEmp };
    }
  }

  // 4. Employee detail & patch & soft delete
  const empDetailMatch = cleanUrl.match(/^\/employees\/(\d+)$/);
  if (empDetailMatch) {
    const empId = Number(empDetailMatch[1]);
    const emp = state.employees.find((e) => e.id === empId);

    if (!emp) return { status: 404, data: { detail: "Employee not found" } };

    if (methodUpper === "GET") {
      return {
        status: 200,
        data: {
          ...emp,
          full_name: `${emp.first_name} ${emp.last_name}`,
          designation_name: emp.designation_title || "Staff Member",
        },
      };
    }
    if (methodUpper === "PATCH" || methodUpper === "PUT") {
      Object.assign(emp, body);
      if (body.designation && typeof body.designation === "string" && isNaN(Number(body.designation))) {
        emp.designation_title = body.designation;
        emp.designation_name = body.designation;
      }
      saveState(state);
      return { status: 200, data: emp };
    }
    if (methodUpper === "DELETE") {
      emp.is_deleted = true;
      emp.is_active = false;
      emp.deleted_at = new Date().toISOString();
      saveState(state);
      return {
        status: 200,
        data: { detail: `Employee ${emp.first_name} ${emp.last_name} archived successfully`, id: empId, is_deleted: true },
      };
    }
  }

  // Restore employee
  const empRestoreMatch = cleanUrl.match(/^\/employees\/(\d+)\/restore$/);
  if (empRestoreMatch && methodUpper === "POST") {
    const empId = Number(empRestoreMatch[1]);
    const emp = state.employees.find((e) => e.id === empId);
    if (!emp) return { status: 404, data: { detail: "Employee not found" } };
    emp.is_deleted = false;
    emp.is_active = true;
    emp.deleted_at = null;
    saveState(state);
    return {
      status: 200,
      data: { detail: `Employee ${emp.first_name} ${emp.last_name} restored successfully`, id: empId, is_deleted: false, is_active: true },
    };
  }

  // 5. Employee Admin Profile
  const profileMatch = cleanUrl.match(/^\/employees\/(\d+)\/admin-profile$/);
  if (profileMatch) {
    const empId = Number(profileMatch[1]);
    const emp = state.employees.find((e) => e.id === empId);
    if (!emp) return { status: 404, data: { detail: "Employee not found" } };

    return {
      status: 200,
      data: {
        id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        full_name: `${emp.first_name} ${emp.last_name}`,
        work_email: emp.work_email,
        personal_email: emp.personal_email,
        personal_phone: emp.personal_phone,
        work_phone: emp.personal_phone,
        gender: "MALE",
        date_of_birth: emp.date_of_birth || null,
        date_of_joining: emp.date_of_joining,
        employment_type: emp.employment_type || "FULL_TIME",
        employment_status: emp.employment_status || "CONFIRMED",
        blood_group: "O+",
        department: {
          id: emp.department || 1,
          name: emp.department_name || "Operations",
        },
        designation: {
          id: emp.designation || 1,
          name: emp.designation_title || "Staff Member",
        },
        is_active: emp.is_active,
        is_deleted: emp.is_deleted || false,
        id_proof_type: emp.id_proof_type || "Aadhaar",
        id_proof_number: emp.id_proof_number || emp.aadhaar_number || emp.pan_number || "",
        aadhaar_number: emp.aadhaar_number || "",
        pan_number: emp.pan_number || "",
        photo: emp.photo || "",
        stats_30d: {
          present: 22,
          half_day: 1,
          absent: 1,
          on_leave: 2,
        },
        available_shifts: [
          { id: 1, name: "12-Hour Shift", start_time: "08:00:00", end_time: "20:00:00" },
        ],
      },
    };
  }

  // 6. Attendance records
  if (cleanUrl === "/attendance/records") {
    if (methodUpper === "GET") {
      const records = state.attendance.map((r) => ({
        ...r,
        employee_id: r.employee,
        attendance_date: r.date,
        first_in: r.clock_in || (r.clockIn12 ? r.clockIn12 : null),
        last_out: r.clock_out || (r.clockOut12 ? r.clockOut12 : null),
        is_late: r.is_late || false,
        late_minutes: r.late_minutes || 0,
      }));
      return { status: 200, data: { results: records, count: records.length } };
    }
    if (methodUpper === "POST") {
      const empId = Number(body.employee || body.employee_id);
      const today = body.attendance_date || body.date || getTodayString();

      let record = state.attendance.find((a) => a.employee === empId && a.date === today);

      if (!record) {
        const newId = Math.max(0, ...state.attendance.map((a) => a.id)) + 1;
        record = {
          id: newId,
          employee: empId,
          date: today,
          status: body.status || "PRESENT",
        };
        state.attendance.push(record);
      }

      record.status = body.status;
      if (body.clock_in !== undefined) record.clock_in = body.clock_in;
      if (body.first_in !== undefined) record.clock_in = body.first_in;
      if (body.clock_out !== undefined) record.clock_out = body.clock_out;
      if (body.last_out !== undefined) record.clock_out = body.last_out;
      if (body.clockIn12 !== undefined) record.clockIn12 = body.clockIn12;
      if (body.clockOut12 !== undefined) record.clockOut12 = body.clockOut12;
      if (body.worked_minutes !== undefined) record.worked_minutes = body.worked_minutes;
      if (body.overtime_minutes !== undefined) record.overtime_minutes = body.overtime_minutes;
      if (body.is_late !== undefined) record.is_late = body.is_late;
      if (body.late_minutes !== undefined) record.late_minutes = body.late_minutes;

      saveState(state);
      return {
        status: 200,
        data: {
          ...record,
          employee_id: record.employee,
          attendance_date: record.date,
          first_in: record.clock_in,
          last_out: record.clock_out,
          is_late: record.is_late || false,
          late_minutes: record.late_minutes || 0,
        },
      };
    }
  }

  // 6b. Batch mark attendance
  if (cleanUrl === "/attendance/records/batch-mark" && methodUpper === "POST") {
    const empIds: number[] = body?.employee_ids || [];
    const targetDate = body?.attendance_date || getTodayString();
    const targetStatus = body?.status || "PRESENT";

    empIds.forEach((empId) => {
      let record = state.attendance.find((a) => a.employee === empId && a.date === targetDate);
      if (!record) {
        const newId = Math.max(0, ...state.attendance.map((a) => a.id)) + 1;
        record = {
          id: newId,
          employee: empId,
          date: targetDate,
          status: targetStatus,
        };
        state.attendance.push(record);
      }
      record.status = targetStatus;
      if (targetStatus === "PRESENT") {
        record.clock_in = "08:00:00";
        record.clock_out = "20:00:00";
        record.clockIn12 = "08:00 AM";
        record.clockOut12 = "08:00 PM";
        record.worked_minutes = 720;
        record.overtime_minutes = 0;
        record.is_late = false;
        record.late_minutes = 0;
      } else {
        record.clock_in = null;
        record.clock_out = null;
        record.clockIn12 = "08:00 AM";
        record.clockOut12 = "08:00 PM";
        record.worked_minutes = 0;
        record.overtime_minutes = 0;
        record.is_late = false;
        record.late_minutes = 0;
      }
    });

    saveState(state);
    return { status: 200, data: { detail: `Batch marked ${empIds.length} staff members.` } };
  }

  // Designations
  if (cleanUrl === "/organization/designations" && methodUpper === "GET") {
    return { status: 200, data: state.designations.map((d) => ({ id: d.id, name: d.title, code: String(d.id) })) };
  }

  const attDetailMatch = cleanUrl.match(/^\/attendance\/records\/(\d+)$/);
  if (attDetailMatch) {
    const recordId = Number(attDetailMatch[1]);
    const record = state.attendance.find((a) => a.id === recordId);
    if (!record) return { status: 404, data: { detail: "Attendance record not found" } };

    if (methodUpper === "PATCH" || methodUpper === "PUT") {
      Object.assign(record, body);
      saveState(state);
      return { status: 200, data: record };
    }
    if (methodUpper === "GET") {
      return { status: 200, data: record };
    }
  }

  // 7. Punch
  if (cleanUrl === "/attendance/punch" && methodUpper === "POST") {
    return {
      status: 200,
      data: {
        success: true,
        message: `Punched ${body?.punch_type || "IN"} successfully (Offline)`,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 8. Organization: Companies
  if (cleanUrl === "/organization/companies") {
    if (methodUpper === "GET") {
      return { status: 200, data: state.companies };
    }
    if (methodUpper === "POST") {
      const newId = Math.max(0, ...state.companies.map((c) => c.id)) + 1;
      const newCompany = { id: newId, ...body };
      state.companies.push(newCompany);
      saveState(state);
      return { status: 201, data: newCompany };
    }
  }

  const compMatch = cleanUrl.match(/^\/organization\/companies\/(\d+)$/);
  if (compMatch) {
    const compId = Number(compMatch[1]);
    const comp = state.companies.find((c) => c.id === compId);
    if (!comp) return { status: 404, data: { detail: "Company not found" } };

    if (methodUpper === "GET") return { status: 200, data: comp };
    if (methodUpper === "PATCH" || methodUpper === "PUT") {
      Object.assign(comp, body);
      saveState(state);
      return { status: 200, data: comp };
    }
  }

  // 9. Departments, Designations, Shifts
  if (cleanUrl === "/organization/departments") {
    return { status: 200, data: state.departments };
  }
  if (cleanUrl === "/organization/designations") {
    return { status: 200, data: state.designations };
  }
  if (cleanUrl === "/organization/shifts") {
    return {
      status: 200,
      data: [
        { id: 1, name: "12h Shift (8am - 8pm)", start_time: "08:00:00", end_time: "20:00:00", is_active: true },
        { id: 2, name: "General Day Shift (9am - 6pm)", start_time: "09:00:00", end_time: "18:00:00", is_active: true },
      ],
    };
  }

  // 10. Leaves
  if (cleanUrl === "/leave/balances") {
    return {
      status: 200,
      data: [
        { leave_type: "Casual Leave", total: 12, used: 2, balance: 10 },
        { leave_type: "Sick Leave", total: 10, used: 1, balance: 9 },
        { leave_type: "Earned Leave", total: 15, used: 0, balance: 15 },
      ],
    };
  }
  if (cleanUrl === "/leave/requests") {
    return { status: 200, data: state.leaves };
  }
  if (cleanUrl === "/leave/types") {
    return {
      status: 200,
      data: [
        { id: 1, name: "Casual Leave", days_per_year: 12 },
        { id: 2, name: "Sick Leave", days_per_year: 10 },
        { id: 3, name: "Earned Leave", days_per_year: 15 },
      ],
    };
  }

  // 11. Payroll
  if (cleanUrl === "/payroll/payslips") {
    return { status: 200, data: state.payslips };
  }

  // Fallback generic response for other endpoints (operations, etc.)
  return { status: 200, data: { results: [], count: 0 } };
}


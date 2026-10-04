import express from "express";
import cors from "cors";
import pool from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================================================
   GLOBAL MIDDLEWARE
========================================================= */
app.use(cors());
app.use(express.json());

/* =========================================================
   lOGS
========================================================= */
/**
 * @param {number|null} userId
 * @param {string} action
 * @param {string|null} details
 */
async function createLog(userId, action, details = null) {
  try {
    await pool.query(
      `INSERT INTO logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [userId || null, action, details]
    );
  } catch (err) {
    console.error("Failed to create log:", err);
  }
}

/* =========================================================
   ROOT / HEALTH CHECK
========================================================= */
app.get("/", (req, res) => {
  res.send("API is running");
});

/* =========================================================
   LOGIN
========================================================= */

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const result = await pool.query(
      `SELECT 
          u.id,
          u.name,
          u.email,
          u.password,
          u.role,
          u.branch_id,
          b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { device } = req.body; // add this

    await createLog(
      user.id,
      "LOGIN",
      `${user.name} logged in as ${user.role}${
        device === "mobile" ? " (mobile)" : " (web)"
      }`
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
      },
    });
  } catch (err) {
    console.error("POST /auth/login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
});

/* =========================================================
    LOGOUT
========================================================= */
app.post("/auth/logout", async (req, res) => {
  try {
    const { user_id, name, role, device } = req.body;

    await createLog(
      user_id,
      "LOGOUT",
      `${name || "User"} logged out${
        role ? ` as ${role}` : ""
      }${device === "mobile" ? " (mobile)" : " (web)"}`
    );

    res.json({ message: "Logout logged successfully" });
  } catch (err) {
    console.error("POST /auth/logout error:", err);
    res.status(500).json({ error: "Failed to log logout" });
  }
});

/* =========================================================
    CHANGE PASSWORD
========================================================= */

app.put("/users/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: "Current password and new password are required",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters",
      });
    }

    const userResult = await pool.query(
      `SELECT id, password FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    if (user.password !== current_password) {
      return res.status(400).json({
        error: "Current password is incorrect",
      });
    }

    await pool.query(
      `UPDATE users
       SET password = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [new_password, id]
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("PUT /users/:id/password error:", err);
    res.status(500).json({ error: "Failed to update password" });
  }
});

/* =========================================================
   USER ROUTES
========================================================= */

/**
 * Get all users with branch details
 */
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.branch_id,
          u.profile_image,
          b.name AS branch_name,
          u.created_at,
          u.updated_at
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * Create a new user
 */
app.post("/users", async (req, res) => {
  try {
    const { name, email, password, role, branch_id, profile_image } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: "name, email, password, and role are required",
      });
    }

    if (!["admin", "warden"].includes(role)) {
      return res.status(400).json({
        error: "role must be admin or warden",
      });
    }

    if (role === "warden" && !branch_id) {
      return res.status(400).json({
        error: "Branch is required for wardens",
      });
    }

    const result = await pool.query(
      `INSERT INTO users (
        name,
        email,
        password,
        role,
        branch_id,
        profile_image
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, branch_id, profile_image, created_at, updated_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        password,
        role,
        role === "admin" ? null : branch_id,
        profile_image || null,
      ]
    );

    await createLog(
      req.body.created_by || null,
      "CREATE_USER",
      `Created user ${name} (${email}) as ${role}`
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /users error:", err);

    const errorCode =
      typeof err === "object" && err !== null && "code" in err
        ? err.code
        : undefined;

    if (errorCode === "23505") {
      return res.status(400).json({
        error: "This email is already in use",
      });
    }

    res.status(500).json({ error: "Failed to create user" });
  }
});

/**
 * Update an existing user
 */
app.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, branch_id, profile_image } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        error: "name, email, and role are required",
      });
    }

    if (!["admin", "warden"].includes(role)) {
      return res.status(400).json({
        error: "role must be admin or warden",
      });
    }

    if (role === "warden" && !branch_id) {
      return res.status(400).json({
        error: "Branch is required for wardens",
      });
    }

    let result;

    if (password && password.trim() !== "") {
      result = await pool.query(
        `UPDATE users
         SET
           name = $1,
           email = $2,
           password = $3,
           role = $4,
           branch_id = $5,
           profile_image = $6,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING id, name, email, role, branch_id, profile_image, created_at, updated_at`,
        [
          name.trim(),
          email.trim().toLowerCase(),
          password,
          role,
          role === "admin" ? null : branch_id,
          profile_image || null,
          id,
        ]
      );
    } else {
      result = await pool.query(
        `UPDATE users
         SET
           name = $1,
           email = $2,
           role = $3,
           branch_id = $4,
           profile_image = $5,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING id, name, email, role, branch_id, profile_image, created_at, updated_at`,
        [
          name.trim(),
          email.trim().toLowerCase(),
          role,
          role === "admin" ? null : branch_id,
          profile_image || null,
          id,
        ]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    await createLog(
      req.body.updated_by || null,
      "UPDATE_USER",
      `Updated user ${name} (${email}) as ${role}`
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /users/:id error:", err);

    const errorCode =
      typeof err === "object" && err !== null && "code" in err
        ? err.code
        : undefined;

    if (errorCode === "23505") {
      return res.status(400).json({
        error: "This email is already in use",
      });
    }

    res.status(500).json({ error: "Failed to update user" });
  }
});

/* =========================================================
   WARDEN REPORT ROUTES
========================================================= */

app.get("/reports/warden", async (req, res) => {
  try {
    const { branch_id, month } = req.query;

    if (!branch_id || !month) {
      return res.status(400).json({
        error: "branch_id and month are required",
      });
    }

    const startDate = `${month}-01`;

    const totalAttendance = await pool.query(
      `SELECT
         COUNT(*) AS total_attendance,
         COUNT(*) FILTER (WHERE attendance_type = 'check_in') AS total_check_ins,
         COUNT(*) FILTER (WHERE attendance_type = 'check_out') AS total_check_outs
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE s.branch_id = $1
       AND a.scanned_at >= $2::date
       AND a.scanned_at < ($2::date + INTERVAL '1 month')`,
      [branch_id, startDate]
    );
    
    const dailyAttendance = await pool.query(
      `SELECT
        EXTRACT(DAY FROM a.scanned_at)::int AS day,
        COUNT(*)::int AS count
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.branch_id = $1
      AND a.scanned_at >= $2::date
      AND a.scanned_at < ($2::date + INTERVAL '1 month')
      GROUP BY day
      ORDER BY day`,
      [branch_id, startDate]
    );

    const year = Number(String(month).split("-")[0]);
    const monthNumber = Number(String(month).split("-")[1]);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();

    const dailyMap = /** @type {Record<string, number>} */ ({});
    dailyAttendance.rows.forEach((row) => {
      dailyMap[row.day] = Number(row.count);
    });

    const fullDailyAttendance = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;

      return {
        label: String(day),
        value: dailyMap[day] || 0,
      };
    });

    const currentlyInHostel = await pool.query(
      `SELECT COUNT(*) FROM (
         SELECT DISTINCT ON (a.student_id)
           a.student_id,
           a.attendance_type
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         WHERE s.branch_id = $1
         ORDER BY a.student_id, a.scanned_at DESC
       ) latest
       WHERE attendance_type = 'check_in'`,
      [branch_id]
    );

    const roomStatus = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE r.status = 'inactive') AS unavailable,
         COUNT(*) FILTER (
           WHERE r.status = 'active'
           AND COALESCE(occ.occupant_count, 0) >= r.capacity
         ) AS full,
         COUNT(*) FILTER (
           WHERE r.status = 'active'
           AND COALESCE(occ.occupant_count, 0) < r.capacity
         ) AS available
       FROM rooms r
       LEFT JOIN (
         SELECT room_id, COUNT(*) AS occupant_count
         FROM students
         WHERE room_id IS NOT NULL
         AND status = 'active'
         GROUP BY room_id
       ) occ ON occ.room_id = r.id
       WHERE r.branch_id = $1`,
      [branch_id]
    );

    const studentsWithoutRoom = await pool.query(
      `SELECT COUNT(*)
       FROM students
       WHERE branch_id = $1
       AND room_id IS NULL
       AND status = 'active'`,
      [branch_id]
    );

    const currentlyInStudents = await pool.query(
      `SELECT
         s.id,
         s.student_id,
         s.name,
         latest.scanned_at
       FROM students s
       JOIN (
         SELECT DISTINCT ON (a.student_id)
           a.student_id,
           a.attendance_type,
           a.scanned_at
         FROM attendance a
         ORDER BY a.student_id, a.scanned_at DESC
       ) latest ON latest.student_id = s.id
       WHERE s.branch_id = $1
       AND latest.attendance_type = 'check_in'
       ORDER BY latest.scanned_at DESC
       LIMIT 5`,
      [branch_id]
    );

    const detailedAttendanceResult = await pool.query(
      `SELECT
          a.id,
          a.scanned_at,
          a.attendance_type,
          a.category,
          a.notes,
          s.student_id,
          s.name,
          u.name AS scanned_by_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN users u ON a.scanned_by = u.id
      WHERE s.branch_id = $1
      AND TO_CHAR(a.scanned_at, 'YYYY-MM') = $2
      ORDER BY a.scanned_at ASC`,
      [branch_id, month]
    );

    const stats = totalAttendance.rows[0];
    const rooms = roomStatus.rows[0];

    res.json({
      summary: {
        totalAttendance: Number(stats.total_attendance),
        totalCheckIns: Number(stats.total_check_ins),
        totalCheckOuts: Number(stats.total_check_outs),
        currentlyInHostel: Number(currentlyInHostel.rows[0].count),
      },
      dailyAttendance: fullDailyAttendance,
      roomStatus: {
        available: Number(rooms.available),
        full: Number(rooms.full),
        unavailable: Number(rooms.unavailable),
      },
      needsAttention: {
        studentsWithoutRoom: Number(studentsWithoutRoom.rows[0].count),
        currentlyInStudents: currentlyInStudents.rows,
      },
      detailedAttendance: detailedAttendanceResult.rows,
    });
  } catch (err) {
    console.error("GET /reports/warden error:", err);
    res.status(500).json({ error: "Failed to fetch warden report" });
  }
});

/* =========================================================
   SCANNER / ATTENDANCE ROUTES
========================================================= */

/**
 * Get student details by barcode
 * Used by the mobile scanner
 */
app.get("/students/barcode/:barcode", async (req, res) => {
  try {
    const { barcode } = req.params;

    const result = await pool.query(
      `SELECT students.*, rooms.room_number 
       FROM students
       LEFT JOIN rooms ON students.room_id = rooms.id
       WHERE barcode = $1`,
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /students/barcode/:barcode error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================================================
   ATTENDANCE ROUTES
========================================================= */

app.get("/attendance", async (req, res) => {
  try {
    const { search = "", type = "", date = "", branch_id = "" } = req.query;

    const values = [];
    const whereClauses = [];

    if (search) {
      values.push(`%${search}%`);
      whereClauses.push(
        `(s.name ILIKE $${values.length} OR s.student_id ILIKE $${values.length})`
      );
    }

    if (type) {
      values.push(type);
      whereClauses.push(`a.attendance_type = $${values.length}`);
    }

    if (date) {
      values.push(date);
      whereClauses.push(`DATE(a.scanned_at) = $${values.length}`);
    }

    if (branch_id) {
      values.push(branch_id);
      whereClauses.push(`s.branch_id = $${values.length}`);
    }

    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const result = await pool.query(
      `SELECT
          a.id,
          a.student_id,
          a.scanned_by,
          a.scanned_at,
          a.attendance_type,
          a.status,
          a.category,
          a.notes,
          s.name,
          s.student_id AS student_code,
          s.barcode,
          s.profile_image,
          r.room_number,
          u.name AS scanned_by_name
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       LEFT JOIN rooms r ON s.room_id = r.id
       LEFT JOIN users u ON a.scanned_by = u.id
       ${whereSQL}
       ORDER BY a.scanned_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /attendance error:", err);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

app.post("/attendance/manual", async (req, res) => {
  try {
    const {
      student_id,
      attendance_type,
      notes,
      scanned_by,
      branch_id,
      category,
    } = req.body;

    if (!student_id || !attendance_type) {
      return res.status(400).json({
        error: "student_id and attendance_type are required",
      });
    }

    if (!["check_in", "check_out"].includes(attendance_type)) {
      return res.status(400).json({
        error: "attendance_type must be check_in or check_out",
      });
    }

    const studentResult = await pool.query(
      `SELECT id, name, branch_id
       FROM students
       WHERE student_id = $1 OR barcode = $1`,
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentResult.rows[0];

    if (branch_id && Number(student.branch_id) !== Number(branch_id)) {
      return res.status(403).json({
        error: "This student is not from your assigned branch",
      });
    }

    const recent = await pool.query(
      `SELECT id
       FROM attendance
       WHERE student_id = $1
       AND attendance_type = $2
       AND scanned_at > NOW() - INTERVAL '5 seconds'`,
      [student.id, attendance_type]
    );

    if (recent.rows.length > 0) {
      return res.status(400).json({
        error: "Duplicate attendance detected",
      });
    }

    const latestAttendance = await pool.query(
      `SELECT attendance_type
       FROM attendance
       WHERE student_id = $1
       ORDER BY scanned_at DESC
       LIMIT 1`,
      [student.id]
    );

    if (latestAttendance.rows.length > 0) {
      const lastType = latestAttendance.rows[0].attendance_type;

      if (lastType === attendance_type) {
        return res.status(400).json({
          error:
            attendance_type === "check_in"
              ? "This student is already checked in."
              : "This student is already checked out.",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO attendance (
        student_id,
        scanned_by,
        attendance_type,
        status,
        category,
        notes
      )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        student.id,
        scanned_by || null,
        attendance_type,
        "recorded",
        category || "weekly",
        notes || null,
      ]
    );

    await createLog(
      scanned_by || null,
      "MANUAL_ATTENDANCE",
      `${student.name} was manually marked as ${attendance_type}${
        category ? ` (${category})` : ""
      }${notes ? ` - Note: ${notes}` : ""}`
    );

    res.status(201).json({
      message:
        attendance_type === "check_in"
          ? `${student.name} checked in successfully`
          : `${student.name} checked out successfully`,
      attendance: result.rows[0],
    });
  } catch (err) {
    console.error("POST /attendance/manual error:", err);
    res.status(500).json({ error: "Failed to record manual attendance" });
  }
});

app.post("/attendance", async (req, res) => {
  try {
    const {
      student_id,
      attendance_type,
      scanned_by,
      notes,
      branch_id,
      category,
    } = req.body;

    if (!student_id || !attendance_type) {
      return res.status(400).json({
        error: "student_id and attendance_type are required",
      });
    }

    if (!["check_in", "check_out"].includes(attendance_type)) {
      return res.status(400).json({
        error: "attendance_type must be check_in or check_out",
      });
    }

    const studentCheck = await pool.query(
      `SELECT id, branch_id, name
       FROM students
       WHERE id = $1`,
      [student_id]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentCheck.rows[0];

    if (branch_id && Number(student.branch_id) !== Number(branch_id)) {
      return res.status(403).json({
        error: "This student is not from your assigned branch",
      });
    }

    const recent = await pool.query(
      `SELECT id
       FROM attendance
       WHERE student_id = $1
       AND attendance_type = $2
       AND scanned_at > NOW() - INTERVAL '5 seconds'`,
      [student_id, attendance_type]
    );

    if (recent.rows.length > 0) {
      return res.status(400).json({
        error:
          "Duplicate scan detected. Please wait a moment before trying again.",
      });
    }

    const latestAttendance = await pool.query(
      `SELECT attendance_type
       FROM attendance
       WHERE student_id = $1
       ORDER BY scanned_at DESC
       LIMIT 1`,
      [student_id]
    );

    if (latestAttendance.rows.length > 0) {
      const lastType = latestAttendance.rows[0].attendance_type;

      if (lastType === attendance_type) {
        return res.status(400).json({
          error:
            attendance_type === "check_in"
              ? "This student is already checked in."
              : "This student is already checked out.",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO attendance (
        student_id,
        scanned_by,
        attendance_type,
        status,
        category,
        notes
      )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        student_id,
        scanned_by || null,
        attendance_type,
        "recorded",
        category || "weekly",
        notes || null,
      ]
    );

    await createLog(
      scanned_by || null,
      "SCAN_ATTENDANCE",
      `${student.name} was scanned as ${attendance_type}${
        category ? ` (${category})` : ""
      }${notes ? ` - Note: ${notes}` : ""}`
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /attendance error:", err);
    res.status(500).json({ error: "Failed to log attendance" });
  }
});

app.put("/attendance/:id/note", async (req, res) => {
  try {
    const { id } = req.params;
    const { category, notes, updated_by } = req.body;

    const result = await pool.query(
      `UPDATE attendance
       SET category = $1,
           notes = $2
       WHERE id = $3
       RETURNING *`,
      [category || "weekly", notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }

    await createLog(
      updated_by || null,
      "UPDATE_ATTENDANCE_NOTE",
      `Updated attendance note for record ${id}: ${category || "weekly"}${
        notes ? ` - ${notes}` : ""
      }`
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /attendance/:id/note error:", err);
    res.status(500).json({ error: "Failed to update attendance note" });
  }
});

/* =========================================================
   STUDENT ROUTES
========================================================= */
/**
 * Create a new student
 */
app.post("/students", async (req, res) => {
  try {
    const {
      student_id,
      name,
      barcode,
      profile_image,
      dob,
      gender,
      year_level,
      phone_number,
      guardian_name,
      guardian_phone,
      address,
      branch_id,
      room_id,
      status,
      remarks,
    } = req.body;

    console.log("Incoming student payload:", req.body);

    // Required field validation
    if (!student_id || !name || !barcode || !branch_id) {
      return res.status(400).json({
        error: "student_id, name, barcode, and branch_id are required",
      });
    }

    // Room capacity validation before assigning student
    if (room_id) {
      const roomResult = await pool.query(
        `SELECT 
            r.id,
            r.capacity,
            COUNT(s.id) AS occupant_count
         FROM rooms r
         LEFT JOIN students s ON s.room_id = r.id
         WHERE r.id = $1
         GROUP BY r.id, r.capacity`,
        [room_id]
      );

      if (roomResult.rows.length === 0) {
        return res.status(404).json({ error: "Selected room not found" });
      }

      const room = roomResult.rows[0];
      const occupantCount = Number(room.occupant_count);
      const capacity = Number(room.capacity);

      if (occupantCount >= capacity) {
        return res.status(400).json({ error: "Selected room is already full" });
      }
    }

    const result = await pool.query(
      `INSERT INTO students (
        student_id,
        name,
        barcode,
        profile_image,
        dob,
        gender,
        year_level,
        phone_number,
        guardian_name,
        guardian_phone,
        address,
        branch_id,
        room_id,
        status,
        remarks
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *`,
      [
        student_id,
        name,
        barcode,
        profile_image || null,
        dob || null,
        gender || null,
        year_level || null,
        phone_number || null,
        guardian_name || null,
        guardian_phone || null,
        address || null,
        branch_id,
        room_id || null,
        status || "active",
        remarks || null,
      ]
    );

    await createLog(
      req.body.created_by || null,
      "CREATE_STUDENT",
      `Created student ${name} (${student_id})`
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /students error:", err);

    const errorCode =
      typeof err === "object" && err !== null && "code" in err
        ? err.code
        : undefined;

    const errorMessage =
      typeof err === "object" && err !== null && "message" in err
        ? err.message
        : "Failed to create student";

    if (errorCode === "23505") {
      return res.status(400).json({
        error: "Student ID or barcode already exists",
      });
    }

    if (errorCode === "23514") {
      return res.status(400).json({
        error: "Invalid field value",
      });
    }

    if (errorCode === "22P02") {
      return res.status(400).json({
        error: "Invalid input format",
      });
    }

    res.status(500).json({
      error: errorMessage,
    });
  }
});

/**
 * Get all students with branch and room details
 */
app.get("/students", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          s.id,
          s.student_id,
          s.name,
          s.barcode,
          s.profile_image,
          s.dob,
          s.gender,
          s.year_level,
          s.phone_number,
          s.guardian_name,
          s.guardian_phone,
          s.address,
          s.branch_id,
          s.room_id,
          s.status,
          s.remarks,
          s.created_at,
          b.name AS branch_name,
          r.unit,
          r.lorong,
          r.room_number,
          r.capacity
       FROM students s
       LEFT JOIN branches b ON s.branch_id = b.id
       LEFT JOIN rooms r ON s.room_id = r.id
       ORDER BY s.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /students error:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// student details
app.get("/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const studentResult = await pool.query(
      `SELECT 
          s.id,
          s.student_id,
          s.name,
          s.barcode,
          s.profile_image,
          s.dob,
          s.gender,
          s.year_level,
          s.phone_number,
          s.guardian_name,
          s.guardian_phone,
          s.address,
          s.branch_id,
          s.room_id,
          s.status,
          s.remarks,
          s.created_at,
          b.name AS branch_name,
          r.unit,
          r.lorong,
          r.room_number,
          r.capacity
       FROM students s
       LEFT JOIN branches b ON s.branch_id = b.id
       LEFT JOIN rooms r ON s.room_id = r.id
       WHERE s.id = $1`,
      [id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(studentResult.rows[0]);
  } catch (err) {
    console.error("GET /students/:id error:", err);
    res.status(500).json({ error: "Failed to fetch student details" });
  }
});

/**
 * Update existing student
 */
app.put("/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      student_id,
      name,
      barcode,
      profile_image,
      dob,
      gender,
      year_level,
      phone_number,
      guardian_name,
      guardian_phone,
      address,
      branch_id,
      room_id,
      status,
      remarks,
    } = req.body;

    // Required field validation
    if (!student_id || !name || !barcode || !branch_id) {
      return res.status(400).json({
        error: "student_id, name, barcode, and branch_id are required",
      });
    }

    // Room capacity validation when updating student
    if (room_id) {
      const roomResult = await pool.query(
        `SELECT 
            r.id,
            r.capacity,
            COUNT(s.id) FILTER (WHERE s.id != $2) AS occupant_count
         FROM rooms r
         LEFT JOIN students s ON s.room_id = r.id
         WHERE r.id = $1
         GROUP BY r.id, r.capacity`,
        [room_id, id]
      );

      if (roomResult.rows.length === 0) {
        return res.status(404).json({ error: "Selected room not found" });
      }

      const room = roomResult.rows[0];
      const occupantCount = Number(room.occupant_count);
      const capacity = Number(room.capacity);

      if (occupantCount >= capacity) {
        return res.status(400).json({ error: "Selected room is already full" });
      }
    }

    const result = await pool.query(
      `UPDATE students
       SET
         student_id = $1,
         name = $2,
         barcode = $3,
         profile_image = $4,
         dob = $5,
         gender = $6,
         year_level = $7,
         phone_number = $8,
         guardian_name = $9,
         guardian_phone = $10,
         address = $11,
         branch_id = $12,
         room_id = $13,
         status = $14,
         remarks = $15,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING *`,
      [
        student_id,
        name,
        barcode,
        profile_image || null,
        dob || null,
        gender || null,
        year_level || null,
        phone_number || null,
        guardian_name || null,
        guardian_phone || null,
        address || null,
        branch_id,
        room_id || null,
        status || "active",
        remarks || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    await createLog(
      req.body.updated_by || null,
      "UPDATE_STUDENT",
      `Updated student ${name} (${student_id})`
    ); 

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /students/:id error:", err);
    res.status(500).json({ error: "Failed to update student" });
  }
});

// delete student
app.delete("/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM students
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    await createLog(
      req.body.deleted_by || null,
      "DELETE_STUDENT",
      `Deleted student ${result.rows[0].name} (${result.rows[0].student_id})`
    );

    res.json({ message: "Student deleted successfully" });

  } catch (err) {
    console.error("DELETE /students/:id error:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

/* =========================================================
   STUDENT ATTENDANCE STATUS
========================================================= */

app.get("/students/:id/attendance-status", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT attendance_type, scanned_at
       FROM attendance
       WHERE student_id = $1
       ORDER BY scanned_at DESC
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.json({
        current_status: "checked_out",
        attendance_type: null,
        scanned_at: null,
      });
    }

    const latest = result.rows[0];

    res.json({
      current_status:
        latest.attendance_type === "check_in" ? "checked_in" : "checked_out",
      attendance_type: latest.attendance_type,
      scanned_at: latest.scanned_at,
    });
  } catch (err) {
    console.error("GET /students/:id/attendance-status error:", err);
    res.status(500).json({ error: "Failed to fetch attendance status" });
  }
});

/* =========================================================
   DASHBOARD admion routes
========================================================= */
app.get("/dashboard/admin", async (req, res) => {
  try {
    const totalStudents = await pool.query(
      `SELECT COUNT(*) FROM students`
    );

    const totalRooms = await pool.query(
      `SELECT COUNT(*) FROM rooms`
    );

    const totalWardens = await pool.query(
      `SELECT COUNT(*) FROM users WHERE role = 'warden'`
    );

    const activeRooms = await pool.query(
      `SELECT COUNT(*) FROM rooms WHERE status = 'active'`
    );

    const todayLogsCount = await pool.query(
      `SELECT COUNT(*)
       FROM logs
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    const todayLogs = await pool.query(
      `SELECT
          l.id,
          u.name AS user_name,
          u.role AS user_role,
          b.name AS branch_name,
          l.action,
          l.details,
          l.created_at
       FROM logs l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE DATE(l.created_at) = CURRENT_DATE
       ORDER BY l.created_at DESC
       LIMIT 12`
    );

    const wardenActivity = await pool.query(
      `SELECT
          u.id AS user_id,
          u.name,
          u.email,
          b.name AS branch_name,
          COUNT(l.id)::int AS action_count
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       LEFT JOIN logs l
         ON l.user_id = u.id
         AND DATE(l.created_at) = CURRENT_DATE
       WHERE u.role = 'warden'
       GROUP BY u.id, b.name
       ORDER BY action_count DESC, u.name ASC`
    );

    res.json({
      summary: {
        totalStudents: Number(totalStudents.rows[0].count),
        totalRooms: Number(totalRooms.rows[0].count),
        totalWardens: Number(totalWardens.rows[0].count),
        activeRooms: Number(activeRooms.rows[0].count),
        todayLogs: Number(todayLogsCount.rows[0].count),
      },
      todayLogs: todayLogs.rows,
      wardenActivity: wardenActivity.rows,
    });
  } catch (err) {
    console.error("GET /dashboard/admin error:", err);
    res.status(500).json({ error: "Failed to fetch admin dashboard" });
  }
});

/* =========================================================
   DASHBOARD ROUTES
========================================================= */

/**
 * Get dashboard summary stats
 */
app.get("/dashboard/stats", async (req, res) => {
  try {
    const { branch_id } = req.query;

    const values = [];
    let studentWhere = "";
    let roomWhere = "";
    let attendanceJoin = "";
    let attendanceWhere = "WHERE DATE(a.scanned_at) = CURRENT_DATE";

    if (branch_id) {
      values.push(branch_id);
      studentWhere = `WHERE branch_id = $1`;
      roomWhere = `WHERE branch_id = $1`;
      attendanceJoin = `JOIN students s ON a.student_id = s.id`;
      attendanceWhere = `WHERE DATE(a.scanned_at) = CURRENT_DATE AND s.branch_id = $1`;
    }

    const totalStudents = await pool.query(
      `SELECT COUNT(*) FROM students ${studentWhere}`,
      values
    );

    const totalRooms = await pool.query(
      `SELECT COUNT(*) FROM rooms ${roomWhere}`,
      values
    );

    const todayScans = await pool.query(
      `SELECT COUNT(*)
       FROM attendance a
       ${attendanceJoin}
       ${attendanceWhere}`,
      values
    );

    res.json({
      totalStudents: Number(totalStudents.rows[0].count),
      totalRooms: Number(totalRooms.rows[0].count),
      todayScans: Number(todayScans.rows[0].count),
    });
  } catch (err) {
    console.error("GET /dashboard/stats error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

/**
 * Get recent attendance records for dashboard activity panel
 */
app.get("/dashboard/recent-attendance", async (req, res) => {
  try {
    const { branch_id } = req.query;

    const values = [];
    let whereSQL = "";

    if (branch_id) {
      values.push(branch_id);
      whereSQL = `WHERE students.branch_id = $1`;
    }

    const result = await pool.query(
      `SELECT 
          attendance.id,
          attendance.attendance_type,
          attendance.scanned_at,
          attendance.category,
          attendance.notes,
          students.name,
          students.student_id AS student_code,
          students.barcode,
          students.profile_image,
          rooms.room_number
      FROM attendance
      JOIN students ON attendance.student_id = students.id
      LEFT JOIN rooms ON students.room_id = rooms.id
      ${whereSQL}
      ORDER BY attendance.scanned_at DESC
      LIMIT 10`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /dashboard/recent-attendance error:", err);
    res.status(500).json({ error: "Failed to fetch recent attendance" });
  }
});

app.get("/dashboard/overview", async (req, res) => {
  try {
    const { branch_id } = req.query;

    const values = branch_id ? [branch_id] : [];

    const branchStudentFilter = branch_id ? `WHERE s.branch_id = $1` : "";
    const branchRoomFilter = branch_id ? `WHERE branch_id = $1` : "";
    const branchNoRoomFilter = branch_id
      ? `WHERE branch_id = $1 AND room_id IS NULL`
      : `WHERE room_id IS NULL`;

    const inHostel = await pool.query(
      `SELECT COUNT(*) FROM (
         SELECT DISTINCT ON (a.student_id)
           a.student_id,
           a.attendance_type
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         ${branchStudentFilter}
         ORDER BY a.student_id, a.scanned_at DESC
       ) latest
       WHERE attendance_type = 'check_in'`,
      values
    );

    const checkedInToday = await pool.query(
      `SELECT COUNT(*)
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.attendance_type = 'check_in'
       AND DATE(a.scanned_at) = CURRENT_DATE
       ${branch_id ? "AND s.branch_id = $1" : ""}`,
      values
    );

    const checkedOutToday = await pool.query(
      `SELECT COUNT(*)
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.attendance_type = 'check_out'
       AND DATE(a.scanned_at) = CURRENT_DATE
       ${branch_id ? "AND s.branch_id = $1" : ""}`,
      values
    );

    const roomStats = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'active') AS active_rooms,
         COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_rooms
       FROM rooms
       ${branchRoomFilter}`,
      values
    );

    const fullRooms = await pool.query(
      `SELECT COUNT(*) FROM (
         SELECT r.id
         FROM rooms r
         LEFT JOIN students s 
           ON s.room_id = r.id
           AND s.status = 'active'
         ${branch_id ? "WHERE r.branch_id = $1" : ""}
         GROUP BY r.id, r.capacity
         HAVING COUNT(s.id) >= r.capacity
       ) full_rooms`,
      values
    );

    const noRoomStudents = await pool.query(
      `SELECT COUNT(*)
       FROM students
       ${branchNoRoomFilter}
       AND status = 'active'`,
      values
    );

    res.json({
      inHostel: Number(inHostel.rows[0].count),
      checkedInToday: Number(checkedInToday.rows[0].count),
      checkedOutToday: Number(checkedOutToday.rows[0].count),
      activeRooms: Number(roomStats.rows[0].active_rooms),
      inactiveRooms: Number(roomStats.rows[0].inactive_rooms),
      fullRooms: Number(fullRooms.rows[0].count),
      studentsWithoutRoom: Number(noRoomStudents.rows[0].count),
    });
  } catch (err) {
    console.error("GET /dashboard/overview error:", err);
    res.status(500).json({ error: "Failed to fetch overview data" });
  }
});

/* =========================================================
   ROOM ROUTES
========================================================= */

/**
 * Get all rooms with current occupant count
 */
app.get("/rooms", async (req, res) => {
  try {
    const { branch_id } = req.query;

    const values = [];

    let query = `
      SELECT 
          r.id,
          r.branch_id,
          b.name AS branch_name,
          r.unit,
          r.lorong,
          r.room_number,
          r.capacity,
          r.status,
          r.remarks,
          COUNT(s.id) AS occupant_count
       FROM rooms r
       LEFT JOIN branches b ON r.branch_id = b.id
       LEFT JOIN students s 
         ON s.room_id = r.id 
         AND s.status = 'active'
    `;

    if (branch_id) {
      values.push(branch_id);
      query += ` WHERE r.branch_id = $${values.length}`;
    }

    query += `
       GROUP BY r.id, b.name
       ORDER BY r.branch_id, r.unit, r.lorong, r.room_number
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (err) {
    console.error("GET /rooms error:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

app.get("/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const roomResult = await pool.query(
      `SELECT 
          r.id,
          r.branch_id,
          b.name AS branch_name,
          r.unit,
          r.lorong,
          r.room_number,
          r.capacity,
          r.status,
          r.remarks,
          COUNT(s.id) AS occupant_count
       FROM rooms r
       LEFT JOIN branches b ON r.branch_id = b.id
       LEFT JOIN students s ON s.room_id = r.id
       WHERE r.id = $1
       GROUP BY r.id, b.name`,
      [id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    const studentsResult = await pool.query(
      `SELECT 
          id,
          student_id,
          name,
          profile_image,
          year_level,
          status
       FROM students
       WHERE room_id = $1
       ORDER BY name ASC`,
      [id]
    );

    res.json({
      room: roomResult.rows[0],
      students: studentsResult.rows,
    });
  } catch (err) {
    console.error("GET /rooms/:id error:", err);
    res.status(500).json({ error: "Failed to fetch room details" });
  }
});

// create room
app.post("/rooms", async (req, res) => {
  try {
    const { branch_id, unit, lorong, room_number, capacity, status, remarks } = req.body;

    if (!branch_id || !unit || !lorong || !room_number || !capacity) {
      return res.status(400).json({
        error: "branch_id, unit, lorong, room_number, and capacity are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO rooms (
        branch_id,
        unit,
        lorong,
        room_number,
        capacity,
        status,
        remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [branch_id, unit, lorong, room_number, capacity, status, remarks || "active"]
    );

    await createLog(
      req.body.created_by || null,
      "CREATE_ROOM",
      `Created room ${room_number}, Unit ${unit}, Lorong ${lorong}`
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /rooms error:", err);

    const errorCode =
      typeof err === "object" && err !== null && "code" in err
        ? err.code
        : undefined;

    const errorMessage =
      typeof err === "object" && err !== null && "message" in err
        ? err.message
        : "Failed to create room";

    if (errorCode === "23505") {
      return res.status(400).json({
        error: "This room already exists in the selected branch",
      });
    }

    res.status(500).json({ error: errorMessage });
  }
});

// update room
app.put("/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { branch_id, unit, lorong, room_number, capacity, status, remarks } = req.body;

    if (!branch_id || !unit || !lorong || !room_number || !capacity) {
      return res.status(400).json({
        error: "branch_id, unit, lorong, room_number, and capacity are required",
      });
    }

    const occupantCheck = await pool.query(
      `SELECT COUNT(*) AS occupant_count
       FROM students
       WHERE room_id = $1`,
      [id]
    );

    const occupantCount = Number(occupantCheck.rows[0].occupant_count);

    if (occupantCount > Number(capacity)) {
      return res.status(400).json({
        error: "Capacity cannot be less than current occupant count",
      });
    }

    const result = await pool.query(
      `UPDATE rooms
       SET
         branch_id = $1,
         unit = $2,
         lorong = $3,
         room_number = $4,
         capacity = $5,
         status = $6,
         remarks = $7
       WHERE id = $8
       RETURNING *`,
      [branch_id, unit, lorong, room_number, capacity, status || "active", remarks || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await createLog(
      req.body.updated_by || null,
      "UPDATE_ROOM",
      `Updated room ${room_number}, Unit ${unit}, Lorong ${lorong}`
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /rooms/:id error:", err);
    res.status(500).json({ error: "Failed to update room" });
  }
});

// delete room
app.delete("/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const assignedStudents = await pool.query(
      `SELECT COUNT(*) AS student_count
       FROM students
       WHERE room_id = $1`,
      [id]
    );

    const studentCount = Number(assignedStudents.rows[0].student_count);

    if (studentCount > 0) {
      return res.status(400).json({
        error: "Cannot delete a room that still has assigned students",
      });
    }

    const result = await pool.query(
      `DELETE FROM rooms
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    await createLog(
      req.body.deleted_by || null,
      "DELETE_ROOM",
      `Deleted room ${result.rows[0].room_number}, Unit ${result.rows[0].unit}, Lorong ${result.rows[0].lorong}`
    );

    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error("DELETE /rooms/:id error:", err);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// branches route
app.get("/branches", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name
       FROM branches
       ORDER BY name ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /branches error:", err);
    res.status(500).json({ error: "Failed to fetch branches" });
  }
});

/* =========================================================
   lOGS ROUTES
========================================================= */
app.get("/logs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          l.id,
          l.user_id,
          u.name AS user_name,
          u.email AS user_email,
          u.role AS user_role,
          b.name AS branch_name,
          l.action,
          l.details,
          l.created_at
       FROM logs l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN branches b ON u.branch_id = b.id
       ORDER BY l.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /logs error:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

/* =========================================================
   lOGS scan failed route
========================================================= */

app.post("/logs/scan-failed", async (req, res) => {
  try {
    const { user_id, attempted_barcode, reason } = req.body;

    await createLog(
      user_id || null,
      "SCAN_FAILED",
      `Failed scan attempt: ${attempted_barcode || "unknown"} (${reason || "unknown"})`
    );

    res.json({ message: "Failed scan logged" });
  } catch (err) {
    console.error("POST /logs/scan-failed error:", err);
    res.status(500).json({ error: "Failed to log scan attempt" });
  }
});

/* =========================================================
   SERVER START
========================================================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
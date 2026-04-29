const pool = require("../config/db");
const { getAllowedBranchIds, hasBranchAccess } = require("../utils/access");
const { autoAssignBarber } = require("../utils/barberAssignment");
const {
  cleanString,
  fail,
  isValidDate,
  isValidTime,
  toPositiveInt,
} = require("../utils/validation");

// CREATE APPOINTMENT
const createAppointment = async (req, res) => {
  try {
    const {
      customer_id: rawCustomerId,
      service_id: rawServiceId,
      barber_id: rawBarberId,
      barber_name: rawBarberName,
      appointment_date: rawAppointmentDate,
      appointment_time: rawAppointmentTime,
      auto_assign: rawAutoAssign,
    } = req.body;
    const customer_id = toPositiveInt(rawCustomerId);
    const service_id = toPositiveInt(rawServiceId);
    const barber_id = rawBarberId ? toPositiveInt(rawBarberId) : null;
    const barber_name = cleanString(rawBarberName, 120);
    const appointment_date = cleanString(rawAppointmentDate, 10);
    const appointment_time = cleanString(rawAppointmentTime, 8);
    const auto_assign = Boolean(rawAutoAssign);

    if (!customer_id || !service_id || !appointment_date || !appointment_time) {
      return fail(res, "Missing required fields");
    }

    if (!isValidDate(appointment_date) || !isValidTime(appointment_time)) {
      return fail(res, "Appointment date or time is invalid");
    }

    const serviceCheck = await pool.query(
      "SELECT id, branch_id FROM services WHERE id = $1",
      [service_id]
    );
    const customerCheck = await pool.query(
      "SELECT id, branch_id FROM customers WHERE id = $1",
      [customer_id]
    );

    if (serviceCheck.rows.length === 0 || customerCheck.rows.length === 0) {
      return fail(res, "Selected customer or service does not exist");
    }

    const serviceBranchId = Number(serviceCheck.rows[0].branch_id);
    const customerBranchId = Number(customerCheck.rows[0].branch_id);

    if (serviceBranchId !== customerBranchId) {
      return fail(res, "Customer and service must belong to the same branch");
    }

    if (!hasBranchAccess(req, serviceBranchId)) {
      return fail(res, "You do not have access to that branch", 403);
    }

    let selectedBarberId = barber_id;
    let selectedBarberName = barber_name;

    if (auto_assign) {
      const assignedBarber = await autoAssignBarber(serviceBranchId);

      if (!assignedBarber) {
        return fail(res, "No available barber found for auto assignment");
      }

      selectedBarberId = Number(assignedBarber.id);
      selectedBarberName = assignedBarber.full_name;
    } else if (selectedBarberId) {
      const barberResult = await pool.query(
        `SELECT id, full_name, branch_id, availability_status, is_active
         FROM staff_barbers
         WHERE id = $1`,
        [selectedBarberId]
      );

      if (barberResult.rows.length === 0) {
        return fail(res, "Selected barber was not found");
      }

      const barber = barberResult.rows[0];

      if (Number(barber.branch_id) !== serviceBranchId) {
        return fail(res, "Selected barber must belong to the same branch");
      }

      if (!barber.is_active) {
        return fail(res, "Selected barber is inactive");
      }

      selectedBarberName = barber.full_name;
    }

    const result = await pool.query(
      `INSERT INTO appointments 
      (customer_id, service_id, barber_id, barber_name, appointment_date, appointment_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        customer_id,
        service_id,
        selectedBarberId,
        selectedBarberName,
        appointment_date,
        appointment_time,
      ]
    );

    res.status(201).json({
      message: "Appointment created",
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// GET ALL APPOINTMENTS
const getAppointments = async (req, res) => {
  try {
    const allowedBranchIds = getAllowedBranchIds(req);
    const result = await pool.query(
      `SELECT 
        a.*,
        c.full_name AS customer_name,
        s.name AS service_name,
        s.branch_id,
        COALESCE(sb.full_name, a.barber_name) AS assigned_barber_name
      FROM appointments a
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN staff_barbers sb ON sb.id = a.barber_id
      ${allowedBranchIds === null ? "" : "WHERE s.branch_id = ANY($1::int[])"}
      ORDER BY a.appointment_date DESC, a.appointment_time ASC`,
      allowedBranchIds === null ? [] : [allowedBranchIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createAppointment,
  getAppointments,
};

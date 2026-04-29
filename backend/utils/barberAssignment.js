const pool = require("../config/db");

async function getBranchBarbers(branchId) {
  const result = await pool.query(
    `SELECT sb.*
     FROM staff_barbers sb
     WHERE sb.branch_id = $1
       AND sb.is_active = TRUE
       AND sb.availability_status = 'available'
     ORDER BY sb.created_at ASC`,
    [branchId]
  );

  return result.rows;
}

async function getBarberWorkloads(barberIds) {
  if (!barberIds.length) {
    return new Map();
  }

  const activeResult = await pool.query(
    `SELECT barber_id, COUNT(*)::int AS total
     FROM tokens
     WHERE barber_id = ANY($1::int[])
       AND status IN ('waiting', 'in_progress')
     GROUP BY barber_id`,
    [barberIds]
  );

  const todayResult = await pool.query(
    `SELECT barber_id, COUNT(*)::int AS total
     FROM tokens
     WHERE barber_id = ANY($1::int[])
       AND DATE(created_at) = CURRENT_DATE
     GROUP BY barber_id`,
    [barberIds]
  );

  const map = new Map();

  for (const barberId of barberIds) {
    map.set(Number(barberId), {
      active_load: 0,
      assigned_today: 0,
    });
  }

  for (const row of activeResult.rows) {
    const current = map.get(Number(row.barber_id));
    if (current) {
      current.active_load = Number(row.total);
    }
  }

  for (const row of todayResult.rows) {
    const current = map.get(Number(row.barber_id));
    if (current) {
      current.assigned_today = Number(row.total);
    }
  }

  return map;
}

async function autoAssignBarber(branchId) {
  const barbers = await getBranchBarbers(branchId);

  if (!barbers.length) {
    return null;
  }

  const barberIds = barbers.map((barber) => Number(barber.id));
  const workloadMap = await getBarberWorkloads(barberIds);

  const ranked = [...barbers].sort((left, right) => {
    const leftWorkload = workloadMap.get(Number(left.id)) || {
      active_load: 0,
      assigned_today: 0,
    };
    const rightWorkload = workloadMap.get(Number(right.id)) || {
      active_load: 0,
      assigned_today: 0,
    };

    if (leftWorkload.active_load !== rightWorkload.active_load) {
      return leftWorkload.active_load - rightWorkload.active_load;
    }

    if (leftWorkload.assigned_today !== rightWorkload.assigned_today) {
      return leftWorkload.assigned_today - rightWorkload.assigned_today;
    }

    return new Date(left.created_at) - new Date(right.created_at);
  });

  return ranked[0];
}

module.exports = {
  autoAssignBarber,
};

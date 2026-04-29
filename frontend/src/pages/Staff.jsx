import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { titleCase } from "../lib/format";

const availabilityStatuses = ["available", "busy", "break", "offline"];
const skillLevels = ["general", "haircut", "beard", "facial", "color", "senior"];

export default function Staff({ auth }) {
  const [barbers, setBarbers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    branch_id: "",
    skill_level: "general",
    availability_status: "available",
  });

  const canManageStaff = ["super_admin", "manager"].includes(auth?.user?.role);

  const fetchPageData = async () => {
    try {
      const [staffResponse, branchesResponse] = await Promise.all([
        api.get("/staff"),
        api.get("/branches"),
      ]);
      setBarbers(staffResponse.data);
      setBranches(branchesResponse.data);
      setError("");
    } catch (requestError) {
      console.error("Error loading staff page:", requestError);
      setError(requestError.response?.data?.error || "Unable to load staff.");
    }
  };

  useEffect(() => {
    const loadStaffPage = async () => {
      await fetchPageData();
    };

    void loadStaffPage();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/staff", {
        ...formData,
        branch_id: Number(formData.branch_id),
      });

      setFormData({
        full_name: "",
        phone: "",
        branch_id: "",
        skill_level: "general",
        availability_status: "available",
      });
      setMessage("Barber added successfully.");
      await fetchPageData();
    } catch (requestError) {
      console.error("Error creating barber:", requestError);
      setError(requestError.response?.data?.error || "Unable to create barber.");
    }
  };

  const updateBarberField = (barberId, field, value) => {
    setBarbers((current) =>
      current.map((barber) =>
        barber.id === barberId
          ? {
              ...barber,
              [field]: value,
            }
          : barber
      )
    );
  };

  const handleSave = async (barber) => {
    setError("");
    setMessage("");

    try {
      await api.put(`/staff/${barber.id}`, {
        full_name: barber.full_name,
        phone: barber.phone,
        skill_level: barber.skill_level,
        availability_status: barber.availability_status,
        is_active: barber.is_active,
      });
      setMessage(`Updated ${barber.full_name}.`);
      await fetchPageData();
    } catch (requestError) {
      console.error("Error updating barber:", requestError);
      setError(requestError.response?.data?.error || "Unable to update barber.");
    }
  };

  return (
    <PageLayout
      title="Staff"
      description="Manage barber availability, spread work more fairly, and prepare the queue for smart automatic assignment."
      actions={<span className="badge">{barbers.length} barbers</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Barber Roster</h2>
              <p className="panel-subtitle">
                Track who is available now, who is on break, and who is carrying
                today&apos;s queue load.
              </p>
            </div>
          </div>

          {barbers.length === 0 ? (
            <div className="empty-state">No barbers found yet.</div>
          ) : (
            <div className="user-grid">
              {barbers.map((barber) => (
                <article className="panel user-card" key={barber.id}>
                  <div className="panel-header">
                    <div>
                      <h3>{barber.full_name}</h3>
                      <p className="panel-subtitle">{barber.branch_name || "Unknown branch"}</p>
                    </div>
                    <span
                      className={`status-badge status-${String(
                        barber.availability_status || "available"
                      ).replaceAll("_", "-")}`}
                    >
                      {titleCase(barber.availability_status || "available")}
                    </span>
                  </div>

                  <div className="form-grid">
                    <div className="field-grid">
                      <div className="field">
                        <label>Full name</label>
                        <input
                          type="text"
                          value={barber.full_name || ""}
                          disabled={!canManageStaff}
                          onChange={(event) =>
                            updateBarberField(barber.id, "full_name", event.target.value)
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Phone</label>
                        <input
                          type="text"
                          value={barber.phone || ""}
                          disabled={!canManageStaff}
                          onChange={(event) =>
                            updateBarberField(barber.id, "phone", event.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="field-grid">
                      <div className="field">
                        <label>Skill level</label>
                        <select
                          value={barber.skill_level || "general"}
                          disabled={!canManageStaff}
                          onChange={(event) =>
                            updateBarberField(barber.id, "skill_level", event.target.value)
                          }
                        >
                          {skillLevels.map((skill) => (
                            <option key={skill} value={skill}>
                              {titleCase(skill)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <label>Availability</label>
                        <select
                          value={barber.availability_status || "available"}
                          disabled={!canManageStaff}
                          onChange={(event) =>
                            updateBarberField(
                              barber.id,
                              "availability_status",
                              event.target.value
                            )
                          }
                        >
                          {availabilityStatuses.map((status) => (
                            <option key={status} value={status}>
                              {titleCase(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="field-grid">
                      <div className="field">
                        <label>Active queue load</label>
                        <input type="text" value={barber.active_load ?? 0} disabled />
                      </div>

                      <div className="field">
                        <label>Assigned today</label>
                        <input type="text" value={barber.assigned_today ?? 0} disabled />
                      </div>
                    </div>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={Boolean(barber.is_active)}
                        disabled={!canManageStaff}
                        onChange={(event) =>
                          updateBarberField(barber.id, "is_active", event.target.checked)
                        }
                      />
                      <span>Active barber</span>
                    </label>

                    {canManageStaff ? (
                      <div className="button-row">
                        <button type="button" onClick={() => handleSave(barber)}>
                          Save barber
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Add Barber</h2>
              <p className="panel-subtitle">
                Managers can prepare staff for auto-assignment by branch and
                current availability.
              </p>
            </div>
          </div>

          {canManageStaff ? (
            <form className="form-grid" onSubmit={handleCreate}>
              <div className="field">
                <label htmlFor="staff-full-name">Full name</label>
                <input
                  id="staff-full-name"
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      full_name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="staff-phone">Phone</label>
                <input
                  id="staff-phone"
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="staff-branch">Branch</label>
                <select
                  id="staff-branch"
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      branch_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-grid">
                <div className="field">
                  <label htmlFor="staff-skill">Skill level</label>
                  <select
                    id="staff-skill"
                    name="skill_level"
                    value={formData.skill_level}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        skill_level: event.target.value,
                      }))
                    }
                  >
                    {skillLevels.map((skill) => (
                      <option key={skill} value={skill}>
                        {titleCase(skill)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="staff-status">Availability</label>
                  <select
                    id="staff-status"
                    name="availability_status"
                    value={formData.availability_status}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        availability_status: event.target.value,
                      }))
                    }
                  >
                    {availabilityStatuses.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="button-row">
                <button type="submit">Add barber</button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              Your role can view barber availability, but only managers and super
              admin can add or edit staff.
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

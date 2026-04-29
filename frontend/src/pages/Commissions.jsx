import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { formatCurrency } from "../lib/format";
import { hasRole } from "../lib/auth";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function lastMonthString() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
}

export default function Commissions({ auth }) {
  const [branches, setBranches] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({
    start_date: lastMonthString(),
    end_date: todayString(),
    branch_id: "",
  });
  const [profileForm, setProfileForm] = useState({
    branch_id: "",
    barber_id: "",
    commission_percent: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManage = hasRole(auth?.user, ["super_admin", "manager"]);

  useEffect(() => {
    const loadCommissionsPage = async () => {
      try {
        const [branchResponse, barberResponse, commissionResponse] = await Promise.all([
          api.get("/branches"),
          api.get("/staff"),
          api.get("/commissions/summary", {
            params: {
              start_date: filters.start_date,
              end_date: filters.end_date,
              branch_id: filters.branch_id || undefined,
            },
          }),
        ]);
        setBranches(branchResponse.data);
        setBarbers(barberResponse.data);
        setReport(commissionResponse.data);
        setProfileForm((current) => ({
          ...current,
          branch_id: current.branch_id || String(branchResponse.data[0]?.id || ""),
        }));
        setError("");
      } catch (requestError) {
        console.error("Error loading commissions page:", requestError);
        setError(
          requestError.response?.data?.error || "Unable to load commission data."
        );
      }
    };

    void loadCommissionsPage();
  }, [filters.branch_id, filters.end_date, filters.start_date]);

  const fetchPageData = async () => {
    try {
      const [branchResponse, barberResponse, commissionResponse] = await Promise.all([
        api.get("/branches"),
        api.get("/staff"),
        api.get("/commissions/summary", {
          params: {
            start_date: filters.start_date,
            end_date: filters.end_date,
            branch_id: filters.branch_id || undefined,
          },
        }),
      ]);
      setBranches(branchResponse.data);
      setBarbers(barberResponse.data);
      setReport(commissionResponse.data);
      setProfileForm((current) => ({
        ...current,
        branch_id: current.branch_id || String(branchResponse.data[0]?.id || ""),
      }));
      setError("");
    } catch (requestError) {
      console.error("Error loading commissions page:", requestError);
      setError(
        requestError.response?.data?.error || "Unable to load commission data."
      );
    }
  };

  const handleFilterChange = (event) => {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleProfileChange = (event) => {
    setProfileForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleRunReport = async (event) => {
    event.preventDefault();
    try {
      const response = await api.get("/commissions/summary", {
        params: {
          start_date: filters.start_date,
          end_date: filters.end_date,
          branch_id: filters.branch_id || undefined,
        },
      });
      setReport(response.data);
      setError("");
    } catch (requestError) {
      console.error("Error fetching commission report:", requestError);
      setError(
        requestError.response?.data?.error || "Unable to run commission report."
      );
    }
  };

  const handleCreateProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.post("/commissions/profiles", {
        branch_id: Number(profileForm.branch_id),
        barber_id: Number(profileForm.barber_id),
        commission_percent: Number(profileForm.commission_percent),
      });
      setProfileForm((current) => ({
        ...current,
        barber_id: "",
        commission_percent: "",
      }));
      setMessage("Commission profile saved.");
      await fetchPageData();
    } catch (requestError) {
      console.error("Error creating commission profile:", requestError);
      setError(
        requestError.response?.data?.error || "Unable to save commission profile."
      );
    }
  };

  const handleProfileUpdate = async (profile) => {
    setMessage("");
    setError("");

    try {
      await api.put(`/commissions/profiles/${profile.id}`, {
        commission_percent: Number(profile.commission_percent),
        is_active: Boolean(profile.is_active),
      });
      setMessage(`Updated ${profile.barber_name}.`);
      await fetchPageData();
    } catch (requestError) {
      console.error("Error updating commission profile:", requestError);
      setError(
        requestError.response?.data?.error || "Unable to update commission profile."
      );
    }
  };

  const updateProfileField = (profileId, field, value) => {
    setReport((current) => ({
      ...current,
      profiles: (current?.profiles || []).map((profile) =>
        profile.id === profileId
          ? {
              ...profile,
              [field]: value,
            }
          : profile
      ),
    }));
  };

  const filteredBarbers = profileForm.branch_id
    ? barbers.filter(
        (barber) => Number(barber.branch_id) === Number(profileForm.branch_id)
      )
    : barbers;
  const summary = report?.summary || {};

  return (
    <PageLayout
      title="Commissions"
      description="Set barber commission percentages and review what each barber earned from completed service work across branches."
      actions={
        <span className="badge">
          {formatCurrency(summary.total_commission_earned)} commission
        </span>
      }
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-label">Total commission</p>
          <p className="stat-value">
            {formatCurrency(summary.total_commission_earned)}
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Service revenue</p>
          <p className="stat-value">{formatCurrency(summary.total_service_revenue)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Completed tokens</p>
          <p className="stat-value">{summary.total_completed_tokens || 0}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Missing profiles</p>
          <p className="stat-value">{summary.barbers_missing_profile || 0}</p>
        </article>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Commission Report</h2>
              <p className="panel-subtitle">
                Review payout exposure by date range and branch.
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleRunReport}>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="commission-start">Start date</label>
                <input
                  id="commission-start"
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="field">
                <label htmlFor="commission-end">End date</label>
                <input
                  id="commission-end"
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="commission-branch-filter">Branch</label>
              <select
                id="commission-branch-filter"
                name="branch_id"
                value={filters.branch_id}
                onChange={handleFilterChange}
              >
                <option value="">All allowed branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="button-row">
              <button type="submit">Run commission report</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Commission Profile</h2>
              <p className="panel-subtitle">
                Set a barber's percentage so HMS can calculate earnings automatically.
              </p>
            </div>
          </div>

          {canManage ? (
            <form className="form-grid" onSubmit={handleCreateProfile}>
              <div className="field">
                <label htmlFor="profile-branch">Branch</label>
                <select
                  id="profile-branch"
                  name="branch_id"
                  value={profileForm.branch_id}
                  onChange={handleProfileChange}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="profile-barber">Barber</label>
                <select
                  id="profile-barber"
                  name="barber_id"
                  value={profileForm.barber_id}
                  onChange={handleProfileChange}
                >
                  <option value="">Select barber</option>
                  {filteredBarbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="profile-percent">Commission percent</label>
                <input
                  id="profile-percent"
                  type="number"
                  name="commission_percent"
                  value={profileForm.commission_percent}
                  onChange={handleProfileChange}
                  placeholder="50"
                />
              </div>

              <div className="button-row">
                <button type="submit">Save profile</button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              Commission profile management is available for super admin and manager only.
            </div>
          )}
        </section>
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Barber Earnings</h2>
              <p className="panel-subtitle">
                Revenue and earned commission from completed token work.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Barber</th>
                  <th>Branch</th>
                  <th>Percent</th>
                  <th>Completed</th>
                  <th>Revenue</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(report?.earnings || []).map((earning) => (
                  <tr key={`${earning.barber_id}-${earning.profile_id || "none"}`}>
                    <td>{earning.barber_name}</td>
                    <td>{earning.branch_name}</td>
                    <td>{earning.commission_percent || 0}%</td>
                    <td>{earning.completed_tokens}</td>
                    <td>{formatCurrency(earning.service_revenue)}</td>
                    <td>{formatCurrency(earning.commission_earned)}</td>
                    <td>
                      <span
                        className={`status-badge status-${
                          earning.missing_profile ? "needs-attention" : "strong"
                        }`}
                      >
                        {earning.missing_profile ? "Missing Profile" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Commission Profiles</h2>
              <p className="panel-subtitle">
                Manage barber percentages branch by branch.
              </p>
            </div>
          </div>
          {(report?.profiles || []).length === 0 ? (
            <div className="empty-state">No commission profiles yet.</div>
          ) : (
            <div className="user-grid">
              {(report?.profiles || []).map((profile) => (
                <article className="panel user-card" key={profile.id}>
                  <div className="panel-header">
                    <div>
                      <h3>{profile.barber_name}</h3>
                      <p className="panel-subtitle">{profile.branch_name}</p>
                    </div>
                    <span
                      className={`status-badge status-${
                        profile.is_active ? "strong" : "inactive"
                      }`}
                    >
                      {profile.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label>Commission percent</label>
                      <input
                        type="number"
                        value={profile.commission_percent}
                        disabled={!canManage}
                        onChange={(event) =>
                          updateProfileField(
                            profile.id,
                            "commission_percent",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={Boolean(profile.is_active)}
                        disabled={!canManage}
                        onChange={(event) =>
                          updateProfileField(profile.id, "is_active", event.target.checked)
                        }
                      />
                      <span>Active profile</span>
                    </label>

                    {canManage ? (
                      <div className="button-row">
                        <button type="button" onClick={() => handleProfileUpdate(profile)}>
                          Save profile
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

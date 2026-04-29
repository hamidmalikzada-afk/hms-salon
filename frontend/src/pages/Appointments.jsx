import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout";
import api from "../lib/api";
import { formatDate, formatTime, titleCase } from "../lib/format";

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);

  const [formData, setFormData] = useState({
    customer_id: "",
    service_id: "",
    barber_id: "",
    barber_name: "",
    appointment_date: "",
    appointment_time: "",
    auto_assign: true,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/appointments");
      setAppointments(res.data);
      setError("");
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setError("Unable to load appointments.");
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get("/services");
      setServices(res.data);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchBarbers = async () => {
    try {
      const res = await api.get("/staff");
      setBarbers(res.data);
    } catch (error) {
      console.error("Error fetching barbers:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();

    try {
      await api.post("/appointments", {
        customer_id: Number(formData.customer_id),
        service_id: Number(formData.service_id),
        barber_id: formData.barber_id ? Number(formData.barber_id) : null,
        barber_name: formData.auto_assign ? "" : formData.barber_name,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        auto_assign: formData.auto_assign,
      });

      setFormData({
        customer_id: "",
        service_id: "",
        barber_id: "",
        barber_name: "",
        appointment_date: "",
        appointment_time: "",
        auto_assign: true,
      });

      setMessage("Appointment created successfully.");
      fetchAppointments();
    } catch (error) {
      console.error("Error creating appointment:", error);
      setMessage("");
      setError("Failed to create appointment.");
    }
  };

  useEffect(() => {
    const loadAppointmentsPage = async () => {
      await Promise.all([
        fetchAppointments(),
        fetchCustomers(),
        fetchServices(),
        fetchBarbers(),
      ]);
    };

    void loadAppointmentsPage();
  }, []);

  const selectedService = services.find(
    (service) => Number(service.id) === Number(formData.service_id)
  );
  const filteredBarbers = selectedService
    ? barbers.filter((barber) => Number(barber.branch_id) === Number(selectedService.branch_id))
    : barbers;

  return (
    <PageLayout
      title="Appointments"
      description="Schedule upcoming salon visits with customer, service, date, time, and assigned barber details."
      actions={<span className="badge">{appointments.length} appointments</span>}
    >
      {message ? <div className="feedback success">{message}</div> : null}
      {error ? <div className="feedback error">{error}</div> : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Book Appointment</h2>
              <p className="panel-subtitle">
                Ideal for planned bookings and time-based barber schedules.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateAppointment} className="form-grid">
            <div className="field">
              <label htmlFor="appointment-customer">Customer</label>
              <select
                id="appointment-customer"
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="appointment-service">Service</label>
              <select
                id="appointment-service"
                name="service_id"
                value={formData.service_id}
                onChange={handleChange}
              >
                <option value="">Select service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.price} AFN
                  </option>
                ))}
              </select>
            </div>

            <div className="field-grid">
              <div className="field">
                <label className="checkbox-item" htmlFor="appointment-auto-assign">
                  <input
                    id="appointment-auto-assign"
                    type="checkbox"
                    name="auto_assign"
                    checked={formData.auto_assign}
                    onChange={handleChange}
                  />
                  <span>Auto assign barber fairly</span>
                </label>
              </div>

              <div className="field">
                <label htmlFor="appointment-date">Date</label>
                <input
                  id="appointment-date"
                  type="date"
                  name="appointment_date"
                  value={formData.appointment_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            {formData.auto_assign ? (
              <div className="empty-state">
                HMS will recommend the fairest available barber for this booking.
              </div>
            ) : (
              <div className="field">
                <label htmlFor="appointment-barber">Barber</label>
                <select
                  id="appointment-barber"
                  name="barber_id"
                  value={formData.barber_id}
                  onChange={handleChange}
                >
                  <option value="">Select barber</option>
                  {filteredBarbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.full_name} - {titleCase(barber.availability_status)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label htmlFor="appointment-time">Time</label>
              <input
                id="appointment-time"
                type="time"
                name="appointment_time"
                value={formData.appointment_time}
                onChange={handleChange}
              />
            </div>

            <div className="button-row">
              <button type="submit">Create appointment</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Upcoming Schedule</h2>
              <p className="panel-subtitle">
                Review customer bookings in date order.
              </p>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="empty-state">No appointments found.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Barber</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>{appointment.id}</td>
                      <td>{appointment.customer_name || "-"}</td>
                      <td>{appointment.service_name || "-"}</td>
                      <td>
                        {appointment.assigned_barber_name || appointment.barber_name || "-"}
                      </td>
                      <td>{formatDate(appointment.appointment_date)}</td>
                      <td>{formatTime(appointment.appointment_time)}</td>
                      <td>
                        <span
                          className={`status-badge status-${String(
                            appointment.status || "pending"
                          ).replaceAll("_", "-")}`}
                        >
                          {titleCase(appointment.status || "pending")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

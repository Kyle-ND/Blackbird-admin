// Refuse to run the suite against an API that would send real email.
// The specs create and cancel bookings, which triggers client / technician /
// front-desk notifications; those must land in EMAIL_OUTBOX_DIR, never SMTP.
const API = process.env.API_BASE || "http://127.0.0.1:8000";

export default async function globalSetup() {
  let health;
  try {
    health = await (await fetch(`${API}/health`)).json();
  } catch (err) {
    throw new Error(`API at ${API} is not reachable (${err.message}). Start it with BB-Booking-sys/dev/test.sh`);
  }
  if (health.email_mode !== "outbox") {
    throw new Error(
      `Refusing to run: API at ${API} has email_mode="${health.email_mode}". ` +
        `Tests send booking notifications; run the API with EMAIL_OUTBOX_DIR set (BB-Booking-sys/dev/test.sh) and point API_BASE at it.`
    );
  }
  if (health.database !== "local") {
    throw new Error(`Refusing to run: API at ${API} is connected to "${health.database}" data, not the local test database.`);
  }
}

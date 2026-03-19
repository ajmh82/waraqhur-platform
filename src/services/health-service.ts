export function getHealthSnapshot() {
  return {
    success: true,
    service: "waraqhur",
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}

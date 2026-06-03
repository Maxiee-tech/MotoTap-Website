export const JobStatus = {
  REQUESTED: "REQUESTED",
  MATCHING: "MATCHING",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  PAID: "PAID",
  CLOSED: "CLOSED"
};

export function createJobRequest({
  id,
  driverId,
  mechanicId = null,
  issueType,
  description = "",
  locationLabel,
  status,
  price,
  createdAtMillis,
}) {
  return {
    id,
    driverId,
    mechanicId,
    issueType,
    description,
    locationLabel,
    status,
    price,
    createdAtMillis,
  };
}

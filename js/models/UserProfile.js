export const UserRole = {
  DRIVER: "DRIVER",
  MECHANIC: "MECHANIC",
  ADMIN: "ADMIN",
};

export function createUserProfile({
  id,
  name,
  phone,
  role,
  skills = [],
}) {
  return {
    id,
    name,
    phone,
    role,
    skills,
  };
}

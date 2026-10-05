/** Demo accounts created by `npm run seed`. Shown on the login page only when
 * NEXT_PUBLIC_SHOW_DEMO_LOGINS=true. Passwords are never shipped to the browser. */
export const DEMO_ACCOUNTS = [
  { role: "Admin", name: "Alex Morgan", email: "admin@northstar.example.com" },
  { role: "Marketing", name: "Maya Patel", email: "marketing@northstar.example.com" },
  { role: "Compliance Reviewer", name: "Chris Lindqvist", email: "compliance@northstar.example.com" },
] as const;

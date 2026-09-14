// ─────────────────────────────────────────────────────────
//  Add your faculty's actual college email addresses here.
//  The display name is shown on the dashboard.
// ─────────────────────────────────────────────────────────
export const FACULTY: { name: string; email: string }[] = [
  { name: "Mattakoyya Aharonu", email: "aharonu.mattakoyya@vitap.ac.in" },
  { name: "Mannepuli Srujana", email: "srujana.m@vitap.ac.in" },
  { name: "Amgothu Shanthi", email: "shanthi.a@vitap.ac.in" },
  { name: "Asish Kumar Dalai", email: "asish.d@vitap.ac.in" },
  { name: "Paritala Jhansirani", email: "jhansirani.p@vitap.ac.in" },
  { name: "Afzal Hussain Shahid", email: "afzal.hussain@vitap.ac.in" },
  { name: "Somya Ranjan Sahoo", email: "somyaranjan.sahoo@vitap.ac.in" },
  { name: "Chintakindi Balaram Murthy", email: "balaram.ch@vitap.ac.in" },
  { name: "Vijaykumar Thalla", email: "sts_30083@vitap.ac.in" },
];

export const FACULTY_EMAILS = new Set(FACULTY.map((f) => f.email.toLowerCase()));

export function getFacultyName(email: string): string {
  const match = FACULTY.find(
    (f) => f.email.toLowerCase() === email.toLowerCase()
  );
  return match?.name ?? email;
}

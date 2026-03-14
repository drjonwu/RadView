/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clinical palette
        verdict: {
          appropriate: '#16a34a',    // green-600
          may: '#d97706',            // amber-600
          not: '#dc2626',            // red-600
        },
        modality: {
          ct: '#2563eb',             // blue-600
          mri: '#7c3aed',           // violet-600
          xray: '#6b7280',          // gray-500
          us: '#059669',            // emerald-600
          pet: '#ea580c',           // orange-600
          mammo: '#db2777',         // pink-600
          other: '#475569',         // slate-600
        },
      },
    },
  },
  plugins: [],
};

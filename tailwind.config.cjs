


// const { fontFamily } = require('tailwindcss/defaultTheme');

// module.exports = {
//   content: ['./src/**/*.{js,ts,jsx,tsx}'],
//   theme: {
//     extend: {
//       fontFamily: {
//         sans: ['Inter', ...fontFamily.sans],
//       },
//       colors: {
//         // App-level tokens
//         background: '#f9f9fb', // soft off-white
//         surface: '#ffffff', // card background
//         border: '#e5e7eb', // light gray border
//         muted: '#6b7280', // subdued text

//         primary: '#231fd5', // your bold blue
//         accent: '#5570f0', // optional lighter accent blue
//         text: '#111827', // deep gray for body text
//       },
//     },
//   },
//   plugins: [],
// };


/* tailwind.config.cjs */
const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // DM Sans = free, close in feel to Uncountable's marketing font
        sans: ['"DM Sans"', ...fontFamily.sans],
      },
      colors: {
        // App-wide tokens
        background: '#f7f8fc',
        surface: '#ffffff',
        border: '#e0e7ff',
        muted: '#6b7280',
        primary: '#231fd5', // core Uncountable blue
        accent: '#5570f0',
      },
      boxShadow: {
        card: '0 10px 25px rgba(35, 31, 213, 0.08)',
      },
    },
  },
  plugins: [],
};



# Mock Uncountable

This project is a small sandbox that recreates a few core ideas behind the Uncountable platform. It lets you explore a toy dataset, inspect relationships between inputs and outputs, and view heuristic and model-powered suggestions for optimization. Everything runs fully in the browser and does not require a backend unless you enable the optional OpenAI features.

---

## Features

- **Interactive data explorer**  
  Browse the dataset and inspect how inputs and outputs vary.

- **Measurement-range analysis with mini histograms**  
  See which input usage bands appear most often inside a target output window.

- **Scatter plot explorer**  
  Choose any two variables and visualize their relationship.

- **Heuristic optimization advisor**  
  Highlights cost, cure-time and field-performance levers by comparing a chosen experiment to dataset statistics.

- **Optional GPT-powered advisor**  
  Uses a compact prompt to generate concrete suggestions for the next experiments.

- **Clean, lightweight UI**  
  Built with Tailwind CSS.

- **Fully client-side**  
  All logic runs in the browser. No backend needed.

---

## Tech Stack

- React  
- TypeScript  
- Vite  
- Tailwind CSS  
- Recharts  
- OpenAI JS SDK (optional)

---

## Development

Install dependencies:

```sh
npm install

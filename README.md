Mock Uncountable

Mock Uncountable is a small frontend app that explores a formulations dataset for an elastomer system. It lets you look at experiments, compare inputs and outputs, explore trends, and get both heuristic and optional GPT powered suggestions for next steps in the formulation. The goal of this project is to show clean code, clear UX, and a simple but thoughtful data exploration flow.

What you can do with this app
Scatter Explorer

Pick any variable for the X axis and Y axis.

The chart updates instantly.

Hover to see the exact values.

Good for spotting trends between ingredients and performance metrics.

Measurement Range Explorer

Pick a performance metric like Tensile Strength.

Enter a minimum and maximum value to define a target range.

For each input, see a histogram of how that ingredient behaves in experiments that fall inside the chosen performance window.

Good for answering: “When the output looks good, what input ranges tend to appear?”

Optimization Advisor

Pick any experiment from the dataset as an “anchor run”.

See its inputs and outputs summarised in compact grids.

Three heuristic cards show:

Cost levers

Cure time and oven utilisation

Field performance and scrap

Each card has human friendly bullets.

A “Why” view explains exactly which rule triggered each suggestion.

Optional GPT powered suggestions

If you provide an OpenAI API key, the app can ask gpt-4.1-mini for ideas.

The app builds a compact prompt that summarises the anchor run and dataset statistics.

The model returns grouped, numbered, concrete suggestions.

The UI also shows a prompt preview and a rough token estimate.

If you do not provide a key, the feature is simply disabled and the rest of the app works normally.

Tech stack

This project is built with:

React + TypeScript

Vite for fast dev and production builds

Tailwind CSS for styling

Recharts for all visual charts

OpenAI Node SDK for optional GPT calls

There is no backend and no server. Everything runs in the browser. If GPT calls are enabled, they go straight from the browser to OpenAI.

Getting started
1. Install Node

You need Node 18 or newer. npm comes with Node.

2. Install dependencies
npm install

3. Run the dev server
npm run dev


Open the URL printed in the terminal (usually http://localhost:5173
).

4. Build for production
npm run build


The production build is output to the dist folder.

Preview it locally with:

npm run preview

Enabling GPT powered suggestions (optional)

The app does not require GPT to run. It works perfectly without it.

If you want GPT ideas:

Create a file named .env.local in the root folder.

Add this line:

VITE_OPENAI_API_KEY=your_key_here


Restart the dev server.

Security note:
Never commit .env, .env.local, or your API key. In real production you would not call GPT from the browser. You would send the request through a backend and keep the key on the server.

Project structure

Here are the important parts of the repository:

src/
  components/
    Header.tsx              top bar with logo, title and feature list
    Tabs.tsx                pill style tab navigation
    ScatterExplorer.tsx     scatter plot view
    MeasurementRange.tsx    range based histograms per input
    OptimizationAdvisor.tsx heuristic advisor + GPT suggestions

  data/
    experimentData.ts       raw JSON-like dataset object
    experiments.ts          typed model, helpers, key lists

  services/
    advisor.ts              heuristic rule engine
    advisorLLM.ts           GPT prompt builder + call wrapper
    openaiClient.ts         small helper that creates an OpenAI client

  App.tsx                   top level layout, tab switching
  main.tsx                  React entry point


The structure keeps UI code in components, data parsing in data, and external logic or API related code in services.

About the dataset

The dataset lives in src/data/experimentData.ts.
It is loaded and typed in experiments.ts.

Each experiment looks like this:

{
  id: "Run-001",
  inputs: {
    "Polymer 1": 45.0,
    "Silica Filler 1": 10.0,
    ...
  },
  outputs: {
    "Tensile Strength": 12.3,
    "Compression Set": 18.4,
    ...
  }
}


The app automatically extracts the input keys and output keys from the very first experiment, so the UI knows what to display without any hardcoding.

Deploying on Vercel

Deployment is simple because the app is static.

Push your repository to GitHub.

In Vercel, import the repo.

Use these defaults:

Build command: npm run build

Output directory: dist

If you want GPT suggestions in production, add your key as:

VITE_OPENAI_API_KEY=your_key_here


inside Vercel’s environment variables panel.

After deployment, Vercel will serve your built site at your project URL.

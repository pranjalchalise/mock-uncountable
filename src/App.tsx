import { useState } from 'react';
import { Header } from './components/Header';
import { Tabs, Panel, type TabId } from './components/Tabs';
import { ScatterExplorer } from './components/ScatterExplorer';
import { MeasurementRange } from './components/MeasurementRange';
import { OptimizationAdvisor } from './components/OptimizationAdvisor';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('advisor');

  return (
    <div className="min-h-screen bg-background text-slate-900">
      <Header />

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs activeTab={activeTab} onChange={setActiveTab} />
          {/* removed dataset summary per your request */}
        </div>

        {activeTab === 'advisor' && (
          <Panel title="Optimization Advisor">
            <OptimizationAdvisor />
          </Panel>
        )}

        {activeTab === 'range' && (
          <Panel title="Measurement Range Explorer">
            <MeasurementRange />
          </Panel>
        )}
        {activeTab === 'scatter' && (
          <Panel title="Scatter Explorer">
            <ScatterExplorer />
          </Panel>
        )}

      

       
      </main>
    </div>
  );
}

export default App;

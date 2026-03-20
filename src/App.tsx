import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">WisFlow</h1>
        <p className="text-slate-400">智能语音输入助手</p>
        <div className="mt-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-500">按 Ctrl+Shift+V 开始语音输入</p>
        </div>
      </div>
    </div>
  );
}

export default App;

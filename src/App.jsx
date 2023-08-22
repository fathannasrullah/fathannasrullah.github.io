import { 
  BrowserRouter as Router,
  Route, 
  Routes
} from 'react-router-dom';

import About from './components/About';
import Projects from './components/Projects';

import './App.scss';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/projects" element={<Projects />} />
          <Route path="/" element={<About />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
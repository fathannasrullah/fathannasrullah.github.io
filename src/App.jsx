import { 
  BrowserRouter as Router,
  Route, 
  Routes
} from 'react-router-dom';

import About from './components/About';
import Projects from './components/Projects';

import Home from './components/Home/Home';

import './App.scss';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
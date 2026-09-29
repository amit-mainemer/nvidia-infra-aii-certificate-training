import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Roadmap from './pages/Roadmap.jsx'
import Module from './pages/Module.jsx'
import Lesson from './pages/Lesson.jsx'
import Practice from './pages/Practice.jsx'
import MockExam from './pages/MockExam.jsx'
import Glossary from './pages/Glossary.jsx'
import Resources from './pages/Resources.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/module/:moduleId" element={<Module />} />
        <Route path="/module/:moduleId/:lessonId" element={<Lesson />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/practice/:moduleId" element={<Practice />} />
        <Route path="/exam" element={<MockExam />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

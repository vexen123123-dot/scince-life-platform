import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { Spinner } from './components/ui';
import AdminLayout from './layouts/AdminLayout';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

const Lessons = lazy(() => import('./pages/Lessons'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const LabPage = lazy(() => import('./pages/LabPage'));
const ConceptMapsPage = lazy(() => import('./pages/ConceptMapsPage'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const QuizzesList = lazy(() => import('./pages/QuizzesPage').then((m) => ({ default: m.QuizzesList })));
const QuizPage = lazy(() => import('./pages/QuizzesPage').then((m) => ({ default: m.QuizPage })));
const SimulationsList = lazy(() => import('./pages/SimulationsPage').then((m) => ({ default: m.SimulationsList })));
const SimulationPage = lazy(() => import('./pages/SimulationsPage').then((m) => ({ default: m.SimulationPage })));
const HomeworkList = lazy(() => import('./pages/Homework').then((m) => ({ default: m.HomeworkList })));
const HomeworkDetail = lazy(() => import('./pages/Homework').then((m) => ({ default: m.HomeworkDetail })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const AdminAssignments = lazy(() => import('./pages/admin/AdminAssignments'));
const AdminSubmissions = lazy(() => import('./pages/admin/AdminAssignments').then((m) => ({ default: m.AdminSubmissions })));
const AdminQuizzes = lazy(() => import('./pages/admin/AdminQuizzes'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="lessons" element={<Lessons />} />
          <Route path="lessons/:slug" element={<LessonPage />} />
          <Route path="lab" element={<LabPage />} />
          <Route path="simulations" element={<SimulationsList />} />
          <Route path="simulations/:id" element={<SimulationPage />} />
          <Route path="concept-maps" element={<ConceptMapsPage />} />
          <Route path="quizzes" element={<QuizzesList />} />
          <Route path="quizzes/:slug" element={<QuizPage />} />
          <Route path="homework" element={<RequireAuth><HomeworkList /></RequireAuth>} />
          <Route path="homework/:id" element={<RequireAuth><HomeworkDetail /></RequireAuth>} />
          <Route path="dashboard" element={<RequireAuth><StudentDashboard /></RequireAuth>} />
          <Route path="admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="assignments" element={<AdminAssignments />} />
            <Route path="assignments/:id/submissions" element={<AdminSubmissions />} />
            <Route path="quizzes" element={<AdminQuizzes />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

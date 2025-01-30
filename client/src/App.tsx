import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";


// pages
import Home from "./pages/Home";
import Login from "./pages/Login";

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        {/* <Route path="/room/:roomId" element={<Room />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to={'/'} replace />} />
      </Routes>
    </div>
  );
};

export default App;

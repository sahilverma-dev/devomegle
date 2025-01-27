import { Route, Routes } from "react-router";
import AuthLayout from "@/components/layouts/auth-layout";
import ProtectedRoute from "@/components/auth/protected-route";

// routes
import Home from "./routes/home";
import Room from "./routes/room";
import Login from "./routes/login";

const Router = () => {
  return (
    <Routes>
      <Route
        index
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="room/:id"
        element={
          <ProtectedRoute>
            <Room />
          </ProtectedRoute>
        }
      />

      <Route element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
      </Route>
    </Routes>
  );
};
export default Router;

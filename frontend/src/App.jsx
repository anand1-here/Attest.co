import { Route, Routes, Navigate } from "react-router-dom";
import Home from "./Home";
import Landing from "./pages/Landing";
import Login from "./pages/login";
import Register from "./pages/Register";
import LogFile from "./LogFile";
import AddEvidence from "./AddEvidence";
import VerifyEvidence from "./VerifyEvidence";
import ViewEvidence from "./ViewEvidence";
import SideBySide from "./SideBySide";
import ProtectedRoute from "./ProtectedRoute";

const guard = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

const App = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    <Route path="/home" element={guard(<Home />)} />
    <Route path="/log-file" element={guard(<LogFile />)} />
    <Route path="/approach" element={guard(<ViewEvidence />)} />
    <Route path="/view-evidence" element={guard(<ViewEvidence />)} />
    <Route path="/add-evidence" element={guard(<AddEvidence />)} />
    <Route path="/verify-evidence" element={guard(<VerifyEvidence />)} />
    <Route path="/dashboard" element={guard(<SideBySide />)} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;

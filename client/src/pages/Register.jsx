import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, AlertCircle, ShieldAlert, Check, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.png';
import Meteors from '../components/ui/Meteors';

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('Student');
  const [designation, setDesignation] = useState('Student');
  const [profession, setProfession] = useState('Student');
  const [department, setDepartment] = useState('Computer Science');
  const [secretCode, setSecretCode] = useState('');
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'Student') {
      setDesignation('Student');
      setProfession('Student');
    } else if (selectedRole === 'Teacher') {
      setDesignation('Junior Lecturer');
      setProfession('Academic');
    } else if (selectedRole === 'Admin') {
      setDesignation('Admin Coordinator');
      setProfession('Administrator');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', {
        username,
        email,
        password,
        role,
        designation,
        profession,
        department,
        secretCode: role === 'Admin' ? secretCode : '',
      });

      if (data.pending) {
        setSuccessMessage(data.message);
        setUsername('');
        setEmail('');
        setPassword('');
        setSecretCode('');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Try a different username/email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden w-full">
      <Meteors number={30} />
      <div className="max-w-md w-full space-y-8 glass rounded-2xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden z-10">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl"></div>

        <div className="text-center">
          <img src={logo} alt="AcademiaShare Logo" className="h-[120px] w-auto object-contain mx-auto mb-6" />
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="mt-2 text-sm text-gray-400">
            Join AcademiaShare to collaborate on lecture notes
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="space-y-6 py-4 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Registration Successful!</h3>
              <p className="text-sm text-gray-455 leading-relaxed">
                {successMessage}
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none transition shadow-lg shadow-indigo-600/20"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-900/60 border border-gray-880 rounded-xl text-gray-200 placeholder-gray-655 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="johndoe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-600" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-900/60 border border-gray-880 rounded-xl text-gray-200 placeholder-gray-655 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="name@university.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-600" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-gray-900/60 border border-gray-880 rounded-xl text-gray-200 placeholder-gray-655 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Designation</label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="Student">Student</option>
                  <option value="Junior Lecturer">Junior Lecturer</option>
                  <option value="Senior Lecturer">Senior Lecturer</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Professor">Professor</option>
                  <option value="Admin Coordinator">Admin Coordinator</option>
                  <option value="IT Staff">IT Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Profession</label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="Student">Student</option>
                  <option value="Academic">Academic</option>
                  <option value="Staff">Staff</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Business Administration">Business Administration</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Select Platform Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Student', 'Teacher', 'Admin'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium transition ${
                        role === r
                          ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/60'
                          : 'bg-gray-900/40 text-gray-400 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-505 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  All accounts require administrator approval before logging in.
                </p>
              </div>

              {role === 'Admin' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Admin Secret Code</label>
                  <div className="relative">
                    <input
                      type={showSecretCode ? 'text' : 'password'}
                      required
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-gray-200 placeholder-gray-650 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      placeholder="Enter secret code"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretCode(!showSecretCode)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition"
                    >
                      {showSecretCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-505 leading-relaxed mt-1">
                    If you do not have any code, you must ask{' '}
                    <a
                      href="mailto:lognohassan@gmail.com?subject=AcademiaShare%20Admin%20Secret%20Code%20Request"
                      className="text-indigo-400 underline hover:text-indigo-300 transition inline-flex items-center gap-0.5"
                    >
                      lognohassan@gmail.com
                    </a>{' '}
                    for it.
                  </p>
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </span>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-4">
          <p className="text-sm text-gray-500">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

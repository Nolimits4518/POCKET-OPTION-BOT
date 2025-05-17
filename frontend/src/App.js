import { useState, useEffect } from "react";
import { createBrowserRouter, RouterProvider, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

// Constants and configurations
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
import { createContext, useContext } from 'react';

const AuthContext = createContext();

const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Token verification failed:', error);
          setToken(null);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Layout Components
const DashboardLayout = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-indigo-800 text-white transition-all duration-300 ease-in-out`}>
        <div className="p-4 flex justify-between items-center">
          {isSidebarOpen ? (
            <h2 className="text-xl font-bold">Pocket Option Bot</h2>
          ) : (
            <h2 className="text-xl font-bold">POB</h2>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-md hover:bg-indigo-700"
          >
            {isSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <nav className="mt-8">
          <ul className="space-y-2 px-4">
            <li>
              <button 
                onClick={() => navigate('/')}
                className="flex items-center space-x-3 text-gray-300 p-2 rounded-md font-medium hover:bg-indigo-700 hover:text-white w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {isSidebarOpen && <span>Dashboard</span>}
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/accounts')}
                className="flex items-center space-x-3 text-gray-300 p-2 rounded-md font-medium hover:bg-indigo-700 hover:text-white w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {isSidebarOpen && <span>Accounts</span>}
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/strategies')}
                className="flex items-center space-x-3 text-gray-300 p-2 rounded-md font-medium hover:bg-indigo-700 hover:text-white w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {isSidebarOpen && <span>Strategies</span>}
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/history')}
                className="flex items-center space-x-3 text-gray-300 p-2 rounded-md font-medium hover:bg-indigo-700 hover:text-white w-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isSidebarOpen && <span>History</span>}
              </button>
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-0 w-full p-4">
          <button 
            onClick={logout}
            className="flex items-center space-x-3 text-gray-300 p-2 rounded-md font-medium hover:bg-indigo-700 hover:text-white w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Pocket Option Trading Bot
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  RSI Strategy: CALL when RSI is above threshold AND decreasing, PUT when RSI is below threshold AND decreasing
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  {user?.username}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// Pages
const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API}/login`, 
        new URLSearchParams({
          username: formData.username,
          password: formData.password
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      login(response.data.access_token);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Pocket Option Trading Bot
          </p>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">Don't have an account? </span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Register now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API}/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create an account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Pocket Option Trading Bot
          </p>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">Already have an account? </span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [tradingMode, setTradingMode] = useState('demo');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartSymbol, setChartSymbol] = useState('EURUSD');
  const [tradingHistory, setTradingHistory] = useState([]);
  const [botRunning, setBotRunning] = useState(false);
  const [signalSource, setSignalSource] = useState('built-in');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch accounts
        const accountsResponse = await axios.get(`${API}/users/me/accounts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAccounts(accountsResponse.data);
        
        // Fetch strategies
        const strategiesResponse = await axios.get(`${API}/users/me/strategies`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStrategies(strategiesResponse.data);
        
        // Fetch trading history
        const historyResponse = await axios.get(`${API}/trading/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTradingHistory(historyResponse.data);
        
        // Set default selections if available
        if (accountsResponse.data.length > 0) {
          setSelectedAccount(accountsResponse.data[0]);
        }
        
        if (strategiesResponse.data.length > 0) {
          setSelectedStrategy(strategiesResponse.data[0]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [token]);
  
  useEffect(() => {
    // Initialize TradingView widget when component mounts
    if (typeof window.TradingView === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = createTradingViewWidget;
      script.onerror = () => {
        console.error('Failed to load TradingView widget script');
      };
      
      document.head.appendChild(script);
      
      return () => {
        if (script.parentNode) {
          document.head.removeChild(script);
        }
      };
    } else {
      createTradingViewWidget();
    }
  }, [chartSymbol]);
  
  const createTradingViewWidget = () => {
    try {
      if (typeof window.TradingView !== 'undefined' && document.getElementById('tradingview_chart')) {
        new window.TradingView.widget({
          width: '100%',
          height: 500,
          symbol: `FX:${chartSymbol}`,
          interval: '1',
          timezone: 'exchange',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_top_toolbar: false,
          allow_symbol_change: true,
          container_id: 'tradingview_chart'
        });
      }
    } catch (error) {
      console.error('Error creating TradingView widget:', error);
    }
  };
  
  const handleStartBot = async () => {
    if (!selectedAccount || !selectedStrategy) {
      setError('Please select an account and strategy first.');
      return;
    }
    
    setBotRunning(true);
    
    try {
      // Simulate trading operation
      const response = await axios.post(
        `${API}/simulate/trading`,
        {
          account_id: selectedAccount.id,
          strategy_id: selectedStrategy.id,
          asset: chartSymbol
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Trading response:', response.data);
      
      // Update trading history
      const historyResponse = await axios.get(`${API}/trading/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTradingHistory(historyResponse.data);
    } catch (err) {
      console.error('Trading error:', err);
      setError('Failed to execute trade. Please try again.');
    } finally {
      // In a real application, the bot would continue running until stopped
      // For demo purposes, we'll toggle it off after a delay
      setTimeout(() => {
        setBotRunning(false);
      }, 5000);
    }
  };
  
  const handleStopBot = () => {
    setBotRunning(false);
  };
  
  const handleChargingMode = async () => {
    if (!selectedAccount || !selectedStrategy) {
      setError('Please select an account and strategy first.');
      return;
    }
    
    setBotRunning(true);
    
    try {
      // Start with a small amount and increase on wins
      const response = await axios.post(
        `${API}/simulate/trading`,
        {
          account_id: selectedAccount.id,
          strategy_id: selectedStrategy.id,
          asset: chartSymbol,
          charging_mode: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Charging mode activated:', response.data);
      
      // Update trading history
      const historyResponse = await axios.get(`${API}/trading/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTradingHistory(historyResponse.data);
    } catch (err) {
      console.error('Charging mode error:', err);
      setError('Failed to activate charging mode. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError('')}
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                TradingView Chart
              </h3>
              <div className="mt-4 h-[500px]" id="tradingview_chart"></div>
            </div>
          </div>
        </div>
        
        {/* Controls and Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Bot Controls
              </h3>
              
              <div className="mt-4 space-y-4">
                {/* Account Selection */}
                <div>
                  <label htmlFor="account" className="block text-sm font-medium text-gray-700">
                    Select Account
                  </label>
                  <select
                    id="account"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedAccount?.id || ''}
                    onChange={(e) => {
                      const account = accounts.find(a => a.id === e.target.value);
                      setSelectedAccount(account);
                    }}
                  >
                    <option value="">-- Select Account --</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_name} ({account.is_demo ? 'Demo' : 'Real'})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Strategy Selection */}
                <div>
                  <label htmlFor="strategy" className="block text-sm font-medium text-gray-700">
                    Select Strategy
                  </label>
                  <select
                    id="strategy"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedStrategy?.id || ''}
                    onChange={(e) => {
                      const strategy = strategies.find(s => s.id === e.target.value);
                      setSelectedStrategy(strategy);
                    }}
                  >
                    <option value="">-- Select Strategy --</option>
                    {strategies.map(strategy => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Trading Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Trading Mode
                  </label>
                  <div className="mt-2 flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        id="demo-mode"
                        name="trading-mode"
                        type="radio"
                        checked={tradingMode === 'demo'}
                        onChange={() => setTradingMode('demo')}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      />
                      <label htmlFor="demo-mode" className="ml-3 block text-sm font-medium text-gray-700">
                        Demo Account
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="real-mode"
                        name="trading-mode"
                        type="radio"
                        checked={tradingMode === 'real'}
                        onChange={() => setTradingMode('real')}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      />
                      <label htmlFor="real-mode" className="ml-3 block text-sm font-medium text-gray-700">
                        Real Account
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Symbol Selection - Enhanced with OTC support */}
                <div>
                  <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
                    Trading Symbol
                  </label>
                  <select
                    id="symbol"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={chartSymbol}
                    onChange={(e) => setChartSymbol(e.target.value)}
                  >
                    <optgroup label="Regular Markets">
                      <option value="EURUSD">EUR/USD</option>
                      <option value="GBPUSD">GBP/USD</option>
                      <option value="USDJPY">USD/JPY</option>
                      <option value="AUDUSD">AUD/USD</option>
                      <option value="USDCAD">USD/CAD</option>
                      <option value="NZDUSD">NZD/USD</option>
                    </optgroup>
                    <optgroup label="OTC Markets (Weekend Trading)">
                      <option value="EURUSD-OTC">EUR/USD OTC</option>
                      <option value="GBPUSD-OTC">GBP/USD OTC</option>
                      <option value="EURGBP-OTC">EUR/GBP OTC</option>
                      <option value="USDJPY-OTC">USD/JPY OTC</option>
                      <option value="AUDCAD-OTC">AUD/CAD OTC</option>
                      <option value="NZDUSD-OTC">NZD/USD OTC</option>
                    </optgroup>
                  </select>
                </div>
                
                {/* Signal Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Signal Source
                  </label>
                  <div className="mt-2 flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        id="built-in-signals"
                        name="signal-source"
                        type="radio"
                        checked={signalSource === 'built-in'}
                        onChange={() => setSignalSource('built-in')}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      />
                      <label htmlFor="built-in-signals" className="ml-3 block text-sm font-medium text-gray-700">
                        Built-in RSI Strategy
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="tradingview-signals"
                        name="signal-source"
                        type="radio"
                        checked={signalSource === 'tradingview'}
                        onChange={() => setSignalSource('tradingview')}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      />
                      <label htmlFor="tradingview-signals" className="ml-3 block text-sm font-medium text-gray-700">
                        TradingView Webhooks
                      </label>
                    </div>
                  </div>
                </div>
                
                {signalSource === 'tradingview' && (
                  <div className="bg-blue-50 p-4 rounded-md mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1 md:flex md:justify-between">
                        <p className="text-sm text-blue-700">
                          Set up alerts in TradingView to send signals to your webhook URL. Use the following endpoint:
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-sm bg-white p-2 rounded border border-blue-200 text-blue-800 font-mono break-all">
                      {`${window.location.origin}/api/webhook/tradingview/${user?.id || 'your-user-id'}`}
                    </div>
                  </div>
                )}
                
                {/* Power Control Buttons */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bot Controls
                  </label>
                  <div className="flex space-x-3">
                    {!botRunning ? (
                      <>
                        <button
                          type="button"
                          onClick={handleStartBot}
                          className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-1/3"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Power ON
                        </button>
                        <button
                          type="button"
                          onClick={handleChargingMode}
                          className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-1/3"
                          disabled={!selectedAccount || !selectedStrategy}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          Charging UP
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopBot}
                        className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-2/3"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        Power OFF
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Trades
              </h3>
              <div className="mt-4 overflow-auto max-h-[250px]">
                {tradingHistory.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {tradingHistory.slice(0, 5).map((trade) => (
                      <li key={trade.id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-gray-900">
                              {trade.signal_type} - {trade.asset}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(trade.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.result === 'WIN' ? 'bg-green-100 text-green-800' :
                            trade.result === 'LOSS' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {trade.result || 'Pending'}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No trading history yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Accounts = () => {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    username: '',
    password: '',
    is_demo: true
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API}/users/me/accounts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAccounts(response.data);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError('Failed to load accounts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAccounts();
  }, [token]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(
        `${API}/users/me/accounts`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setAccounts([...accounts, response.data]);
      setIsAddingAccount(false);
      setFormData({
        account_name: '',
        username: '',
        password: '',
        is_demo: true
      });
    } catch (err) {
      console.error('Error adding account:', err);
      setError('Failed to add account. Please try again later.');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) {
      return;
    }
    
    try {
      await axios.delete(
        `${API}/users/me/accounts/${accountId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setAccounts(accounts.filter(account => account.id !== accountId));
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pocket Option Accounts
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage your Pocket Option trading accounts
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingAccount(!isAddingAccount)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isAddingAccount ? 'Cancel' : 'Add Account'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 mx-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError('')}
            >
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </button>
          </div>
        )}
        
        {isAddingAccount && (
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="account_name" className="block text-sm font-medium text-gray-700">
                    Account Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="account_name"
                      id="account_name"
                      required
                      value={formData.account_name}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Pocket Option Username
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="username"
                      id="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Pocket Option Password
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      name="password"
                      id="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <div className="flex items-start mt-6">
                    <div className="flex items-center h-5">
                      <input
                        id="is_demo"
                        name="is_demo"
                        type="checkbox"
                        checked={formData.is_demo}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="is_demo" className="font-medium text-gray-700">
                        Demo Account
                      </label>
                      <p className="text-gray-500">Check this if you want to use a demo account.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        )}
        
        {accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map(account => (
                  <tr key={account.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.account_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.is_demo ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {account.is_demo ? 'Demo' : 'Real'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            You haven't added any accounts yet. Click "Add Account" to get started.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const Strategies = () => {
  const { token } = useAuth();
  const [strategies, setStrategies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingStrategy, setIsEditingStrategy] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rsi_upper_threshold: 60,
    rsi_lower_threshold: 40,
    trade_amount: 10,
    expiry_time: 60
  });

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API}/users/me/strategies`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStrategies(response.data);
      } catch (err) {
        console.error('Error fetching strategies:', err);
        setError('Failed to load strategies. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStrategies();
  }, [token]);

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleEditStrategy = (strategy) => {
    setFormData({
      name: strategy.name,
      rsi_upper_threshold: strategy.rsi_upper_threshold,
      rsi_lower_threshold: strategy.rsi_lower_threshold,
      trade_amount: strategy.trade_amount,
      expiry_time: strategy.expiry_time
    });
    setEditingStrategyId(strategy.id);
    setIsEditingStrategy(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingStrategyId) {
        // Update existing strategy
        const response = await axios.put(
          `${API}/users/me/strategies/${editingStrategyId}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        setStrategies(strategies.map(s => s.id === editingStrategyId ? response.data : s));
      } else {
        // Create new strategy
        const response = await axios.post(
          `${API}/users/me/strategies`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        setStrategies([...strategies, response.data]);
      }
      
      setIsEditingStrategy(false);
      setEditingStrategyId(null);
      setFormData({
        name: '',
        rsi_upper_threshold: 60,
        rsi_lower_threshold: 40,
        trade_amount: 10,
        expiry_time: 60
      });
    } catch (err) {
      console.error('Error saving strategy:', err);
      setError('Failed to save strategy. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Trading Strategies
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Configure your RSI trading strategies
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditingStrategy(!isEditingStrategy);
              setEditingStrategyId(null);
              setFormData({
                name: '',
                rsi_upper_threshold: 60,
                rsi_lower_threshold: 40,
                trade_amount: 10,
                expiry_time: 60
              });
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isEditingStrategy ? 'Cancel' : 'Add Strategy'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 mx-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError('')}
            >
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </button>
          </div>
        )}
        
        {isEditingStrategy && (
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Strategy Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="trade_amount" className="block text-sm font-medium text-gray-700">
                    Trade Amount
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="trade_amount"
                      id="trade_amount"
                      min="1"
                      step="0.01"
                      required
                      value={formData.trade_amount}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="rsi_upper_threshold" className="block text-sm font-medium text-gray-700">
                    RSI Upper Threshold
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="rsi_upper_threshold"
                      id="rsi_upper_threshold"
                      min="1"
                      max="100"
                      required
                      value={formData.rsi_upper_threshold}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    CALL is activated when RSI is above this value AND decreasing (default: 60)
                  </p>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="rsi_lower_threshold" className="block text-sm font-medium text-gray-700">
                    RSI Lower Threshold
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="rsi_lower_threshold"
                      id="rsi_lower_threshold"
                      min="0"
                      max="99"
                      required
                      value={formData.rsi_lower_threshold}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    PUT is activated when RSI is below this value AND decreasing (default: 40)
                  </p>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="expiry_time" className="block text-sm font-medium text-gray-700">
                    Expiry Time (seconds)
                  </label>
                  <div className="mt-1">
                    <select
                      id="expiry_time"
                      name="expiry_time"
                      required
                      value={formData.expiry_time}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="5">5 seconds</option>
                      <option value="10">10 seconds</option>
                      <option value="15">15 seconds</option>
                      <option value="30">30 seconds</option>
                      <option value="60">1 minute</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {editingStrategyId ? 'Update Strategy' : 'Add Strategy'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {strategies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Strategy Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RSI Upper/Lower
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trade Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Time
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {strategies.map(strategy => (
                  <tr key={strategy.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {strategy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {strategy.rsi_upper_threshold} / {strategy.rsi_lower_threshold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${strategy.trade_amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {strategy.expiry_time} seconds
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditStrategy(strategy)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            You haven't created any strategies yet. Click "Add Strategy" to get started.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const TradingHistory = () => {
  const { token } = useAuth();
  const [tradingHistory, setTradingHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API}/trading/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTradingHistory(response.data);
      } catch (err) {
        console.error('Error fetching trading history:', err);
        setError('Failed to load trading history. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, [token]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Trading History
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            View your past trading activity
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 mx-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError('')}
            >
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </button>
          </div>
        )}
        
        {tradingHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signal Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tradingHistory.map(trade => (
                  <tr key={trade.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(trade.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.asset}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trade.signal_type === 'CALL' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.signal_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${trade.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.expiry_time} sec
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trade.result === 'WIN' ? 'bg-green-100 text-green-800' :
                        trade.result === 'LOSS' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {trade.result || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            No trading history available yet. Start trading to see your history.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

function App() {
  const router = createBrowserRouter([
    {
      path: "/login",
      element: <Login />
    },
    {
      path: "/register",
      element: <Register />
    },
    {
      path: "/",
      element: <ProtectedRoute><Dashboard /></ProtectedRoute>
    },
    {
      path: "/accounts",
      element: <ProtectedRoute><Accounts /></ProtectedRoute>
    },
    {
      path: "/strategies",
      element: <ProtectedRoute><Strategies /></ProtectedRoute>
    },
    {
      path: "/history",
      element: <ProtectedRoute><TradingHistory /></ProtectedRoute>
    }
  ]);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
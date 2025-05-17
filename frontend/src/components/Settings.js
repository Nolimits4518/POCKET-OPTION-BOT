import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import { useTheme } from '../ThemeContext';

const Settings = () => {
  const { theme } = useTheme();
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Application Settings
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Customize your trading bot experience
          </p>
        </div>
        
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Theme Selection
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <ThemeSwitcher />
                <p className="mt-3 text-sm text-gray-500">
                  Choose a theme that matches your trading style. Each theme offers a unique visual experience.
                </p>
              </dd>
            </div>
            
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Current Theme
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="px-2 py-1 rounded bg-gray-100">
                  {theme === 'default' && 'Default'}
                  {theme === 'green-goblin' && 'Green Goblin'}
                  {theme === 'futuristic' && 'Futuristic AI'}
                  {theme === 'cyberpunk' && 'Cyberpunk'}
                  {theme === 'jarvis' && 'Jarvis'}
                </span>
              </dd>
            </div>
            
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Bot Behavior
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="auto_trade"
                        name="auto_trade"
                        type="checkbox"
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        defaultChecked={true}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="auto_trade" className="font-medium text-gray-700">Auto-execute trades</label>
                      <p className="text-gray-500">The bot will automatically execute trades on Pocket Option when signals are generated</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="notifications"
                        name="notifications"
                        type="checkbox"
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        defaultChecked={true}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notifications" className="font-medium text-gray-700">Trade notifications</label>
                      <p className="text-gray-500">Receive notifications when trades are executed</p>
                    </div>
                  </div>
                </div>
              </dd>
            </div>
            
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                External Access
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="border border-gray-200 rounded-md bg-gray-50 p-4">
                  <h4 className="text-md font-medium text-gray-700 mb-2">Access Your Trading Bot Remotely</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Your trading bot is running on port 3000. To access it from outside the preview, use:
                  </p>
                  <code className="text-sm bg-gray-200 p-2 rounded block mb-2">
                    http://YOUR_SERVER_IP:3000
                  </code>
                  <p className="text-sm text-gray-600">
                    Replace YOUR_SERVER_IP with your server's IP address. If you're running this locally,
                    you can use <code className="bg-gray-200 p-1 rounded">localhost</code> or <code className="bg-gray-200 p-1 rounded">127.0.0.1</code>.
                  </p>
                </div>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Settings;

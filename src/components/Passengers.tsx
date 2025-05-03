import React, { useState } from 'react';

interface Passenger {
  id: number;
  name: string;
  email: string;
  phone: string;
  frequentTraveler: boolean;
  journeys: number;
  lastTravel: string;
  status: string;
}

const Passengers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Mock passenger data
  const passengers: Passenger[] = [
    {
      id: 1001,
      name: 'Amal Perera',
      email: 'amal.perera@example.com',
      phone: '+94 71 234 5678',
      frequentTraveler: true,
      journeys: 42,
      lastTravel: '2025-04-15',
      status: 'active'
    },
    {
      id: 1002,
      name: 'Kamala Silva',
      email: 'kamala.silva@example.com',
      phone: '+94 77 345 6789',
      frequentTraveler: true,
      journeys: 36,
      lastTravel: '2025-04-20',
      status: 'active'
    },
    {
      id: 1003,
      name: 'Nimal Fernando',
      email: 'nimal.fernando@example.com',
      phone: '+94 76 456 7890',
      frequentTraveler: false,
      journeys: 8,
      lastTravel: '2025-03-05',
      status: 'inactive'
    },
    {
      id: 1004,
      name: 'Sunil Gunawardena',
      email: 'sunil.g@example.com',
      phone: '+94 70 567 8901',
      frequentTraveler: true,
      journeys: 27,
      lastTravel: '2025-04-18',
      status: 'active'
    },
    {
      id: 1005,
      name: 'Priya Mendis',
      email: 'priya.mendis@example.com',
      phone: '+94 75 678 9012',
      frequentTraveler: false,
      journeys: 12,
      lastTravel: '2025-02-22',
      status: 'active'
    },
    {
      id: 1006,
      name: 'Lakshman Jayawardena',
      email: 'lakshman.j@example.com',
      phone: '+94 78 789 0123',
      frequentTraveler: false,
      journeys: 5,
      lastTravel: '2024-12-10',
      status: 'inactive'
    },
    {
      id: 1007,
      name: 'Dilini Rathnayake',
      email: 'dilini.r@example.com',
      phone: '+94 72 890 1234',
      frequentTraveler: true,
      journeys: 31,
      lastTravel: '2025-04-10',
      status: 'active'
    }
  ];
  
  // Filter passengers based on search term and status
  const filteredPassengers = passengers.filter(passenger => {
    const matchesSearch = 
      passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.phone.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || passenger.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });
  
  return (
    <div className="p-4">
      <div className="mb-4 px-2">
        <h1 className="text-xl font-medium text-dashboard-header">Passenger Management</h1>
        <p className="text-dashboard-subtext mt-1">View and manage passenger information and travel history.</p>
      </div>
      
      {/* Filters and Search */}
      <div className="bg-dashboard-panel rounded shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex flex-col sm:flex-row gap-4 mb-4 md:mb-0 w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search passengers..."
                className="bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-4 py-2 pl-10 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-dashboard-subtext" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div>
              <select
                className="bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-3 py-2 w-full sm:w-auto"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Passengers</option>
                <option value="active">Active Passengers</option>
                <option value="inactive">Inactive Passengers</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button className="bg-dashboard-purple hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Passenger
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Passenger Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dashboard-panel rounded shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-dashboard-subtext">Total Passengers</p>
              <h3 className="text-2xl font-medium text-dashboard-header mt-1">{passengers.length}</h3>
            </div>
            <div className="bg-purple-100 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-dashboard-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-dashboard-subtext">
            <span className="text-green-400">↑ 12%</span> from last month
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-dashboard-subtext">Active Passengers</p>
              <h3 className="text-2xl font-medium text-dashboard-header mt-1">
                {passengers.filter(p => p.status === 'active').length}
              </h3>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-dashboard-subtext">
            <span className="text-green-400">↑ 8%</span> from last month
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-dashboard-subtext">Frequent Travelers</p>
              <h3 className="text-2xl font-medium text-dashboard-header mt-1">
                {passengers.filter(p => p.frequentTraveler).length}
              </h3>
            </div>
            <div className="bg-blue-100 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-dashboard-subtext">
            <span className="text-green-400">↑ 15%</span> from last month
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-dashboard-subtext">Avg. Journeys</p>
              <h3 className="text-2xl font-medium text-dashboard-header mt-1">
                {Math.round(passengers.reduce((sum, p) => sum + p.journeys, 0) / passengers.length)}
              </h3>
            </div>
            <div className="bg-yellow-100 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-sm text-dashboard-subtext">
            <span className="text-green-400">↑ 5%</span> from last month
          </div>
        </div>
      </div>
      
      {/* Passenger Table */}
      <div className="bg-dashboard-panel rounded shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-dashboard-text">
            <thead className="bg-dashboard-dark border-b border-gray-700">
              <tr>
                <th className="text-left py-3 px-4">ID</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Contact</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Journeys</th>
                <th className="text-left py-3 px-4">Last Travel</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPassengers.length > 0 ? (
                filteredPassengers.map((passenger) => (
                  <tr key={passenger.id} className="border-b border-gray-700 hover:bg-dashboard-dark">
                    <td className="py-3 px-4">{passenger.id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-dashboard-purple flex items-center justify-center text-white font-medium mr-3">
                          {passenger.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{passenger.name}</div>
                          <div className="text-dashboard-subtext text-sm">{passenger.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{passenger.phone}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        passenger.status === 'active' 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {passenger.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="mr-2">{passenger.journeys}</span>
                        {passenger.frequentTraveler && (
                          <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded-full text-xs">Frequent</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">{passenger.lastTravel}</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button className="text-blue-400 hover:text-blue-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="text-yellow-400 hover:text-yellow-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="text-red-400 hover:text-red-300">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 px-4 text-center text-dashboard-subtext">
                    No passengers found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <div className="text-dashboard-subtext text-sm">
            Showing {filteredPassengers.length} of {passengers.length} passengers
          </div>
          <div className="flex space-x-1">
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">
              Previous
            </button>
            <button className="bg-dashboard-purple hover:bg-purple-700 text-white px-3 py-1 rounded">
              1
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">
              2
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">
              3
            </button>
            <button className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Passengers;

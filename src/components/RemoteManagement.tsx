import React, { useState, useEffect } from 'react';
import { transformData, TrainEntry } from '../services/dataService';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface RemoteManagementStats {
  totalTrains: number;
  activeTrains: number;
  delayedTrains: number;
  averageDelay: number;
  trainStatusByRoute: Record<string, { active: number, delayed: number, onTime: number }>;
  trainStatusByClass: Record<string, { active: number, delayed: number, onTime: number }>;
  trainStatusByMonth: Record<string, { active: number, delayed: number, onTime: number }>;
}

interface StatusDataItem {
  name: string;
  value: number;
}

interface RouteStatusItem {
  route: string;
  active: number;
  delayed: number;
  onTime: number;
}

interface TrainStatusItem {
  trainId: string;
  trainName: string;
  status: string;
  location: string;
  nextStation: string;
  estimatedArrival: string;
  delayMinutes: number;
  occupancyRate: number;
}

const RemoteManagement: React.FC = () => {
  const [data, setData] = useState<TrainEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [remoteStats, setRemoteStats] = useState<RemoteManagementStats>({
    totalTrains: 0,
    activeTrains: 0,
    delayedTrains: 0,
    averageDelay: 0,
    trainStatusByRoute: {},
    trainStatusByClass: {},
    trainStatusByMonth: {}
  });
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedView, setSelectedView] = useState<string>('overview');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
  const [activeTrains, setActiveTrains] = useState<TrainStatusItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Colors for the charts
  const COLORS = ['#7e57c2', '#4e7fff', '#b39ddb', '#64b5f6', '#9575cd', '#5c6bc0', '#7986cb', '#4fc3f7'];
  const STATUS_COLORS = {
    'On Time': '#4CAF50',
    'Delayed': '#FFC107',
    'Stopped': '#F44336',
    'Maintenance': '#9E9E9E'
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Get data from the data service
        const transformedData = await transformData();
        setData(transformedData);
        
        // Get available years for the filter
        const years = Array.from(new Set(transformedData.map(item => item.year))).sort();
        setAvailableYears(years);
        
        // Get available routes for the filter
        const routes = Array.from(new Set(transformedData.map(item => `${item.from_city}-${item.to_city}`))).sort();
        setAvailableRoutes(routes);
        
        // Calculate remote management statistics
        calculateRemoteStats(transformedData);
        
        // Generate active trains data
        generateActiveTrainsData(transformedData);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  useEffect(() => {
    // Filter data based on selected year and route, then recalculate stats
    let filteredData = data;
    
    if (selectedYear !== 'all') {
      filteredData = filteredData.filter(entry => entry.year === parseInt(selectedYear));
    }
    
    if (selectedRoute !== 'all') {
      const [fromCity, toCity] = selectedRoute.split('-');
      filteredData = filteredData.filter(entry => 
        entry.from_city === fromCity && entry.to_city === toCity
      );
    }
    
    calculateRemoteStats(filteredData);
    generateActiveTrainsData(filteredData);
  }, [selectedYear, selectedRoute, data]);
  
  const calculateRemoteStats = (data: TrainEntry[]) => {
    const stats: RemoteManagementStats = {
      totalTrains: 0,
      activeTrains: 0,
      delayedTrains: 0,
      averageDelay: 0,
      trainStatusByRoute: {},
      trainStatusByClass: {},
      trainStatusByMonth: {}
    };
    
    // Get unique train IDs
    const uniqueTrainIds = new Set<string>();
    data.forEach(entry => uniqueTrainIds.add(entry.train_id));
    stats.totalTrains = uniqueTrainIds.size;
    
    // Count active and delayed trains
    const activeTrainIds = new Set<string>();
    let totalDelayMinutes = 0;
    let delayedTrainsCount = 0;
    
    data.forEach(entry => {
      activeTrainIds.add(entry.train_id);
      
      if (entry.delay_minutes > 0) {
        delayedTrainsCount++;
        totalDelayMinutes += entry.delay_minutes;
      }
      
      // Route status
      const route = `${entry.from_city}-${entry.to_city}`;
      if (!stats.trainStatusByRoute[route]) {
        stats.trainStatusByRoute[route] = { active: 0, delayed: 0, onTime: 0 };
      }
      
      stats.trainStatusByRoute[route].active++;
      if (entry.delay_minutes > 0) {
        stats.trainStatusByRoute[route].delayed++;
      } else {
        stats.trainStatusByRoute[route].onTime++;
      }
      
      // Class status
      if (!stats.trainStatusByClass[entry.class]) {
        stats.trainStatusByClass[entry.class] = { active: 0, delayed: 0, onTime: 0 };
      }
      
      stats.trainStatusByClass[entry.class].active++;
      if (entry.delay_minutes > 0) {
        stats.trainStatusByClass[entry.class].delayed++;
      } else {
        stats.trainStatusByClass[entry.class].onTime++;
      }
      
      // Monthly status
      const monthKey = `${entry.year}-${String(entry.month).padStart(2, '0')}`;
      if (!stats.trainStatusByMonth[monthKey]) {
        stats.trainStatusByMonth[monthKey] = { active: 0, delayed: 0, onTime: 0 };
      }
      
      stats.trainStatusByMonth[monthKey].active++;
      if (entry.delay_minutes > 0) {
        stats.trainStatusByMonth[monthKey].delayed++;
      } else {
        stats.trainStatusByMonth[monthKey].onTime++;
      }
    });
    
    stats.activeTrains = activeTrainIds.size;
    stats.delayedTrains = delayedTrainsCount;
    stats.averageDelay = delayedTrainsCount > 0 ? totalDelayMinutes / delayedTrainsCount : 0;
    
    setRemoteStats(stats);
  };
  
  const generateActiveTrainsData = (data: TrainEntry[]) => {
    // Group by train_id to get the latest entry for each train
    const trainMap = new Map<string, TrainEntry>();
    data.forEach(entry => {
      const existingEntry = trainMap.get(entry.train_id);
      if (!existingEntry || new Date(entry.departure_date) > new Date(existingEntry.departure_date)) {
        trainMap.set(entry.train_id, entry);
      }
    });
    
    // Convert to TrainStatusItem array
    const activeTrainsData: TrainStatusItem[] = Array.from(trainMap.values()).map(entry => {
      // Determine status based on delay
      let status = 'On Time';
      if (entry.delay_minutes > 15) {
        status = 'Delayed';
      } else if (entry.delay_minutes > 0) {
        status = 'Delayed';
      }
      
      // Randomly assign some trains to maintenance or stopped status
      const random = Math.random();
      if (random < 0.05) {
        status = 'Maintenance';
      } else if (random < 0.1) {
        status = 'Stopped';
      }
      
      // Calculate estimated arrival
      const arrivalTime = new Date(`2000-01-01T${entry.actual_time}`);
      arrivalTime.setMinutes(arrivalTime.getMinutes() + Math.floor(Math.random() * 60));
      const estimatedArrival = arrivalTime.toTimeString().substring(0, 5);
      
      return {
        trainId: entry.train_id,
        trainName: entry.train_name,
        status,
        location: entry.from_city,
        nextStation: entry.to_city,
        estimatedArrival,
        delayMinutes: entry.delay_minutes,
        occupancyRate: entry.occupancyRate
      };
    });
    
    setActiveTrains(activeTrainsData);
  };
  
  // Prepare data for charts
  const prepareStatusData = (): StatusDataItem[] => {
    return [
      { name: 'On Time', value: remoteStats.activeTrains - remoteStats.delayedTrains },
      { name: 'Delayed', value: remoteStats.delayedTrains }
    ];
  };
  
  const prepareRouteStatusData = (): RouteStatusItem[] => {
    return Object.entries(remoteStats.trainStatusByRoute)
      .map(([route, data]) => ({
        route,
        active: data.active,
        delayed: data.delayed,
        onTime: data.onTime
      }))
      .sort((a, b) => b.active - a.active)
      .slice(0, 10); // Top 10 routes
  };
  
  const prepareClassStatusData = (): StatusDataItem[] => {
    return Object.entries(remoteStats.trainStatusByClass).map(([className, data]) => ({
      name: className,
      value: data.active
    }));
  };
  
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours > 0 ? hours + 'h ' : ''}${mins}m`;
  };
  
  // Filter active trains based on search query
  const filteredActiveTrains = activeTrains.filter(train => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      train.trainId.toLowerCase().includes(query) ||
      train.trainName.toLowerCase().includes(query) ||
      train.location.toLowerCase().includes(query) ||
      train.nextStation.toLowerCase().includes(query) ||
      train.status.toLowerCase().includes(query)
    );
  });
  
  if (isLoading) {
    return <div className="text-center p-10 text-dashboard-text">Loading remote management data...</div>;
  }
  
  return (
    <div className="p-4">
      <div className="mb-4 px-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-medium text-dashboard-header">Remote Train Management</h1>
            {selectedRoute !== 'all' && (
              <div className="text-dashboard-subtext text-sm mt-1">
                Filtered by route: <span className="text-dashboard-purple font-medium">{selectedRoute}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <label htmlFor="viewSelect" className="text-dashboard-subtext mr-2 text-sm">View:</label>
              <select 
                id="viewSelect"
                className="bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-2 py-1 text-sm"
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
              >
                <option value="overview">Overview</option>
                <option value="liveStatus">Live Status</option>
                <option value="byRoute">By Route</option>
                <option value="byClass">By Class</option>
              </select>
            </div>
            <div>
              <label htmlFor="yearSelect" className="text-dashboard-subtext mr-2 text-sm">Year:</label>
              <select 
                id="yearSelect"
                className="bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-2 py-1 text-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Route Selection Buttons */}
        <div className="bg-dashboard-panel rounded shadow p-3 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-dashboard-header text-sm">Select Route:</h2>
            <button 
              onClick={() => setSelectedRoute('all')}
              className={`text-xs px-3 py-1 rounded ${selectedRoute === 'all' ? 'bg-dashboard-purple text-white' : 'bg-dashboard-dark text-dashboard-subtext hover:bg-gray-700'}`}
            >
              All Routes
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {availableRoutes.map(route => (
              <button 
                key={route}
                onClick={() => setSelectedRoute(route)}
                className={`text-xs px-3 py-2 rounded ${selectedRoute === route ? 'bg-dashboard-purple text-white' : 'bg-dashboard-dark text-dashboard-subtext hover:bg-gray-700'}`}
              >
                {route}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dashboard-panel rounded shadow p-4">
          <h2 className="text-dashboard-subtext text-sm mb-2">Total Trains</h2>
          <div className="text-dashboard-header text-2xl font-bold">
            {remoteStats.totalTrains}
          </div>
          <div className="text-dashboard-subtext text-xs mt-2">
            In the system
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <h2 className="text-dashboard-subtext text-sm mb-2">Active Trains</h2>
          <div className="text-dashboard-header text-2xl font-bold">
            {remoteStats.activeTrains}
          </div>
          <div className="text-dashboard-subtext text-xs mt-2">
            Currently in operation
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <h2 className="text-dashboard-subtext text-sm mb-2">Delayed Trains</h2>
          <div className="text-dashboard-header text-2xl font-bold">
            {remoteStats.delayedTrains}
          </div>
          <div className="text-dashboard-subtext text-xs mt-2">
            {((remoteStats.delayedTrains / remoteStats.activeTrains) * 100).toFixed(1)}% of active trains
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <h2 className="text-dashboard-subtext text-sm mb-2">Average Delay</h2>
          <div className="text-dashboard-header text-2xl font-bold">
            {remoteStats.averageDelay.toFixed(1)} min
          </div>
          <div className="text-dashboard-subtext text-xs mt-2">
            For delayed trains
          </div>
        </div>
      </div>
      
      {/* Main Content Based on Selected View */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Train Status Distribution */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Train Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prepareStatusData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell key="cell-0" fill="#4CAF50" /> {/* On Time */}
                  <Cell key="cell-1" fill="#FFC107" /> {/* Delayed */}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Status by Class */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Train Distribution by Class</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prepareClassStatusData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {prepareClassStatusData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Status by Route */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Train Status by Route</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareRouteStatusData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="route" type="category" stroke="#666" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                />
                <Legend />
                <Bar dataKey="onTime" stackId="a" fill="#4CAF50" name="On Time" />
                <Bar dataKey="delayed" stackId="a" fill="#FFC107" name="Delayed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Remote Control Panel */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Remote Control Panel</h2>
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-dashboard-dark hover:bg-gray-700 text-dashboard-text p-3 rounded flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <span>Emergency Alerts</span>
              </button>
              <button className="bg-dashboard-dark hover:bg-gray-700 text-dashboard-text p-3 rounded flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span>System Settings</span>
              </button>
              <button className="bg-dashboard-dark hover:bg-gray-700 text-dashboard-text p-3 rounded flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Train Information</span>
              </button>
              <button className="bg-dashboard-dark hover:bg-gray-700 text-dashboard-text p-3 rounded flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Download Reports</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedView === 'liveStatus' && (
        <div className="grid grid-cols-1 gap-4">
          {/* Search Bar */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <div className="flex items-center">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search by train ID, name, location, or status..."
                  className="w-full bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-4 py-2 pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <button className="ml-2 bg-dashboard-purple text-white px-4 py-2 rounded">
                Filter
              </button>
            </div>
          </div>
          
          {/* Live Train Status Table */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Live Train Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-dashboard-text">
                <thead className="bg-dashboard-dark border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4">Train ID</th>
                    <th className="text-left py-3 px-4">Train Name</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Current Location</th>
                    <th className="text-left py-3 px-4">Next Station</th>
                    <th className="text-left py-3 px-4">Est. Arrival</th>
                    <th className="text-left py-3 px-4">Delay</th>
                    <th className="text-left py-3 px-4">Occupancy</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveTrains.map((train) => (
                    <tr key={train.trainId} className="border-b border-gray-700 hover:bg-dashboard-dark">
                      <td className="py-3 px-4">{train.trainId}</td>
                      <td className="py-3 px-4">{train.trainName}</td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-2 py-1 rounded text-xs" 
                          style={{ 
                            backgroundColor: STATUS_COLORS[train.status as keyof typeof STATUS_COLORS] + '33',
                            color: STATUS_COLORS[train.status as keyof typeof STATUS_COLORS]
                          }}
                        >
                          {train.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{train.location}</td>
                      <td className="py-3 px-4">{train.nextStation}</td>
                      <td className="py-3 px-4">{train.estimatedArrival}</td>
                      <td className="py-3 px-4">
                        {train.delayMinutes > 0 ? `${train.delayMinutes} min` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                          <div 
                            className="h-2.5 rounded-full" 
                            style={{ 
                              width: `${train.occupancyRate}%`,
                              backgroundColor: train.occupancyRate > 90 ? '#F44336' : train.occupancyRate > 70 ? '#FFC107' : '#4CAF50'
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-dashboard-subtext">{train.occupancyRate.toFixed(0)}%</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button className="p-1 rounded hover:bg-gray-700" title="View Details">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button className="p-1 rounded hover:bg-gray-700" title="Send Message">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button className="p-1 rounded hover:bg-gray-700" title="Remote Control">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {selectedView === 'byRoute' && (
        <div className="grid grid-cols-1 gap-4">
          {/* Status by Route */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Train Status by Route</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={prepareRouteStatusData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="route" type="category" stroke="#666" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                />
                <Legend />
                <Bar dataKey="onTime" stackId="a" fill="#4CAF50" name="On Time" />
                <Bar dataKey="delayed" stackId="a" fill="#FFC107" name="Delayed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Route Details Table */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Route Performance Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-dashboard-text">
                <thead className="bg-dashboard-dark border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4">Route</th>
                    <th className="text-right py-3 px-4">Active Trains</th>
                    <th className="text-right py-3 px-4">On Time</th>
                    <th className="text-right py-3 px-4">Delayed</th>
                    <th className="text-right py-3 px-4">On-Time %</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(remoteStats.trainStatusByRoute)
                    .sort((a, b) => b[1].active - a[1].active)
                    .map(([route, data]) => (
                      <tr key={route} className="border-b border-gray-700 hover:bg-dashboard-dark">
                        <td className="py-3 px-4">{route}</td>
                        <td className="py-3 px-4 text-right">{data.active}</td>
                        <td className="py-3 px-4 text-right">{data.onTime}</td>
                        <td className="py-3 px-4 text-right">{data.delayed}</td>
                        <td className="py-3 px-4 text-right">
                          <span 
                            className={`px-2 py-1 rounded text-xs ${
                              (data.onTime / data.active) * 100 > 80 
                                ? 'bg-green-900 text-green-300' 
                                : (data.onTime / data.active) * 100 > 60 
                                  ? 'bg-yellow-900 text-yellow-300' 
                                  : 'bg-red-900 text-red-300'
                            }`}
                          >
                            {((data.onTime / data.active) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {selectedView === 'byClass' && (
        <div className="grid grid-cols-1 gap-4">
          {/* Status by Class */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Train Status by Class</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prepareClassStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {prepareClassStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                      labelStyle={{ color: '#e0e0e0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="bg-dashboard-dark rounded p-4">
                  <h3 className="text-dashboard-subtext text-sm mb-4">Class Performance</h3>
                  <table className="w-full text-dashboard-text">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th className="text-left py-2">Class</th>
                        <th className="text-right py-2">Active Trains</th>
                        <th className="text-right py-2">On Time</th>
                        <th className="text-right py-2">Delayed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(remoteStats.trainStatusByClass).map(([className, data]) => (
                        <tr key={className} className="border-b border-gray-700">
                          <td className="py-2">{className}</td>
                          <td className="py-2 text-right">{data.active}</td>
                          <td className="py-2 text-right">{data.onTime}</td>
                          <td className="py-2 text-right">{data.delayed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          {/* Class Delay Analysis */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Class Delay Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-dashboard-text">
                <thead className="bg-dashboard-dark border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4">Class</th>
                    <th className="text-right py-3 px-4">Total Trains</th>
                    <th className="text-right py-3 px-4">Delayed Trains</th>
                    <th className="text-right py-3 px-4">Delay %</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(remoteStats.trainStatusByClass)
                    .sort((a, b) => (b[1].delayed / b[1].active) - (a[1].delayed / a[1].active))
                    .map(([className, data]) => (
                      <tr key={className} className="border-b border-gray-700 hover:bg-dashboard-dark">
                        <td className="py-3 px-4">{className}</td>
                        <td className="py-3 px-4 text-right">{data.active}</td>
                        <td className="py-3 px-4 text-right">{data.delayed}</td>
                        <td className="py-3 px-4 text-right">
                          <span 
                            className={`px-2 py-1 rounded text-xs ${
                              (data.delayed / data.active) * 100 < 20 
                                ? 'bg-green-900 text-green-300' 
                                : (data.delayed / data.active) * 100 < 40 
                                  ? 'bg-yellow-900 text-yellow-300' 
                                  : 'bg-red-900 text-red-300'
                            }`}
                          >
                            {((data.delayed / data.active) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="bg-dashboard-purple text-white px-3 py-1 rounded text-xs">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteManagement;

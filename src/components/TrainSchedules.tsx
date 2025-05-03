import React, { useState, useEffect } from 'react';
import { transformData, TrainEntry } from '../services/dataService';

interface FilterOptions {
  trainId: string;
  fromCity: string;
  toCity: string;
  class: string;
  date: string;
}

const TrainSchedules: React.FC = () => {
  const [trainData, setTrainData] = useState<TrainEntry[]>([]);
  const [filteredData, setFilteredData] = useState<TrainEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterOptions>({
    trainId: '',
    fromCity: '',
    toCity: '',
    class: '',
    date: ''
  });
  
  // Unique values for filter dropdowns
  const [uniqueTrains, setUniqueTrains] = useState<string[]>([]);
  const [uniqueCities, setUniqueCities] = useState<string[]>([]);
  const [uniqueClasses, setUniqueClasses] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Get data from the data service
        const data = await transformData();
        setTrainData(data);
        setFilteredData(data);
        
        // Extract unique values for filters
        const trains = Array.from(new Set(data.map(item => item.train_id)));
        const cities = Array.from(new Set([...data.map(item => item.from_city), ...data.map(item => item.to_city)]));
        const classes = Array.from(new Set(data.map(item => item.class)));
        
        setUniqueTrains(trains);
        setUniqueCities(cities);
        setUniqueClasses(classes);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  useEffect(() => {
    // Apply filters whenever filters state changes
    applyFilters();
  }, [filters, trainData]);
  
  const applyFilters = () => {
    let result = [...trainData];
    
    if (filters.trainId) {
      result = result.filter(train => train.train_id === filters.trainId);
    }
    
    if (filters.fromCity) {
      result = result.filter(train => train.from_city === filters.fromCity);
    }
    
    if (filters.toCity) {
      result = result.filter(train => train.to_city === filters.toCity);
    }
    
    if (filters.class) {
      result = result.filter(train => train.class === filters.class);
    }
    
    if (filters.date) {
      result = result.filter(train => train.departure_date === filters.date);
    }
    
    setFilteredData(result);
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const resetFilters = () => {
    setFilters({
      trainId: '',
      fromCity: '',
      toCity: '',
      class: '',
      date: ''
    });
  };
  
  const getStatusClass = (delayMinutes: number) => {
    if (delayMinutes === 0) return 'text-green-400';
    if (delayMinutes <= 10) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const getStatusText = (delayMinutes: number) => {
    if (delayMinutes === 0) return 'On Time';
    return `Delayed ${delayMinutes}m`;
  };

  if (isLoading) {
    return <div className="text-center p-10 text-dashboard-text">Loading train schedules...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-dashboard-header mb-4">Train Schedules</h1>
        
        {/* Filters */}
        <div className="bg-dashboard-panel rounded shadow p-4 mb-6">
          <h2 className="text-dashboard-header text-lg mb-4">Filter Schedules</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="trainId" className="block text-dashboard-subtext mb-1 text-sm">Train</label>
              <select
                id="trainId"
                name="trainId"
                className="w-full bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-3 py-2"
                value={filters.trainId}
                onChange={handleFilterChange}
              >
                <option value="">All Trains</option>
                {uniqueTrains.map(train => (
                  <option key={train} value={train}>{train}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="fromCity" className="block text-dashboard-subtext mb-1 text-sm">From</label>
              <select
                id="fromCity"
                name="fromCity"
                className="w-full bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-3 py-2"
                value={filters.fromCity}
                onChange={handleFilterChange}
              >
                <option value="">All Departure Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="toCity" className="block text-dashboard-subtext mb-1 text-sm">To</label>
              <select
                id="toCity"
                name="toCity"
                className="w-full bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-3 py-2"
                value={filters.toCity}
                onChange={handleFilterChange}
              >
                <option value="">All Arrival Cities</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="class" className="block text-dashboard-subtext mb-1 text-sm">Class</label>
              <select
                id="class"
                name="class"
                className="w-full bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-3 py-2"
                value={filters.class}
                onChange={handleFilterChange}
              >
                <option value="">All Classes</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="date" className="block text-dashboard-subtext mb-1 text-sm">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                className="w-full bg-dashboard-dark text-dashboard-text border border-gray-700 rounded px-3 py-2"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-dashboard-subtext text-sm">
              {Object.values(filters).some(value => value !== '') ? 
                'Filters applied. Showing filtered results.' : 
                'No filters applied. Showing all train schedules.'}
            </div>
            <button
              onClick={resetFilters}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Reset Filters
            </button>
          </div>
        </div>
        
        {/* Train Schedule Table */}
        <div className="bg-dashboard-panel rounded shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-dashboard-text">
              <thead className="bg-dashboard-dark border-b border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4">Train ID</th>
                  <th className="text-left py-3 px-4">Train Name</th>
                  <th className="text-left py-3 px-4">From</th>
                  <th className="text-left py-3 px-4">To</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Class</th>
                  <th className="text-left py-3 px-4">Scheduled Time</th>
                  <th className="text-left py-3 px-4">Actual Time</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((train) => (
                    <tr key={train.id} className="border-b border-gray-700 hover:bg-dashboard-dark">
                      <td className="py-3 px-4">{train.train_id}</td>
                      <td className="py-3 px-4">{train.train_name}</td>
                      <td className="py-3 px-4">{train.from_city}</td>
                      <td className="py-3 px-4">{train.to_city}</td>
                      <td className="py-3 px-4">{train.departure_date}</td>
                      <td className="py-3 px-4">{train.class}</td>
                      <td className="py-3 px-4">{train.scheduled_time}</td>
                      <td className="py-3 px-4">{train.actual_time}</td>
                      <td className={`py-3 px-4 ${getStatusClass(train.delay_minutes)}`}>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${train.delay_minutes === 0 ? 'bg-green-400' : train.delay_minutes <= 10 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                          {getStatusText(train.delay_minutes)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mr-2">
                            <div 
                              className="bg-purple-500 h-2.5 rounded-full" 
                              style={{ width: `${train.occupancyRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{train.occupancyRate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-4 px-4 text-center text-dashboard-subtext">
                      No train schedules found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-700 flex justify-between items-center">
            <div className="text-dashboard-subtext text-sm">
              Showing {filteredData.length} of {trainData.length} train schedules
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainSchedules;

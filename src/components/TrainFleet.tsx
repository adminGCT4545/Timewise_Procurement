import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { transformData, TrainEntry } from '../services/dataService';

interface TrainFleetData {
  trainId: string;
  trainName: string;
  totalCapacity: number;
  firstClassCapacity: number;
  secondClassCapacity: number;
  thirdClassCapacity: number;
  avgOccupancyRate: number;
  avgDelay: number;
  totalRevenue: number;
  totalTrips: number;
  routes: string[];
}

interface ClassCapacityData {
  name: string;
  value: number;
}

const TrainFleet: React.FC = () => {
  const [trainData, setTrainData] = useState<TrainEntry[]>([]);
  const [fleetData, setFleetData] = useState<TrainFleetData[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Colors for the charts
  const COLORS = ['#7e57c2', '#4e7fff', '#b39ddb', '#64b5f6', '#9575cd', '#5c6bc0', '#7986cb', '#4fc3f7'];
  const TRAIN_COLORS: Record<string, string> = {
    '101': '#7e57c2',
    '102': '#4e7fff',
    '103': '#b39ddb',
    '104': '#64b5f6',
    '105': '#9575cd',
    '106': '#5c6bc0',
    '107': '#7986cb',
    '108': '#4fc3f7'
  };
  
  const CLASS_COLORS = {
    'First': '#7e57c2',
    'Second': '#4e7fff',
    'Third': '#b39ddb'
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Get data from the data service
        const data = await transformData();
        setTrainData(data);
        
        // Process data to get fleet information
        processFleetData(data);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const processFleetData = (data: TrainEntry[]) => {
    const trainMap = new Map<string, TrainFleetData>();
    
    // Train capacity data based on SQL schema
    const trainCapacities: Record<string, { first: number, second: number, third: number }> = {
      '101': { first: 50, second: 80, third: 120 },
      '102': { first: 40, second: 80, third: 120 },
      '103': { first: 50, second: 80, third: 120 },
      '104': { first: 40, second: 80, third: 120 },
      '105': { first: 50, second: 80, third: 120 },
      '106': { first: 50, second: 80, third: 120 },
      '107': { first: 50, second: 80, third: 120 },
      '108': { first: 50, second: 80, third: 120 }
    };
    
    // Train names from the data service
    const trainNames: Record<string, string> = {
      '101': 'Perali Express',
      '102': 'Udarata Menike',
      '103': 'Kandy Intercity',
      '104': 'Ella Odyssey',
      '105': 'Rajarata Express',
      '106': 'Yal Devi',
      '107': 'Podi Menike',
      '108': 'Ruhunu Kumari'
    };
    
    // Process each train entry
    data.forEach(entry => {
      const trainId = entry.train_id;
      
      if (!trainMap.has(trainId)) {
        // Initialize train data
        trainMap.set(trainId, {
          trainId,
          trainName: trainNames[trainId] || `Train ${trainId}`,
          totalCapacity: 
            (trainCapacities[trainId]?.first || 0) + 
            (trainCapacities[trainId]?.second || 0) + 
            (trainCapacities[trainId]?.third || 0),
          firstClassCapacity: trainCapacities[trainId]?.first || 0,
          secondClassCapacity: trainCapacities[trainId]?.second || 0,
          thirdClassCapacity: trainCapacities[trainId]?.third || 0,
          avgOccupancyRate: 0,
          avgDelay: 0,
          totalRevenue: 0,
          totalTrips: 0,
          routes: []
        });
      }
      
      const train = trainMap.get(trainId)!;
      
      // Update train statistics
      train.avgOccupancyRate += entry.occupancyRate;
      train.avgDelay += entry.delay_minutes;
      train.totalRevenue += entry.revenue;
      train.totalTrips += 1;
      
      // Add route if not already in the list
      const route = `${entry.from_city} - ${entry.to_city}`;
      if (!train.routes.includes(route)) {
        train.routes.push(route);
      }
    });
    
    // Calculate averages
    trainMap.forEach(train => {
      if (train.totalTrips > 0) {
        train.avgOccupancyRate = train.avgOccupancyRate / train.totalTrips;
        train.avgDelay = train.avgDelay / train.totalTrips;
      }
    });
    
    // Convert map to array and sort by train ID
    const fleetArray = Array.from(trainMap.values()).sort((a, b) => 
      parseInt(a.trainId) - parseInt(b.trainId)
    );
    
    setFleetData(fleetArray);
    
    // Set the first train as selected by default
    if (fleetArray.length > 0) {
      setSelectedTrain(fleetArray[0].trainId);
    }
  };
  
  const getSelectedTrainData = () => {
    return fleetData.find(train => train.trainId === selectedTrain);
  };
  
  const prepareCapacityData = (train: TrainFleetData): ClassCapacityData[] => {
    return [
      { name: 'First Class', value: train.firstClassCapacity },
      { name: 'Second Class', value: train.secondClassCapacity },
      { name: 'Third Class', value: train.thirdClassCapacity }
    ];
  };
  
  const preparePerformanceData = () => {
    return fleetData.map(train => ({
      trainId: train.trainId,
      trainName: train.trainName,
      occupancyRate: train.avgOccupancyRate,
      delay: train.avgDelay,
      revenue: train.totalRevenue / train.totalTrips
    }));
  };
  
  const getTrainTrips = (trainId: string) => {
    return trainData.filter(entry => entry.train_id === trainId)
      .sort((a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime());
  };

  if (isLoading) {
    return <div className="text-center p-10 text-dashboard-text">Loading train fleet data...</div>;
  }

  const selectedTrainData = getSelectedTrainData();
  const selectedTrainTrips = selectedTrain ? getTrainTrips(selectedTrain) : [];

  return (
    <div className="p-4">
      <div className="mb-4 px-2">
        <h1 className="text-xl font-medium text-dashboard-header">Train Fleet Management</h1>
      </div>
      
      {/* Fleet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {fleetData.map(train => (
          <div 
            key={train.trainId}
            className={`bg-dashboard-panel rounded shadow p-4 cursor-pointer transition-all duration-200 ${selectedTrain === train.trainId ? 'ring-2 ring-purple-500' : 'hover:bg-dashboard-dark'}`}
            onClick={() => setSelectedTrain(train.trainId)}
          >
            <div className="flex items-center mb-3">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: TRAIN_COLORS[train.trainId] || '#7e57c2' }}
              ></div>
              <h2 className="text-dashboard-header text-lg">{train.trainName}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-dashboard-subtext">Train ID:</div>
              <div className="text-dashboard-text text-right">{train.trainId}</div>
              
              <div className="text-dashboard-subtext">Total Capacity:</div>
              <div className="text-dashboard-text text-right">{train.totalCapacity} seats</div>
              
              <div className="text-dashboard-subtext">Avg. Occupancy:</div>
              <div className="text-dashboard-text text-right">{train.avgOccupancyRate.toFixed(1)}%</div>
              
              <div className="text-dashboard-subtext">Avg. Delay:</div>
              <div className="text-dashboard-text text-right">{train.avgDelay.toFixed(1)} min</div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedTrainData && (
        <>
          {/* Selected Train Details */}
          <div className="bg-dashboard-panel rounded shadow p-4 mb-6">
            <h2 className="text-dashboard-header text-lg mb-4">
              {selectedTrainData.trainName} (Train {selectedTrainData.trainId}) Details
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Train Capacity */}
              <div>
                <h3 className="text-dashboard-subtext text-sm mb-2">Seating Capacity</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={prepareCapacityData(selectedTrainData)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {prepareCapacityData(selectedTrainData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(CLASS_COLORS)[index % Object.values(CLASS_COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                      labelStyle={{ color: '#e0e0e0' }}
                      formatter={(value) => `${value} seats`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="bg-dashboard-dark rounded p-3 mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-dashboard-subtext">First Class:</div>
                    <div className="text-dashboard-text text-right">{selectedTrainData.firstClassCapacity} seats</div>
                    
                    <div className="text-dashboard-subtext">Second Class:</div>
                    <div className="text-dashboard-text text-right">{selectedTrainData.secondClassCapacity} seats</div>
                    
                    <div className="text-dashboard-subtext">Third Class:</div>
                    <div className="text-dashboard-text text-right">{selectedTrainData.thirdClassCapacity} seats</div>
                    
                    <div className="text-dashboard-subtext">Total Capacity:</div>
                    <div className="text-dashboard-text text-right">{selectedTrainData.totalCapacity} seats</div>
                  </div>
                </div>
              </div>
              
              {/* Train Performance */}
              <div>
                <h3 className="text-dashboard-subtext text-sm mb-2">Performance Metrics</h3>
                <div className="bg-dashboard-dark rounded p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-dashboard-subtext">Total Trips:</div>
                    <div className="text-dashboard-text text-right">{selectedTrainData.totalTrips}</div>
                    
                    <div className="text-dashboard-subtext">Avg. Occupancy Rate:</div>
                    <div className="text-dashboard-text text-right">{selectedTrainData.avgOccupancyRate.toFixed(1)}%</div>
                    
                    <div className="text-dashboard-subtext">Avg. Delay:</div>
                    <div className="text-dashboard-text text-right">{selectedTrainData.avgDelay.toFixed(1)} min</div>
                    
                    <div className="text-dashboard-subtext">Total Revenue:</div>
                    <div className="text-dashboard-text text-right">{selectedTrainData.totalRevenue.toLocaleString()} LKR</div>
                    
                    <div className="text-dashboard-subtext">Avg. Revenue per Trip:</div>
                    <div className="text-dashboard-text text-right">
                      {(selectedTrainData.totalRevenue / selectedTrainData.totalTrips).toLocaleString()} LKR
                    </div>
                  </div>
                </div>
                
                <h3 className="text-dashboard-subtext text-sm mt-4 mb-2">Routes Served</h3>
                <div className="bg-dashboard-dark rounded p-3">
                  <ul className="divide-y divide-gray-700">
                    {selectedTrainData.routes.map((route, index) => (
                      <li key={index} className="py-2 first:pt-0 last:pb-0">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-dashboard-text">{route}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {/* Train Maintenance Status */}
              <div>
                <h3 className="text-dashboard-subtext text-sm mb-2">Maintenance Status</h3>
                <div className="bg-dashboard-dark rounded p-3">
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-dashboard-subtext text-sm">Overall Condition</span>
                      <span className="text-green-400 text-sm">Good</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div className="bg-green-400 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-dashboard-subtext">Last Maintenance:</div>
                    <div className="text-dashboard-text text-right">2025-04-15</div>
                    
                    <div className="text-dashboard-subtext">Next Scheduled:</div>
                    <div className="text-dashboard-text text-right">2025-05-15</div>
                    
                    <div className="text-dashboard-subtext">Engine Hours:</div>
                    <div className="text-dashboard-text text-right">1,245 hrs</div>
                    
                    <div className="text-dashboard-subtext">Distance Traveled:</div>
                    <div className="text-dashboard-text text-right">24,680 km</div>
                  </div>
                </div>
                
                <h3 className="text-dashboard-subtext text-sm mt-4 mb-2">Current Status</h3>
                <div className="bg-dashboard-dark rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-dashboard-text">In Service</span>
                    </div>
                    <span className="text-dashboard-subtext text-sm">Updated: 2025-04-25</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Trips */}
          <div className="bg-dashboard-panel rounded shadow p-4 mb-6">
            <h2 className="text-dashboard-header text-lg mb-4">Recent Trips</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-dashboard-text">
                <thead className="bg-dashboard-dark border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Route</th>
                    <th className="text-left py-3 px-4">Class</th>
                    <th className="text-left py-3 px-4">Scheduled Time</th>
                    <th className="text-left py-3 px-4">Actual Time</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Occupancy</th>
                    <th className="text-left py-3 px-4">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTrainTrips.slice(0, 10).map((trip) => (
                    <tr key={trip.id} className="border-b border-gray-700 hover:bg-dashboard-dark">
                      <td className="py-3 px-4">{trip.departure_date}</td>
                      <td className="py-3 px-4">{trip.from_city} → {trip.to_city}</td>
                      <td className="py-3 px-4">{trip.class}</td>
                      <td className="py-3 px-4">{trip.scheduled_time}</td>
                      <td className="py-3 px-4">{trip.actual_time}</td>
                      <td className={`py-3 px-4 ${trip.delay_minutes === 0 ? 'text-green-400' : trip.delay_minutes <= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${trip.delay_minutes === 0 ? 'bg-green-400' : trip.delay_minutes <= 10 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                          {trip.delay_minutes === 0 ? 'On Time' : `Delayed ${trip.delay_minutes}m`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mr-2">
                            <div 
                              className="bg-purple-500 h-2.5 rounded-full" 
                              style={{ width: `${trip.occupancyRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{trip.occupancyRate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{trip.revenue.toLocaleString()} LKR</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Fleet Comparison */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Fleet Performance Comparison</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-dashboard-subtext text-sm mb-2">Average Occupancy Rate</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={preparePerformanceData()}>
                    <XAxis dataKey="trainId" stroke="#666" />
                    <YAxis stroke="#666" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                      labelStyle={{ color: '#e0e0e0' }}
                    />
                    <Bar dataKey="occupancyRate" name="Occupancy Rate (%)">
                      {preparePerformanceData().map((entry) => (
                        <Cell key={`cell-${entry.trainId}`} fill={TRAIN_COLORS[entry.trainId] || '#7e57c2'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h3 className="text-dashboard-subtext text-sm mb-2">Average Delay</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={preparePerformanceData()}>
                    <XAxis dataKey="trainId" stroke="#666" />
                    <YAxis stroke="#666" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                      labelStyle={{ color: '#e0e0e0' }}
                    />
                    <Bar dataKey="delay" name="Delay (minutes)">
                      {preparePerformanceData().map((entry) => (
                        <Cell key={`cell-${entry.trainId}`} fill={TRAIN_COLORS[entry.trainId] || '#7e57c2'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TrainFleet;

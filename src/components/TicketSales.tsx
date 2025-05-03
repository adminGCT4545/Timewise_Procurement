import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { transformData, TrainEntry } from '../services/dataService';

interface TicketSalesStats {
  totalRevenue: number;
  totalTickets: number;
  averageTicketPrice: number;
  classSales: Record<string, { tickets: number, revenue: number }>;
  routeSales: Record<string, { tickets: number, revenue: number }>;
  trainSales: Record<string, { tickets: number, revenue: number }>;
  monthlySales: Record<string, { tickets: number, revenue: number }>;
  routeMonthlyData?: Record<string, { tickets: number, revenue: number }>;
}

interface SalesDataItem {
  name: string;
  value: number;
}

interface MonthlyDataItem {
  month: string;
  tickets: number;
  revenue: number;
}

interface RouteDataItem {
  route: string;
  tickets: number;
  revenue: number;
}

const TicketSales: React.FC = () => {
  const [data, setData] = useState<TrainEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [salesStats, setSalesStats] = useState<TicketSalesStats>({
    totalRevenue: 0,
    totalTickets: 0,
    averageTicketPrice: 0,
    classSales: {},
    routeSales: {},
    trainSales: {},
    monthlySales: {}
  });
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedView, setSelectedView] = useState<string>('overview');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);

  // Colors for the charts
  const COLORS = ['#7e57c2', '#4e7fff', '#b39ddb', '#64b5f6', '#9575cd', '#5c6bc0', '#7986cb', '#4fc3f7'];

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
        
        // Calculate sales statistics
        calculateSalesStats(transformedData);
        
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
    
    calculateSalesStats(filteredData);
  }, [selectedYear, selectedRoute, data]);
  
  const calculateSalesStats = (data: TrainEntry[]) => {
    const stats: TicketSalesStats = {
      totalRevenue: 0,
      totalTickets: 0,
      averageTicketPrice: 0,
      classSales: {},
      routeSales: {},
      trainSales: {},
      monthlySales: {},
      routeMonthlyData: {}
    };
    
    // Aggregate data
    data.forEach(entry => {
      // Overall stats
      stats.totalRevenue += entry.revenue;
      stats.totalTickets += entry.occupancy;
      
      // Class sales
      if (!stats.classSales[entry.class]) {
        stats.classSales[entry.class] = { tickets: 0, revenue: 0 };
      }
      stats.classSales[entry.class].tickets += entry.occupancy;
      stats.classSales[entry.class].revenue += entry.revenue;
      
      // Route sales
      const route = `${entry.from_city}-${entry.to_city}`;
      if (!stats.routeSales[route]) {
        stats.routeSales[route] = { tickets: 0, revenue: 0 };
      }
      stats.routeSales[route].tickets += entry.occupancy;
      stats.routeSales[route].revenue += entry.revenue;
      
      // Train sales
      if (!stats.trainSales[entry.train_id]) {
        stats.trainSales[entry.train_id] = { tickets: 0, revenue: 0 };
      }
      stats.trainSales[entry.train_id].tickets += entry.occupancy;
      stats.trainSales[entry.train_id].revenue += entry.revenue;
      
      // Monthly sales
      const monthKey = `${entry.year}-${String(entry.month).padStart(2, '0')}`;
      if (!stats.monthlySales[monthKey]) {
        stats.monthlySales[monthKey] = { tickets: 0, revenue: 0 };
      }
      stats.monthlySales[monthKey].tickets += entry.occupancy;
      stats.monthlySales[monthKey].revenue += entry.revenue;
      
      // Route-specific monthly data
      const routeKey = `${entry.from_city}-${entry.to_city}`;
      const routeMonthKey = `${routeKey}|${monthKey}`;
      if (!stats.routeMonthlyData) {
        stats.routeMonthlyData = {};
      }
      if (!stats.routeMonthlyData[routeMonthKey]) {
        stats.routeMonthlyData[routeMonthKey] = { tickets: 0, revenue: 0 };
      }
      stats.routeMonthlyData[routeMonthKey].tickets += entry.occupancy;
      stats.routeMonthlyData[routeMonthKey].revenue += entry.revenue;
    });
    
    // Calculate average ticket price
    if (stats.totalTickets > 0) {
      stats.averageTicketPrice = stats.totalRevenue / stats.totalTickets;
    }
    
    setSalesStats(stats);
  };
  
  // Prepare data for charts
  const prepareClassSalesData = (): SalesDataItem[] => {
    return Object.entries(salesStats.classSales).map(([className, data]) => ({
      name: className,
      value: data.revenue
    }));
  };
  
  const prepareTrainSalesData = (): SalesDataItem[] => {
    return Object.entries(salesStats.trainSales).map(([trainId, data]) => ({
      name: trainId,
      value: data.revenue
    }));
  };
  
  const prepareRouteSalesData = (): RouteDataItem[] => {
    const routes = Object.entries(salesStats.routeSales)
      .map(([route, data]) => ({
        route,
        tickets: data.tickets,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);
    
    return routes.slice(0, 10); // Top 10 routes by revenue
  };
  
  const prepareMonthlySalesData = (): MonthlyDataItem[] => {
    let monthlyData;
    
    if (selectedRoute !== 'all' && salesStats.routeMonthlyData) {
      // Get route-specific monthly data
      const routePrefix = `${selectedRoute}|`;
      monthlyData = Object.entries(salesStats.routeMonthlyData)
        .filter(([key]) => key.startsWith(routePrefix))
        .map(([key, data]) => ({
          month: key.split('|')[1], // Extract month part
          tickets: data.tickets,
          revenue: data.revenue
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    } else {
      // Get overall monthly data
      monthlyData = Object.entries(salesStats.monthlySales)
        .map(([month, data]) => ({
          month,
          tickets: data.tickets,
          revenue: data.revenue
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }
    
    return monthlyData;
  };
  
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })
      .replace(/LKR/g, '')
      .trim();
  };
  
  if (isLoading) {
    return <div className="text-center p-10 text-dashboard-text">Loading ticket sales data...</div>;
  }
  
  return (
    <div className="p-4">
      <div className="mb-4 px-2">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-medium text-dashboard-header">Ticket Sales Analytics</h1>
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
                <option value="byClass">By Class</option>
                <option value="byRoute">By Route</option>
                <option value="byTrain">By Train</option>
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
      
      {/* Sales Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-dashboard-panel rounded shadow p-4">
          <h2 className="text-dashboard-subtext text-sm mb-2">Total Revenue</h2>
          <div className="text-dashboard-header text-2xl font-bold">
            {formatCurrency(salesStats.totalRevenue)} LKR
          </div>
          <div className="text-dashboard-subtext text-xs mt-2">
            From {salesStats.totalTickets.toLocaleString()} tickets sold
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <h2 className="text-dashboard-subtext text-sm mb-2">Average Ticket Price</h2>
          <div className="text-dashboard-header text-2xl font-bold">
            {formatCurrency(salesStats.averageTicketPrice)} LKR
          </div>
          <div className="text-dashboard-subtext text-xs mt-2">
            Per passenger across all classes
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <h2 className="text-dashboard-subtext text-sm mb-2">Top Selling Class</h2>
          <div className="text-dashboard-header text-2xl font-bold">
            {Object.entries(salesStats.classSales).sort((a, b) => b[1].tickets - a[1].tickets)[0]?.[0] || 'N/A'}
          </div>
          <div className="text-dashboard-subtext text-xs mt-2">
            {Object.entries(salesStats.classSales).sort((a, b) => b[1].tickets - a[1].tickets)[0]?.[1].tickets.toLocaleString() || 0} tickets sold
          </div>
        </div>
        
        <div className="bg-dashboard-panel rounded shadow p-4">
          <h2 className="text-dashboard-subtext text-sm mb-2">Top Revenue Route</h2>
          <div className="text-dashboard-header text-2xl font-bold">
            {Object.entries(salesStats.routeSales).sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[0] || 'N/A'}
          </div>
          <div className="text-dashboard-subtext text-xs mt-2">
            {formatCurrency(Object.entries(salesStats.routeSales).sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[1].revenue || 0)} LKR
          </div>
        </div>
      </div>
      
      {/* Main Content Based on Selected View */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monthly Sales Trend */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">
              {selectedRoute === 'all' ? 'Monthly Sales Trend' : `Monthly Sales Trend: ${selectedRoute}`}
            </h2>
            {prepareMonthlySalesData().length === 0 && (
              <div className="text-center py-10 text-dashboard-subtext">
                No data available for the selected route and time period.
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={prepareMonthlySalesData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                  formatter={(value: any) => [`${formatCurrency(value)} LKR`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7e57c2" fill="#7e57c2" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Revenue by Class */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Revenue by Class</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prepareClassSalesData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {prepareClassSalesData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                  formatter={(value: any) => [`${formatCurrency(value)} LKR`, 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Top Routes by Revenue */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Top Routes by Revenue</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareRouteSalesData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="route" type="category" stroke="#666" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                  formatter={(value: any) => [`${formatCurrency(value)} LKR`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#4e7fff">
                  {prepareRouteSalesData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Revenue by Train */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Revenue by Train</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareTrainSalesData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                  formatter={(value: any) => [`${formatCurrency(value)} LKR`, 'Revenue']}
                />
                <Bar dataKey="value" fill="#7e57c2">
                  {prepareTrainSalesData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {selectedView === 'byClass' && (
        <div className="grid grid-cols-1 gap-4">
          {/* Revenue by Class */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Revenue by Class</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prepareClassSalesData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {prepareClassSalesData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                      labelStyle={{ color: '#e0e0e0' }}
                      formatter={(value: any) => [`${formatCurrency(value)} LKR`, 'Revenue']}
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
                        <th className="text-right py-2">Tickets</th>
                        <th className="text-right py-2">Revenue</th>
                        <th className="text-right py-2">Avg. Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(salesStats.classSales).map(([className, data]) => (
                        <tr key={className} className="border-b border-gray-700">
                          <td className="py-2">{className}</td>
                          <td className="py-2 text-right">{data.tickets.toLocaleString()}</td>
                          <td className="py-2 text-right">{formatCurrency(data.revenue)} LKR</td>
                          <td className="py-2 text-right">{formatCurrency(data.revenue / data.tickets)} LKR</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          {/* Class Sales Over Time */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">
              {selectedRoute === 'all' ? 'Sales Over Time' : `Sales Over Time: ${selectedRoute}`}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={prepareMonthlySalesData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#7e57c2" name="Revenue" />
                <Line type="monotone" dataKey="tickets" stroke="#4e7fff" name="Tickets" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {selectedView === 'byRoute' && (
        <div className="grid grid-cols-1 gap-4">
          {/* Top Routes by Revenue */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Top Routes by Revenue</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={prepareRouteSalesData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis type="number" stroke="#666" />
                <YAxis dataKey="route" type="category" stroke="#666" width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                  formatter={(value: any) => [`${formatCurrency(value)} LKR`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#4e7fff">
                  {prepareRouteSalesData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
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
                    <th className="text-right py-3 px-4">Tickets Sold</th>
                    <th className="text-right py-3 px-4">Total Revenue</th>
                    <th className="text-right py-3 px-4">Avg. Ticket Price</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(salesStats.routeSales)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([route, data]) => (
                      <tr key={route} className="border-b border-gray-700 hover:bg-dashboard-dark">
                        <td className="py-3 px-4">{route}</td>
                        <td className="py-3 px-4 text-right">{data.tickets.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(data.revenue)} LKR</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(data.revenue / data.tickets)} LKR</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {selectedView === 'byTrain' && (
        <div className="grid grid-cols-1 gap-4">
          {/* Revenue by Train */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Revenue by Train</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prepareTrainSalesData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#282c3e', borderColor: '#444', color: '#e0e0e0' }}
                  labelStyle={{ color: '#e0e0e0' }}
                  formatter={(value: any) => [`${formatCurrency(value)} LKR`, 'Revenue']}
                />
                <Bar dataKey="value" fill="#7e57c2">
                  {prepareTrainSalesData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Train Details Table */}
          <div className="bg-dashboard-panel rounded shadow p-4">
            <h2 className="text-dashboard-header text-lg mb-4">Train Performance Details</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-dashboard-text">
                <thead className="bg-dashboard-dark border-b border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4">Train ID</th>
                    <th className="text-right py-3 px-4">Tickets Sold</th>
                    <th className="text-right py-3 px-4">Total Revenue</th>
                    <th className="text-right py-3 px-4">Avg. Ticket Price</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(salesStats.trainSales)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([trainId, data]) => (
                      <tr key={trainId} className="border-b border-gray-700 hover:bg-dashboard-dark">
                        <td className="py-3 px-4">{trainId}</td>
                        <td className="py-3 px-4 text-right">{data.tickets.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(data.revenue)} LKR</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(data.revenue / data.tickets)} LKR</td>
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

export default TicketSales;

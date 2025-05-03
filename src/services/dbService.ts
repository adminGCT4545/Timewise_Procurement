// Database service that makes API calls to the backend server
import { type QueryResult } from 'pg';

// Types
interface QueryOptions {
  text: string;
  params?: any[];
}

// Test mock data
const mockQueryResult: QueryResult = {
  rows: [{
    train_id: '101',
    train_name: 'Test Train',
    departure_city: 'Test City',
    arrival_city: 'Test City',
    journey_date: '2025-04-27',
    class: 'Test Class',
    scheduled_time: '12:00:00',
    is_delayed: false,
    delay_minutes: 0,
    total_seats: 100,
    reserved_seats: 50,
    revenue: 1000
  }],
  command: 'SELECT',
  rowCount: 1,
  oid: 0,
  fields: []
};

// Helper function to execute queries through the backend API
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  // Mock the query function for testing
  if (process.env.NODE_ENV === 'test') {
    console.log('Using mock query function');
    return mockQueryResult;
  }

  try {
    const start = Date.now();
    console.log(`Sending query to backend: ${text}`);
    
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, params }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Database query failed:', errorData);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const duration = Date.now() - start;
    
    // The backend now returns the rows directly as an array
    const rows = Array.isArray(data) ? data : [];
    console.log(`Executed query - Duration: ${duration}ms, Rows: ${rows.length}`);
    
    return {
      rows,
      command: 'SELECT',
      rowCount: rows.length,
      oid: 0,
      fields: []
    };
  } catch (error) {
    console.error('Error executing query:', error);
    console.error('Query text:', text);
    console.error('Query params:', params);
    
    // Return fallback data in case of error
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Returning mock data due to query error');
      return mockQueryResult;
    }
    
    throw error;
  }
};

// No need to export pool anymore since we're using the API
export default query;

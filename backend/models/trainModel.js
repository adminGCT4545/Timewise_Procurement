import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'your_postgres_username',
  password: process.env.PGPASSWORD || 'your_postgres_password',
  database: process.env.PGDATABASE || 'booksl_train',
  port: parseInt(process.env.PGPORT || '5432'),
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});

// Calculate actual time based on scheduled time and delay
const calculateActualTime = (scheduledTime, delayMinutes) => {
  const scheduled = new Date(`2000-01-01T${scheduledTime}`);
  scheduled.setMinutes(scheduled.getMinutes() + delayMinutes);
  return scheduled.toTimeString().substring(0, 8);
};

// Train model with database operations
const trainModel = {
  /**
   * Get all trains
   * @returns {Promise<Array>} Array of train objects
   */
  getAllTrains: async () => {
    try {
      const result = await pool.query('SELECT * FROM trains ORDER BY train_id');
      return result.rows;
    } catch (error) {
      console.error('Error in getAllTrains:', error);
      throw error;
    }
  },

  /**
   * Get train journeys with optional filtering
   * @param {number} year - Filter by year (optional)
   * @param {number} trainId - Filter by train ID (optional)
   * @param {number} limit - Limit the number of results (optional)
   * @returns {Promise<Array>} Array of journey objects
   */
  getJourneys: async (year, trainId, limit = 100) => {
    try {
      let query = `
        SELECT 
          j.journey_id, 
          j.train_id, 
          t.train_name, 
          j.departure_city, 
          j.arrival_city, 
          j.journey_date, 
          j.class, 
          s.scheduled_time, 
          j.is_delayed, 
          CASE WHEN j.is_delayed THEN s.default_delay_minutes ELSE 0 END as delay_minutes,
          j.total_seats, 
          j.reserved_seats, 
          j.revenue
        FROM 
          train_journeys j
        JOIN 
          trains t ON j.train_id = t.train_id
        JOIN 
          train_schedules s ON j.train_id = s.train_id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (year) {
        query += ` AND EXTRACT(YEAR FROM j.journey_date) = $${params.length + 1}`;
        params.push(year);
      }
      
      if (trainId) {
        query += ` AND j.train_id = $${params.length + 1}`;
        params.push(trainId);
      }
      
      query += ` ORDER BY j.journey_date DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      
      // Transform the data
      return result.rows.map(row => {
        const scheduledTime = row.scheduled_time.substring(0, 8);
        const delayMinutes = row.delay_minutes;
        const actualTime = calculateActualTime(scheduledTime, delayMinutes);
        const date = new Date(row.journey_date);
        
        return {
          id: row.journey_id,
          train_id: row.train_id.toString(),
          train_name: row.train_name,
          departure_date: row.journey_date,
          from_city: row.departure_city,
          to_city: row.arrival_city,
          class: row.class,
          scheduled_time: scheduledTime,
          actual_time: actualTime,
          delay_minutes: delayMinutes,
          capacity: row.total_seats,
          occupancy: row.reserved_seats,
          revenue: parseFloat(row.revenue),
          occupancyRate: (row.reserved_seats / row.total_seats) * 100,
          date,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          quarter: Math.floor(date.getMonth() / 3) + 1
        };
      });
    } catch (error) {
      console.error('Error in getJourneys:', error);
      throw error;
    }
  },

  /**
   * Get upcoming train departures
   * @param {number} count - Number of departures to return
   * @returns {Promise<Array>} Array of upcoming departure objects
   */
  getUpcomingDepartures: async (count = 5) => {
    try {
      const query = `
        SELECT DISTINCT ON (j.train_id, j.departure_city, j.arrival_city)
          j.train_id,
          t.train_name,
          j.departure_city as from_city,
          j.arrival_city as to_city,
          s.scheduled_time,
          j.is_delayed,
          CASE WHEN j.is_delayed THEN s.default_delay_minutes ELSE 0 END as delay_minutes,
          j.journey_date as departure_date
        FROM 
          train_journeys j
        JOIN 
          trains t ON j.train_id = t.train_id
        JOIN 
          train_schedules s ON j.train_id = s.train_id
        ORDER BY 
          j.train_id, j.departure_city, j.arrival_city, j.journey_date
        LIMIT $1
      `;
      
      const result = await pool.query(query, [count]);
      
      return result.rows.map(row => {
        const scheduledTime = row.scheduled_time.substring(0, 8);
        const delayMinutes = row.delay_minutes;
        
        return {
          train_id: row.train_id,
          train_name: row.train_name,
          from_city: row.from_city,
          to_city: row.to_city,
          scheduled_time: scheduledTime,
          actual_time: calculateActualTime(scheduledTime, delayMinutes),
          delay_minutes: delayMinutes,
          departure_date: row.departure_date
        };
      });
    } catch (error) {
      console.error('Error in getUpcomingDepartures:', error);
      throw error;
    }
  },

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard statistics
   */
  getDashboardStats: async () => {
    try {
      // Get overall statistics
      const overallStatsQuery = `
        SELECT 
          COUNT(*) as total_journeys,
          SUM(revenue) as total_revenue,
          AVG((reserved_seats::float / total_seats) * 100) as avg_occupancy_rate,
          COUNT(CASE WHEN is_delayed THEN 1 END) as delayed_journeys
        FROM 
          train_journeys
      `;
      
      const overallStatsResult = await pool.query(overallStatsQuery);
      const overallStats = overallStatsResult.rows[0];
      
      // Get train-specific statistics
      const trainStatsQuery = `
        SELECT 
          j.train_id,
          t.train_name,
          COUNT(*) as journey_count,
          SUM(j.revenue) as total_revenue,
          AVG((j.reserved_seats::float / j.total_seats) * 100) as avg_occupancy_rate,
          COUNT(CASE WHEN j.is_delayed THEN 1 END) as delayed_journeys,
          EXTRACT(YEAR FROM j.journey_date) as year,
          EXTRACT(MONTH FROM j.journey_date) as month
        FROM 
          train_journeys j
        JOIN
          trains t ON j.train_id = t.train_id
        GROUP BY 
          j.train_id, t.train_name, year, month
        ORDER BY 
          j.train_id, year, month
      `;
      
      const trainStatsResult = await pool.query(trainStatsQuery);
      
      // Get route statistics
      const routeStatsQuery = `
        SELECT 
          departure_city || '-' || arrival_city as route,
          COUNT(*) as journey_count,
          SUM(revenue) as total_revenue,
          AVG((reserved_seats::float / total_seats) * 100) as avg_occupancy_rate,
          COUNT(CASE WHEN is_delayed THEN 1 END) as delayed_journeys
        FROM 
          train_journeys
        GROUP BY 
          route
        ORDER BY 
          journey_count DESC
      `;
      
      const routeStatsResult = await pool.query(routeStatsQuery);
      
      // Get class statistics
      const classStatsQuery = `
        SELECT 
          class,
          COUNT(*) as journey_count,
          SUM(revenue) as total_revenue,
          AVG((reserved_seats::float / total_seats) * 100) as avg_occupancy_rate
        FROM 
          train_journeys
        GROUP BY 
          class
        ORDER BY 
          total_revenue DESC
      `;
      
      const classStatsResult = await pool.query(classStatsQuery);
      
      return {
        overall: {
          totalJourneys: parseInt(overallStats.total_journeys),
          totalRevenue: parseFloat(overallStats.total_revenue),
          avgOccupancyRate: parseFloat(overallStats.avg_occupancy_rate),
          delayedJourneys: parseInt(overallStats.delayed_journeys),
          onTimePerformance: (1 - (overallStats.delayed_journeys / overallStats.total_journeys)) * 100
        },
        trainStats: trainStatsResult.rows.map(row => ({
          trainId: row.train_id,
          trainName: row.train_name,
          journeyCount: parseInt(row.journey_count),
          totalRevenue: parseFloat(row.total_revenue),
          avgOccupancyRate: parseFloat(row.avg_occupancy_rate),
          delayedJourneys: parseInt(row.delayed_journeys),
          year: parseInt(row.year),
          month: parseInt(row.month)
        })),
        routeStats: routeStatsResult.rows.map(row => ({
          route: row.route,
          journeyCount: parseInt(row.journey_count),
          totalRevenue: parseFloat(row.total_revenue),
          avgOccupancyRate: parseFloat(row.avg_occupancy_rate),
          delayedJourneys: parseInt(row.delayed_journeys)
        })),
        classStats: classStatsResult.rows.map(row => ({
          class: row.class,
          journeyCount: parseInt(row.journey_count),
          totalRevenue: parseFloat(row.total_revenue),
          avgOccupancyRate: parseFloat(row.avg_occupancy_rate)
        }))
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      throw error;
    }
  },

  /**
   * Get available years in the data
   * @returns {Promise<Array>} Array of years
   */
  getAvailableYears: async () => {
    try {
      const query = `
        SELECT DISTINCT EXTRACT(YEAR FROM journey_date) as year
        FROM train_journeys
        ORDER BY year
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => parseInt(row.year));
    } catch (error) {
      console.error('Error in getAvailableYears:', error);
      throw error;
    }
  }
};

export default trainModel;

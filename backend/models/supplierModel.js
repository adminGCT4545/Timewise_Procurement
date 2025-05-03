import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'your_postgres_username',
  password: process.env.PGPASSWORD || 'your_postgres_password',
  database: process.env.PGDATABASE || 'procurement',
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

// Calculate actual delivery time based on scheduled time and delay
const calculateActualDelivery = (scheduledDelivery, delayDays) => {
  const scheduled = new Date(`2000-01-01T${scheduledDelivery}`);
  scheduled.setDate(scheduled.getDate() + delayDays);
  return scheduled.toTimeString().substring(0, 8);
};

// Supplier model with database operations
const supplierModel = {
  /**
   * Create a new purchase order
   * @param {Object} purchaseOrderData - The purchase order data
   * @returns {Promise<Object>} The created purchase order
   */
  createPurchaseOrder: async (purchaseOrderData) => {
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Insert the purchase order
      const poQuery = `
        INSERT INTO purchase_orders (
          po_number, 
          supplier_id, 
          department_id, 
          order_date, 
          delivery_date, 
          status, 
          payment_terms, 
          shipping_terms, 
          total_amount, 
          tax_amount, 
          shipping_amount, 
          currency, 
          is_blanket_po, 
          blanket_end_date
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING po_id
      `;
      
      const poValues = [
        purchaseOrderData.po_number,
        purchaseOrderData.supplier_id,
        purchaseOrderData.department_id,
        purchaseOrderData.order_date,
        purchaseOrderData.delivery_date,
        purchaseOrderData.status,
        purchaseOrderData.payment_terms,
        purchaseOrderData.shipping_terms,
        purchaseOrderData.total_amount,
        purchaseOrderData.tax_amount,
        purchaseOrderData.shipping_amount,
        purchaseOrderData.currency,
        purchaseOrderData.is_blanket_po,
        purchaseOrderData.blanket_end_date
      ];
      
      const poResult = await client.query(poQuery, poValues);
      const poId = poResult.rows[0].po_id;
      
      // Insert the purchase order items
      if (purchaseOrderData.items && purchaseOrderData.items.length > 0) {
        for (const item of purchaseOrderData.items) {
          const itemQuery = `
            INSERT INTO purchase_order_items (
              po_id,
              item_name,
              quantity,
              unit_price,
              total_price,
              tax_amount,
              delivery_date,
              status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;
          
          const itemValues = [
            poId,
            item.item_name,
            item.quantity,
            item.unit_price,
            item.total_price,
            item.tax_amount,
            item.delivery_date,
            item.status
          ];
          
          await client.query(itemQuery, itemValues);
        }
      }
      
      // Commit the transaction
      await client.query('COMMIT');
      
      // Return the created purchase order
      return {
        po_id: poId,
        ...purchaseOrderData
      };
    } catch (error) {
      // Rollback the transaction in case of error
      await client.query('ROLLBACK');
      console.error('Error in createPurchaseOrder:', error);
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  },
  /**
   * Get all procurement schedules
   * @returns {Promise<Array>} Array of procurement schedule objects
   */
  getProcurementSchedules: async () => {
    try {
      const query = `
        SELECT 
          ps.supplier_id,
          s.supplier_name,
          ps.scheduled_delivery,
          ps.default_delay_days,
          COUNT(po.order_id) as total_orders,
          SUM(CASE WHEN po.is_delayed THEN 1 ELSE 0 END) as delayed_orders,
          AVG((po.fulfilled_items::float / po.total_items) * 100) as avg_fulfillment_rate
        FROM 
          procurement_schedules ps
        JOIN 
          suppliers s ON ps.supplier_id = s.supplier_id
        LEFT JOIN 
          purchase_orders po ON ps.supplier_id = po.supplier_id
        GROUP BY 
          ps.supplier_id, s.supplier_name, ps.scheduled_delivery, ps.default_delay_days
        ORDER BY 
          ps.supplier_id
      `;
      
      const result = await pool.query(query);
      
      // Transform the data
      return result.rows.map(row => {
        const scheduledDelivery = row.scheduled_delivery.substring(0, 8);
        
        return {
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
          scheduled_delivery: scheduledDelivery,
          default_delay_days: row.default_delay_days,
          total_orders: parseInt(row.total_orders),
          delayed_orders: parseInt(row.delayed_orders),
          avg_fulfillment_rate: parseFloat(row.avg_fulfillment_rate) || 0,
          on_time_rate: row.total_orders > 0 ? ((row.total_orders - row.delayed_orders) / row.total_orders) * 100 : 100
        };
      });
    } catch (error) {
      console.error('Error in getProcurementSchedules:', error);
      throw error;
    }
  },
  /**
   * Get all suppliers
   * @returns {Promise<Array>} Array of supplier objects
   */
  getAllSuppliers: async () => {
    try {
      const result = await pool.query('SELECT * FROM suppliers ORDER BY supplier_id');
      return result.rows;
    } catch (error) {
      console.error('Error in getAllSuppliers:', error);
      throw error;
    }
  },

  /**
   * Get purchase orders with optional filtering
   * @param {number} year - Filter by year (optional)
   * @param {number} supplierId - Filter by supplier ID (optional)
   * @param {number} limit - Limit the number of results (optional)
   * @returns {Promise<Array>} Array of purchase order objects
   */
  getPurchaseOrders: async (year, supplierId, limit = 100) => {
    try {
      let query = `
        SELECT 
          p.order_id, 
          p.supplier_id, 
          s.supplier_name, 
          p.supplier_location, 
          p.delivery_location, 
          p.order_date, 
          p.priority, 
          ps.scheduled_delivery, 
          p.is_delayed, 
          CASE WHEN p.is_delayed THEN ps.default_delay_days ELSE 0 END as delay_days,
          p.total_items, 
          p.fulfilled_items, 
          p.cost
        FROM 
          purchase_orders p
        JOIN 
          suppliers s ON p.supplier_id = s.supplier_id
        JOIN 
          procurement_schedules ps ON p.supplier_id = ps.supplier_id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (year) {
        query += ` AND EXTRACT(YEAR FROM p.order_date) = $${params.length + 1}`;
        params.push(year);
      }
      
      if (supplierId) {
        query += ` AND p.supplier_id = $${params.length + 1}`;
        params.push(supplierId);
      }
      
      query += ` ORDER BY p.order_date DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      
      // Transform the data
      return result.rows.map(row => {
        const scheduledDelivery = row.scheduled_delivery.substring(0, 8);
        const delayDays = row.delay_days;
        const actualDelivery = calculateActualDelivery(scheduledDelivery, delayDays);
        const date = new Date(row.order_date);
        
        return {
          id: row.order_id,
          order_id: row.supplier_id.toString(),
          supplier_name: row.supplier_name,
          order_date: row.order_date,
          supplier_location: row.supplier_location,
          delivery_location: row.delivery_location,
          priority: row.priority,
          scheduled_delivery: scheduledDelivery,
          actual_delivery: actualDelivery,
          delay_days: delayDays,
          total_items: row.total_items,
          fulfilled_items: row.fulfilled_items,
          cost: parseFloat(row.cost),
          fulfillmentRate: (row.fulfilled_items / row.total_items) * 100,
          date,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          quarter: Math.floor(date.getMonth() / 3) + 1
        };
      });
    } catch (error) {
      console.error('Error in getPurchaseOrders:', error);
      throw error;
    }
  },

  /**
   * Get upcoming deliveries
   * @param {number} count - Number of deliveries to return
   * @returns {Promise<Array>} Array of upcoming delivery objects
   */
  getUpcomingDeliveries: async (count = 5) => {
    try {
      const query = `
        SELECT DISTINCT ON (p.supplier_id, p.supplier_location, p.delivery_location)
          p.supplier_id,
          s.supplier_name,
          p.supplier_location,
          p.delivery_location,
          ps.scheduled_delivery,
          p.is_delayed,
          CASE WHEN p.is_delayed THEN ps.default_delay_days ELSE 0 END as delay_days,
          p.order_date
        FROM 
          purchase_orders p
        JOIN 
          suppliers s ON p.supplier_id = s.supplier_id
        JOIN 
          procurement_schedules ps ON p.supplier_id = ps.supplier_id
        ORDER BY 
          p.supplier_id, p.supplier_location, p.delivery_location, p.order_date
        LIMIT $1
      `;
      
      const result = await pool.query(query, [count]);
      
      return result.rows.map(row => {
        const scheduledDelivery = row.scheduled_delivery.substring(0, 8);
        const delayDays = row.delay_days;
        
        return {
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
          supplier_location: row.supplier_location,
          delivery_location: row.delivery_location,
          scheduled_delivery: scheduledDelivery,
          actual_delivery: calculateActualDelivery(scheduledDelivery, delayDays),
          delay_days: delayDays,
          order_date: row.order_date
        };
      });
    } catch (error) {
      console.error('Error in getUpcomingDeliveries:', error);
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
          COUNT(*) as total_orders,
          SUM(cost) as total_cost,
          AVG((fulfilled_items::float / total_items) * 100) as avg_fulfillment_rate,
          COUNT(CASE WHEN is_delayed THEN 1 END) as delayed_orders
        FROM 
          purchase_orders
      `;
      
      const overallStatsResult = await pool.query(overallStatsQuery);
      const overallStats = overallStatsResult.rows[0];
      
      // Get supplier-specific statistics
      const supplierStatsQuery = `
        SELECT 
          p.supplier_id,
          s.supplier_name,
          COUNT(*) as order_count,
          SUM(p.cost) as total_cost,
          AVG((p.fulfilled_items::float / p.total_items) * 100) as avg_fulfillment_rate,
          COUNT(CASE WHEN p.is_delayed THEN 1 END) as delayed_orders,
          EXTRACT(YEAR FROM p.order_date) as year,
          EXTRACT(MONTH FROM p.order_date) as month
        FROM 
          purchase_orders p
        JOIN
          suppliers s ON p.supplier_id = s.supplier_id
        GROUP BY 
          p.supplier_id, s.supplier_name, year, month
        ORDER BY 
          p.supplier_id, year, month
      `;
      
      const supplierStatsResult = await pool.query(supplierStatsQuery);
      
      // Get location statistics
      const locationStatsQuery = `
        SELECT 
          supplier_location || '-' || delivery_location as route,
          COUNT(*) as order_count,
          SUM(cost) as total_cost,
          AVG((fulfilled_items::float / total_items) * 100) as avg_fulfillment_rate,
          COUNT(CASE WHEN is_delayed THEN 1 END) as delayed_orders
        FROM 
          purchase_orders
        GROUP BY 
          route
        ORDER BY 
          order_count DESC
      `;
      
      const locationStatsResult = await pool.query(locationStatsQuery);
      
      // Get priority statistics
      const priorityStatsQuery = `
        SELECT 
          priority,
          COUNT(*) as order_count,
          SUM(cost) as total_cost,
          AVG((fulfilled_items::float / total_items) * 100) as avg_fulfillment_rate
        FROM 
          purchase_orders
        GROUP BY 
          priority
        ORDER BY 
          total_cost DESC
      `;
      
      const priorityStatsResult = await pool.query(priorityStatsQuery);
      
      return {
        overall: {
          totalOrders: parseInt(overallStats.total_orders),
          totalCost: parseFloat(overallStats.total_cost),
          avgFulfillmentRate: parseFloat(overallStats.avg_fulfillment_rate),
          delayedOrders: parseInt(overallStats.delayed_orders),
          onTimePerformance: (1 - (overallStats.delayed_orders / overallStats.total_orders)) * 100
        },
        supplierStats: supplierStatsResult.rows.map(row => ({
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          orderCount: parseInt(row.order_count),
          totalCost: parseFloat(row.total_cost),
          avgFulfillmentRate: parseFloat(row.avg_fulfillment_rate),
          delayedOrders: parseInt(row.delayed_orders),
          year: parseInt(row.year),
          month: parseInt(row.month)
        })),
        locationStats: locationStatsResult.rows.map(row => ({
          route: row.route,
          orderCount: parseInt(row.order_count),
          totalCost: parseFloat(row.total_cost),
          avgFulfillmentRate: parseFloat(row.avg_fulfillment_rate),
          delayedOrders: parseInt(row.delayed_orders)
        })),
        priorityStats: priorityStatsResult.rows.map(row => ({
          priority: row.priority,
          orderCount: parseInt(row.order_count),
          totalCost: parseFloat(row.total_cost),
          avgFulfillmentRate: parseFloat(row.avg_fulfillment_rate)
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
        SELECT DISTINCT EXTRACT(YEAR FROM order_date) as year
        FROM purchase_orders
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

export default supplierModel;

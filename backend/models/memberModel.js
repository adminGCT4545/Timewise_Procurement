// Get the global PostgreSQL pool
//import pool from '../src/server.js';

const memberModel = {
  /**
   * Get all members from the timewise_procurement database
   * @returns {Promise<Array>} Array of member objects
   */
  getAllMembers: async () => {
    try {
      const query = `
        SELECT 
          member_id,
          first_name,
          last_name,
          email,
          phone,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          membership_type,
          join_date,
          expiration_date,
          status,
          points,
          last_login,
          referral_source,
          referred_by,
          is_primary_account,
          primary_account_id,
          birthdate,
          email_opt_in,
          sms_opt_in,
          notes,
          created_at,
          updated_at
        FROM 
          test2.members
        ORDER BY 
          last_name, first_name
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  },

  /**
   * Get member status summary
   * @returns {Promise<Array>} Array of status summary objects
   */
  getMemberStatusSummary: async () => {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as member_count,
          SUM(points) as total_points
        FROM 
          test2.members
        GROUP BY 
          status
        ORDER BY 
          status
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching member status summary:', error);
      throw error;
    }
  },

  /**
   * Get membership type summary
   * @returns {Promise<Array>} Array of membership type summary objects
   */
  getMembershipTypeSummary: async () => {
    try {
      const query = `
        SELECT 
          m.membership_type,
          mt.monthly_fee,
          mt.annual_fee,
          COUNT(*) as member_count,
          SUM(m.points) as total_points
        FROM 
          test2.members m
        JOIN 
          test2.membership_types mt ON m.membership_type = mt.type_name
        GROUP BY 
          m.membership_type, mt.monthly_fee, mt.annual_fee
        ORDER BY 
          m.membership_type
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching membership type summary:', error);
      throw error;
    }
  },

  /**
   * Get expiring memberships
   * @param {number} days Number of days to look ahead
   * @returns {Promise<Array>} Array of expiring membership objects
   */
  getExpiringMemberships: async (days = 30) => {
    try {
      const query = `
        SELECT 
          member_id,
          first_name,
          last_name,
          email,
          phone,
          membership_type,
          join_date,
          expiration_date,
          status,
          (expiration_date - CURRENT_DATE) AS days_remaining
        FROM 
          test2.members
        WHERE 
          status = 'active' 
          AND expiration_date < (CURRENT_DATE + INTERVAL '${days} days')
        ORDER BY 
          expiration_date ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching expiring memberships:', error);
      throw error;
    }
  },

  /**
   * Get member engagement metrics
   * @returns {Promise<Array>} Array of member engagement objects
   */
  getMemberEngagement: async () => {
    try {
      // Use the member_engagement view defined in the schema
      const query = `
        SELECT * FROM test2.member_engagement
        ORDER BY total_activities DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching member engagement:', error);
      throw error;
    }
  },

  /**
   * Get recent activities
   * @param {number} limit Number of activities to return
   * @returns {Promise<Array>} Array of activity objects
   */
  getRecentActivities: async (limit = 10) => {
    try {
      const query = `
        SELECT 
          a.log_id,
          a.member_id,
          m.first_name,
          m.last_name,
          a.activity_type,
          a.activity_date,
          a.points_earned,
          a.amount_spent,
          a.location,
          a.details
        FROM 
          test2.activity_log a
        JOIN 
          test2.members m ON a.member_id = m.member_id
        ORDER BY 
          a.activity_date DESC
        LIMIT $1
      `;
      
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }
};

export default memberModel;

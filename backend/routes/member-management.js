import express from 'express';
import memberModel from '../models/memberModel.js';
import pool from '../src/server.js';

const router = express.Router();

/**
 * @route GET /api/member-management/members
 * @desc Get all members
 * @access Public
 */
router.get('/members', async (req, res) => {
  try {
    const members = await memberModel.getAllMembers();
    res.json(members);
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /api/member-management/status-summary
 * @desc Get member status summary
 * @access Public
 */
router.get('/status-summary', async (req, res) => {
  try {
    const summary = await memberModel.getMemberStatusSummary();
    res.json(summary);
  } catch (err) {
    console.error('Error fetching member status summary:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /api/member-management/type-summary
 * @desc Get membership type summary
 * @access Public
 */
router.get('/type-summary', async (req, res) => {
  try {
    const summary = await memberModel.getMembershipTypeSummary();
    res.json(summary);
  } catch (err) {
    console.error('Error fetching membership type summary:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /api/member-management/expiring
 * @desc Get expiring memberships
 * @access Public
 */
router.get('/expiring', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const expiring = await memberModel.getExpiringMemberships(days);
    res.json(expiring);
  } catch (err) {
    console.error('Error fetching expiring memberships:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /api/member-management/engagement
 * @desc Get member engagement metrics
 * @access Public
 */
router.get('/engagement', async (req, res) => {
  try {
    const engagement = await memberModel.getMemberEngagement();
    res.json(engagement);
  } catch (err) {
    console.error('Error fetching member engagement:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /api/member-management/recent-activities
 * @desc Get recent member activities
 * @access Public
 */
router.get('/recent-activities', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const activities = await memberModel.getRecentActivities(limit);
    res.json(activities);
  } catch (err) {
    console.error('Error fetching recent activities:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

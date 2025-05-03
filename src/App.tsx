import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ProcurementSchedules from './components/ProcurementSchedules';
import InvoiceIntake from './components/InvoiceIntake';
import AutomatedOrders from './components/AutomatedOrders';
import SupplierManagement from './components/SupplierManagement';
import Layout from './components/Layout';
import './index.css';

// Import or create placeholder components for the additional pages
import Reports from './components/Reports';
import ErpModeling from './components/ErpModeling';
import InventoryManagement from './components/InventoryManagement';
import SystemLogs from './components/SystemLogs';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <Layout title="Dashboard - TimeWise Procurement">
            <Dashboard />
          </Layout>
        } />
        <Route path="/train-schedules" element={
          <Layout title="Procurement Schedules - TimeWise Procurement">
            <ProcurementSchedules />
          </Layout>
        } />
        <Route path="/ticket-sales" element={
          <Layout title="Invoice Intake - TimeWise Procurement">
            <InvoiceIntake />
          </Layout>
        } />
        <Route path="/automated-orders" element={
          <Layout title="Automated Orders - TimeWise Procurement">
            <AutomatedOrders />
          </Layout>
        } />
        <Route path="/train-fleet" element={
          <Layout title="Supplier Management - TimeWise Procurement">
            <SupplierManagement />
          </Layout>
        } />
        <Route path="/reports" element={
          <Layout title="Reports - TimeWise Procurement">
            <Reports />
          </Layout>
        } />
        <Route path="/erp-modeling" element={
          <Layout title="ERP Modeling - TimeWise Procurement">
            <ErpModeling />
          </Layout>
        } />
        <Route path="/passengers" element={
          <Layout title="Membership Management - TimeWise Procurement">
            <InventoryManagement />
          </Layout>
        } />
        <Route path="/system-logs" element={
          <Layout title="System Logs - TimeWise Procurement">
            <SystemLogs />
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;

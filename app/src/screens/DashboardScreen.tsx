import React from "react";
import Dashboard from "../components/Dashboard";
import DashboardItem from "../components/DashboardItem";
import { useAutoSync } from "../hooks/useAutoSync";

const DashboardScreen: React.FC = () => {
  // Enable auto-sync when this screen loads
  useAutoSync("dashboard");

  return (
    <Dashboard>
      <DashboardItem title="Shopping Lists">
        Manage your shopping lists and organize items by categories.
      </DashboardItem>
      <DashboardItem title="Recent Items">
        Quick access to your most recently added items.
      </DashboardItem>
      <DashboardItem title="Categories">
        Browse and manage your shopping categories like groceries, household,
        etc.
      </DashboardItem>
      <DashboardItem title="Settings">
        Customize your app preferences and shopping list settings.
      </DashboardItem>
    </Dashboard>
  );
};

export default DashboardScreen;

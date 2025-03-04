import React, { useState } from 'react'
import AdminTabs from '../components/AdminTabs'
import MainRoles from '../components/MainRoles'
import SchedulePlan from '../components/SchedulePlan'
import Expected from '../pages/Expected'

const SystemSettingsPage = () => {
  const [activeTab, setActiveTab] = useState("roles")

  const getTabContent = () => {
    switch (activeTab) {
      case "roles":
        return <MainRoles />
      case "schedule":
        return <SchedulePlan />
      case "activities":
        return <Expected />
      default:
        return null
    }
  }

  return (
    <>
      <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {getTabContent()}
      </div>
    </>
  )
}

export default SystemSettingsPage
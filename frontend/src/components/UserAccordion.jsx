import React, { useState, useEffect } from "react";
import axiosInstance from "../axiosInstance";
import { constructNow } from "date-fns";
const PORT = import.meta.env.VITE_PORT;

function UserAccordion({
  userPersonalData,
  getData,
  parentId,
  closeAccordion,
  index,
}) {
  const [userData, setUserData] = useState({ ...userPersonalData });
  const [roles, setRoles] = useState([]);
  const [changedUserData, setChangedUserData] = useState({});

  // const getRoles = async () => {
  //   try {
  //     const result = await axiosInstance.get("http://localhost:4000/admin/getRoles");
  //     setRoles(result.data.result);
  //   } catch (e) {
  //     console.error("Error retrieving roles:", e);
  //   }
  // };

  // useEffect(() => {
  //   getRoles();
  //   console.log("Mounted");
  // }, [parentId]);

  useEffect(() => {
    const getRoles = async () => {
      try {
        const result = await axiosInstance.get(`/admin/getRoles`);
        setRoles(result.data.result);
      } catch (e) {
        console.error("Error retrieving roles:", e);
      }
    };
    getRoles();
  }, [parentId]);

  useEffect(() => {
    setUserData({ ...userPersonalData });
    setChangedUserData({});
  }, [userPersonalData]);

  const handleInputChange = (e) => {
    const { value } = e.target;
    const columnName = e.target.dataset.dbname;

    setUserData((prev) => ({ ...prev, [columnName]: value }));
    setChangedUserData((prev) => ({ ...prev, [columnName]: value }));
  };

  const handleRoleChange = (e) => {
    const selectedRoleId = parseInt(e.target.value, 10);
    const selectedRole = roles.find((role) => role.id === selectedRoleId);

    setUserData((prev) => ({
      ...prev,
      role_id: selectedRoleId,
      role_name: selectedRole?.name || "",
    }));

    setChangedUserData((prev) => ({ ...prev, role_id: selectedRoleId }));
  };

  const handleSave = async () => {
    if (Object.keys(changedUserData).length === 0) {
      alert("nothing to change");
      return;
    }
    const selectedRole = roles.find((role) => role.id === userData.role_id);
    const isRolePMOorDeputy = ["PMO", "DEPUTY"].includes(selectedRole?.name);
    const wasAlreadyPMOorDeputy = ["PMO", "DEPUTY"].includes(
      userPersonalData.role_name
    );

    console.log(JSON.stringify(selectedRole) + "selected Role");
    console.log(isRolePMOorDeputy + "IS rOLE pmo or deputy");
    console.log(wasAlreadyPMOorDeputy + "WAS ALREAST PMO OR DEPUTY");

    if (isRolePMOorDeputy) {
      // Check if the selected role is already at capacity
      if (
        selectedRole.user_count >= 1 &&
        !(
          wasAlreadyPMOorDeputy &&
          userPersonalData.role_name === selectedRole.name
        )
      ) {
        alert(`Only one ${selectedRole.name} is allowed in the system`);
        return;
      }
    }

    try {
      await axiosInstance.post(`/admin/updateUser`, {
        id: userData.id,
        data: changedUserData,
      });

      // Refresh roles and user data after successful update
      // getData();
      // setOpenAccordion(openAccordion === index ? null : index);
      closeAccordion(index);
      setChangedUserData((prev) => {});
      setUserData((prev) => {
        return { ...userPersonalData };
      });
      //await getRoles();
      getData();
      // setUserData({ ...userPersonalData });
      alert("User updated successfully!");
    } catch (e) {
      console.error("Error updating user:", e);
      alert("Error updating user. Please check the console for details.");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 w-full border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <label htmlFor="englishName" className="text-gray-700 dark:text-gray-300">First Name In English</label>
          <input
            name="englishName"
            type="text"
            data-dbname="first_name"
            value={userData.first_name || ""}
            onChange={handleInputChange}
            placeholder="Field 1"
            className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
        <div>
          <label htmlFor="arabicFirstName" className="text-gray-700 dark:text-gray-300">الاسم الأول للمستخدم بالعربي</label>
          <input
            name="arabicFirstName"
            data-dbname="arabic_first_name"
            value={userData.arabic_first_name || ""}
            onChange={handleInputChange}
            type="text"
            placeholder="Field 1"
            className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        </div>
        <div>
          <label htmlFor="email">Email Address</label>
          <input
            name="email"
            data-dbname="email"
            value={userData.email || ""}
            onChange={handleInputChange}
            type="email"
            placeholder="Field 1"
            className="p-2 border rounded w-full"
          />
        </div>
        <div>
          <label htmlFor="familyName">Family Name In English</label>
          <input
            name="familyName"
            data-dbname="family_name"
            value={userData.family_name || ""}
            onChange={handleInputChange}
            type="text"
            placeholder="Field 1"
            className="p-2 border rounded w-full"
          />
        </div>
        <div>
          <label htmlFor="arabicFamilyName">اسم العائلة للمستخدم بالعربي</label>
          <input
            name="arabicFamilyName"
            data-dbname="arabic_family_name"
            value={userData.arabic_family_name || ""}
            onChange={handleInputChange}
            type="text"
            placeholder="Field 1"
            className="p-2 border rounded w-full"
          />
        </div>

        <div>
          <label htmlFor="role" className="text-gray-700 dark:text-gray-300">Role</label>
          <select
            name="role"
            value={userData.role_id || ""}
            onChange={handleRoleChange}
            className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            {roles.map((role) => (
              <option
                key={role.id}
                value={role.id}
                disabled={
                  ["PMO", "DEPUTY"].includes(role.name) &&
                  role.user_count >= 1 &&
                  !(userData.role_id === role.id)
                }
                className="bg-white dark:bg-gray-700"
              >
                {role.name} ({role.user_count} users)
              </option>
            ))}
            <option value="" className="bg-white dark:bg-gray-700">Select a role</option>
          </select>
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            name="password"
            data-dbname="password"
            value={userData.password || ""}
            onChange={handleInputChange}
            type="password"
            placeholder="Field 1"
            className="p-2 border rounded w-full"
          />
        </div>
        <div>
          <label htmlFor="password">Re-write Password</label>
          <input
            name="password"
            data-dbname="password"
            value={userData.password || ""}
            type="password"
            placeholder="Field 1"
            className="p-2 border rounded w-full"
          />
        </div>

        {/* Remaining input fields */}
        {/* ... */}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          className="bg-blue-500 dark:bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default UserAccordion;

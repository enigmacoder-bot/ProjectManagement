import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axiosInstance from "../axiosInstance";
import { toast } from "sonner";
const AddUserModal = ({ isOpen, onClose, refreshUsers }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const result = await axiosInstance.get("/admin/getRoles");
        setRoles(result.data.result);
      } catch (e) {
        console.error("Error retrieving roles:", e);
      }
    };
    if (isOpen) fetchRoles();
  }, [isOpen]);

  const onSubmit = async (data) => {
    try {
      await axiosInstance.post("/admin/addUser", data);
      toast.success("User added successfully!");
      refreshUsers();
      reset();
      onClose();
    } catch (e) {
      console.error("Error adding user:", e);
      toast.error("Error adding user. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 dark:bg-gray-900 dark:text-white">
        <h2 className="text-xl font-bold mb-4">Add New User</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-sm font-medium">First Name</label>
            <input
              {...register("first_name", {
                required: "First name is required",
              })}
              className="p-2 border rounded w-full"
              placeholder="First Name"
            />
            {errors.first_name && (
              <p className="text-red-500 text-xs">
                {errors.first_name.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">Family Name</label>
            <input
              {...register("family_name", {
                required: "Family name is required",
              })}
              className="p-2 border rounded w-full"
              placeholder="Family Name"
            />
            {errors.family_name && (
              <p className="text-red-500 text-xs">
                {errors.family_name.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">
              Arabic First Name
            </label>
            <input
              {...register("arabic_first_name")}
              className="p-2 border rounded w-full"
              placeholder="Arabic First Name"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">
              Arabic Family Name
            </label>
            <input
              {...register("arabic_family_name")}
              className="p-2 border rounded w-full"
              placeholder="Arabic Family Name"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">Email</label>
            <input
              {...register("email", { required: "Email is required" })}
              type="email"
              className="p-2 border rounded w-full"
              placeholder="Email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs">{errors.email.message}</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">Password</label>
            <input
              {...register("password", { required: "Password is required" })}
              type="password"
              className="p-2 border rounded w-full"
              placeholder="Password"
            />
            {errors.password && (
              <p className="text-red-500 text-xs">{errors.password.message}</p>
            )}
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;

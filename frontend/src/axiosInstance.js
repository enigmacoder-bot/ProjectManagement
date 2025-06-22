import axios from "axios";
// const PORT = import.meta.env.VITE_PORT;
const axiosInstance = axios.create({
  baseURL: `https://projectmanagement-naje.onrender.com`, // Add your base URL here
  //baseURL: `http://localhost:4001`,
  //  timeout: 10000, // Optional: Request timeout (in ms)
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;

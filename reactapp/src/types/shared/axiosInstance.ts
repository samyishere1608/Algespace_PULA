import Axios, { AxiosInstance } from "axios";

const axiosInstance: AxiosInstance = Axios.create({
    baseURL: "http://localhost:7273",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": `${import.meta.env.VITE_API_KEY}`
    }
});

export default axiosInstance;

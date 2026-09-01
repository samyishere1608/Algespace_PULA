import Axios, { AxiosInstance } from "axios";

// Production backend requires the X-API-Key header on every request.
// Apply it globally so direct axios calls (goal logging, reflection, etc.)
// are authenticated too — not just this instance.
const apiKey = import.meta.env.VITE_API_KEY;
if (apiKey) {
    Axios.defaults.headers.common["X-API-Key"] = apiKey;
}

const axiosInstance: AxiosInstance = Axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": `${import.meta.env.VITE_API_KEY}`
    }
});

export default axiosInstance;

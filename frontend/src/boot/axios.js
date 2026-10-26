import axios from "axios";

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)

let hostName = window.location.hostname;
let protocol = window.location.protocol;
let port = window.location.port;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.lockhart.in/snake-game/";

const api = axios.create({

    // baseURL: protocol + "//" + hostName + ":" + port + "/api",
    baseURL: API_BASE_URL,
    withCredentials: false,
    headers: {
        Accept: "application/json",
        "content-type": "application/json",
    },
});
export { api, API_BASE_URL };

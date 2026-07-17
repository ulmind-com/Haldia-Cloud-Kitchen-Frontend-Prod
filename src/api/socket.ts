import { io } from "socket.io-client";

const SOCKET_URL = "https://food-delivery-backend-173b.onrender.com";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

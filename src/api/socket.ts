import { io } from "socket.io-client";
import { API_URL } from "@/lib/config";

const SOCKET_URL = API_URL;

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

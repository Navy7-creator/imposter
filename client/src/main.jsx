import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

function createSocket() {
	const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
	const websocketUrl = serverUrl.replace(/^http/, 'ws') + '/ws';
	const eventListeners = new Map();
	const responseCallbacks = new Map();
	const pending = [];
	let nextId = 1;
	let websocket;

	const flush = () => {
		while (websocket?.readyState === WebSocket.OPEN && pending.length) {
			websocket.send(JSON.stringify(pending.shift()));
		}
	};

	return {
		connect() {
			if (websocket && websocket.readyState !== WebSocket.CLOSED) return;
			websocket = new WebSocket(websocketUrl);
			websocket.onopen = flush;
			websocket.onmessage = ({ data }) => {
				const message = JSON.parse(data);
				if (message.event) {
					eventListeners.get(message.event)?.forEach((listener) => listener(message.data));
				}
				if (message.response) {
					const callback = responseCallbacks.get(message.response.id);
					callback?.(message.response);
					responseCallbacks.delete(message.response.id);
				}
			};
		},
		emit(event, payload, callback) {
			const id = String(nextId++);
			responseCallbacks.set(id, callback);
			const message = { id, event, payload };
			if (websocket?.readyState === WebSocket.OPEN) websocket.send(JSON.stringify(message));
			else pending.push(message);
		},
		on(event, listener) {
			eventListeners.set(event, [...(eventListeners.get(event) || []), listener]);
		},
		off(event, listener) {
			const listeners = eventListeners.get(event) || [];
			eventListeners.set(event, listeners.filter((item) => item !== listener));
		},
		disconnect() {
			pending.length = 0;
			websocket?.close();
			websocket = undefined;
		},
		removeAllListeners() {
			eventListeners.clear();
		},
	};
}

const socket = createSocket();
createRoot(document.getElementById('root')).render(<StrictMode><App socket={socket} /></StrictMode>);

// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAgQlxOQl86VUuMKODvPsAJKK4Yubf4WiU",
  projectId: "liga-futbol-sca",
  messagingSenderId: "358837702042",
  appId: "1:358837702042:web:2672d9c3604dc881bc7e23"
});

const messaging = firebase.messaging();

// Maneja las notificaciones cuando la app está en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Notificación recibida en segundo plano:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
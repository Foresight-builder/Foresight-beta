"use client";

import React from "react";

const ServiceWorkerRegister: React.FC = () => {
  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered:", registration);
          })
          .catch((registrationError) => {
            console.log("Service Worker registration failed:", registrationError);
          });
      });
    }
  }, []);

  return null;
};

export default ServiceWorkerRegister;

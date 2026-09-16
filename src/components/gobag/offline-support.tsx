"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import styles from "./gobag.module.css";
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function OfflineSupport() {
  const [message, setMessage] = useState(
    "Save this checklist for access without an internet connection.",
  );
  const [busy, setBusy] = useState(false);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine);
    connectivity();
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    return () => {
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
    };
  }, []);
  const prepare = async () => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      setMessage(
        "Offline storage is not supported here. Print your checklist as a backup.",
      );
      return;
    }
    setBusy(true);
    setMessage("Saving the checklist and its files…");
    try {
      const scope =
        location.hostname === "gobag.creditcardchris.com" ? "/" : "/go-bag";
      const registration = await navigator.serviceWorker.register(
        "/gobag-sw.js",
        { scope },
      );
      await new Promise<void>((resolve, reject) => {
        if (registration.active) {
          resolve();
          return;
        }
        const worker = registration.installing ?? registration.waiting;
        if (!worker) {
          reject(new Error("No worker"));
          return;
        }
        const timeout = setTimeout(() => reject(new Error("Timed out")), 20000);
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            clearTimeout(timeout);
            resolve();
          } else if (worker.state === "redundant") {
            clearTimeout(timeout);
            reject(new Error("Install failed"));
          }
        });
      });
      const channel = new MessageChannel();
      const ok = await new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          channel.port1.close();
          reject(new Error("Timed out"));
        }, 45000);
        channel.port1.onmessage = (e) => {
          clearTimeout(timeout);
          channel.port1.close();
          resolve(e.data.ok === true);
        };
        const assets = performance
          .getEntriesByType("resource")
          .map((r) => r.name);
        registration.active!.postMessage({ type: "PREPARE_OFFLINE", assets }, [
          channel.port2,
        ]);
      });
      setMessage(
        ok
          ? "Saved for offline use on this device. Your checklist and plan are available after reopening."
          : "Could not save every file. Stay online and try again, or print a copy.",
      );
    } catch {
      setMessage(
        "Offline storage could not be prepared. Try again online, or print your checklist.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={styles.planningPanel} aria-labelledby="offline-title">
      <div className={styles.panelHeading}>
        <Download size={22} />
        <h3 id="offline-title">Take your checklist with you</h3>
      </div>
      <p role="status">
        {online
          ? message
          : "You’re offline. Saved checklist changes stay on this device; shopping and source links need internet."}
      </p>
      <div className={styles.offlineActions}>
        <button
          className={styles.secondary}
          disabled={busy || !online}
          onClick={prepare}
        >
          {busy ? "Saving…" : "Save for offline use"}
        </button>
        {install && (
          <button
            className={styles.secondary}
            onClick={async () => {
              await install.prompt();
              await install.userChoice;
              setInstall(null);
            }}
          >
            Install GoBag
          </button>
        )}
      </div>
      <p className={styles.smallNote}>
        To install manually, use your browser’s install option, or Safari’s
        Share → Add to Home Screen. Save offline first. Refresh your offline
        copy after site updates. Clearing browser storage removes your checklist
        and offline files.
      </p>
    </section>
  );
}

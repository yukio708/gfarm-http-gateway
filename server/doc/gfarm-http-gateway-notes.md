# gfarm-http-gateway Implementation Notes

This document records design considerations for **gfarm-http-gateway**.

---

## api

* **`/gfptar`: use temp access token file**
  * Store access token in a temporary file and set its path in `JWT_USER_PATH`.
  * Update the file to refresh the token during long execution.
  * Delete after execution; clear temp directory on startup.

* **`/zip`: stream archive download**
  * Provide multiple files/directories as a single archive.
  * Use a custom ZipStreamWriter to build entries on-the-fly.
  * Avoid temp archive; keep memory usage low.
  * Return response immediately so client can start download.

* **`/copy`: stream file copy with progress**
  * Run `gfexport` -> `gfreg` -> `gfmv` pipeline as subprocesses to copy files inside Gfarm.  
  * Send progress updates to the client via `StreamingResponse` in JSON format.  

---

## frontend/app/react-app

* **utils: separation of logic and UI**
  * API request handling lives in `utils` modules (`.js` files, not JSX).
  * Display components focus solely on rendering.

* **components: one component per file**
  * Prefer one component per file for clarity and maintenance.
  * Allow exceptions when grouping closely related parts improves readability (e.g., `FileActionMenu.jsx`).

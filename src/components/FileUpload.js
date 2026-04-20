// "use client";
// import { useState, useRef } from "react";
// import styles from "./FileUpload.module.css";

// export default function FileUpload({ onFileSelect, onUpload, loading }) {
//     const [dragActive, setDragActive] = useState(false);
//     const [selectedFile, setSelectedFile] = useState(null);
//     const inputRef = useRef(null);

//     const handleDrag = (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         if (e.type === "dragenter" || e.type === "dragover") {
//             setDragActive(true);
//         } else if (e.type === "dragleave") {
//             setDragActive(false);
//         }
//     };

//     const handleDrop = (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         setDragActive(false);
//         const file = e.dataTransfer.files?.[0];
//         if (file && isValidFile(file)) {
//             setSelectedFile(file);
//             onFileSelect?.(file);
//         }
//     };

//     const handleFileChange = (e) => {
//         const file = e.target.files?.[0];
//         if (file && isValidFile(file)) {
//             setSelectedFile(file);
//             onFileSelect?.(file);
//         }
//     };

//     const isValidFile = (file) => {
//         const validTypes = [
//             "text/csv",
//             "application/vnd.ms-excel",
//             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//         ];
//         const validExtensions = [".csv", ".xlsx", ".xls"];
//         return (
//             validTypes.includes(file.type) ||
//             validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
//         );
//     };

//     const removeFile = (e) => {
//         e.stopPropagation();
//         setSelectedFile(null);
//         onFileSelect?.(null);
//         if (inputRef.current) inputRef.current.value = "";
//     };

//     const handleUpload = (e) => {
//         e.stopPropagation();
//         if (selectedFile && onUpload) {
//             onUpload(selectedFile);
//         }
//     };

//     return (
//         <div
//             className={`${styles.uploadZone} ${dragActive ? styles.uploadZoneActive : ""}`}
//             onDragEnter={handleDrag}
//             onDragLeave={handleDrag}
//             onDragOver={handleDrag}
//             onDrop={handleDrop}
//             onClick={() => inputRef.current?.click()}
//         >
//             <input
//                 ref={inputRef}
//                 className={styles.uploadInput}
//                 type="file"
//                 accept=".csv,.xlsx,.xls"
//                 onChange={handleFileChange}
//             />

//             <div className={styles.uploadIcon}>
//                 <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                     <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
//                     <polyline points="17 8 12 3 7 8" />
//                     <line x1="12" y1="3" x2="12" y2="15" />
//                 </svg>
//             </div>

//             <p className={styles.uploadTitle}>
//                 Drag & drop your <span className={styles.uploadTitleAccent}>auction list</span> here
//             </p>
//             <p className={styles.uploadSubtitle}>
//                 Supports CSV and Excel files (.csv, .xlsx, .xls) &middot; Must contain an &quot;APN&quot; column
//             </p>

//             {selectedFile && (
//                 <div className={styles.fileInfo}>
//                     <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                         <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
//                         <polyline points="14 2 14 8 20 8" />
//                     </svg>
//                     <span className={styles.fileName}>{selectedFile.name}</span>
//                     <button className={styles.removeBtn} onClick={removeFile}>
//                         ✕
//                     </button>
//                 </div>
//             )}

//             {selectedFile && (
//                 <div className={styles.uploadActions}>
//                     <button
//                         className="btn btn-primary"
//                         onClick={handleUpload}
//                         disabled={loading}
//                         style={{ marginTop: 8 }}
//                     >
//                         {loading ? "Processing..." : "Upload & Analyze"}
//                         {!loading && (
//                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                                 <path d="M5 12h14M12 5l7 7-7 7" />
//                             </svg>
//                         )}
//                     </button>
//                 </div>
//             )}
//         </div>
//     );
// }

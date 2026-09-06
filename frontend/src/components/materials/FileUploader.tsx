import React, { useRef } from "react";
import { UploadCloud, FileIcon, Trash2 } from "lucide-react";

interface FileUploaderProps {
  existingAttachments: any[];
  newAttachments: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveExisting: (id: number, idx: number) => void;
  onRemoveNew: (idx: number) => void;
  accept?: string;
  helpText?: string;
  multiple?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  existingAttachments,
  newAttachments,
  onAddFiles,
  onRemoveExisting,
  onRemoveNew,
  accept = "image/*,application/pdf",
  helpText = "Supported formats: PDF, JPG, PNG (Max 10MB each)",
  multiple = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
  };

  return (
    <div>
      <div 
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          height: "100px",
          width: "100%",
          border: "1.5px dashed #8BB8FF",
          borderRadius: "10px",
          backgroundColor: "#F8FBFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e:any) => e.currentTarget.style.backgroundColor = "#EEF4FB"}
        onMouseLeave={(e:any) => e.currentTarget.style.backgroundColor = "#F8FBFF"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <UploadCloud size={20} color="#126BFF" />
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#234A7A" }}>
            Drag and drop files here
          </span>
        </div>
        <span style={{ fontSize: "13px", color: "#5D78A3", marginTop: "4px" }}>
          or click to browse
        </span>
        <input 
          type="file" 
          multiple={multiple}
          accept={accept} 
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
      <div style={{ fontSize: "12px", color: "#5D78A3", marginTop: "7px" }}>
        {helpText}
      </div>

      {(existingAttachments.length > 0 || newAttachments.length > 0) && (
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {existingAttachments.map((att, idx) => (
            <div key={`exist-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E4ECF6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileIcon size={16} color="#5D78A3" />
                <span style={{ fontSize: "13px", color: "#0B1F3A", fontWeight: "500" }}>{att.file.split("/").pop()}</span>
              </div>
              <button onClick={() => onRemoveExisting(att.id, idx)} style={{ color: "#FF4054", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", borderRadius: "6px" }} title="Remove Attachment"><Trash2 size={16}/></button>
            </div>
          ))}
          {newAttachments.map((file, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E4ECF6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileIcon size={16} color="#5D78A3" />
                <span style={{ fontSize: "13px", color: "#0B1F3A", fontWeight: "500" }}>{file.name}</span>
              </div>
              <button onClick={() => onRemoveNew(idx)} style={{ color: "#FF4054", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px", borderRadius: "6px" }} title="Remove Attachment"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;

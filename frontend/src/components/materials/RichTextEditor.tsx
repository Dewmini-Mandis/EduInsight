import React, { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  maxLength?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Write the summary, notes, or theory here...",
  maxLength = 5000
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [currentBlock, setCurrentBlock] = useState<string>("p");

  useEffect(() => {
    // Sync external value to internal if it changes from outside (e.g., initial load)
    if (editorRef.current && editorRef.current.innerHTML !== value && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const checkFormats = () => {
    const formats = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
    const active: Record<string, boolean> = {};
    formats.forEach(format => {
      try {
        active[format] = document.queryCommandState(format);
      } catch (e) {
        active[format] = false;
      }
    });
    setActiveFormats(active);

    try {
      let block = document.queryCommandValue('formatBlock');
      if (block) {
        // Some browsers return "h1", others return "heading 1" or "<H1>"
        block = block.replace(/<|>/g, '').toLowerCase();
        if (block === "div") block = "p"; // Treat div as normal
        setCurrentBlock(block);
      } else {
        setCurrentBlock("p");
      }
    } catch (e) {
      setCurrentBlock("p");
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      checkFormats();
    }
  };

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
      checkFormats();
    }
  };

  const handleLink = () => {
    const url = prompt("Enter link URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const plainTextLength = value.replace(/<[^>]*>?/gm, '').length;

  const ToolbarButton = ({ icon: Icon, command, onClick }: any) => {
    const isActive = command ? activeFormats[command] : false;
    
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onClick ? onClick() : execCommand(command);
        }}
        style={{
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isActive ? "#EAF3FF" : "transparent",
          border: "none",
          borderRadius: "6px",
          color: isActive ? "#126BFF" : "#234A7A",
          cursor: "pointer",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e: any) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "#EAF3FF";
            e.currentTarget.style.color = "#126BFF";
          }
        }}
        onMouseLeave={(e: any) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#234A7A";
          }
        }}
      >
        <Icon size={16} strokeWidth={2.5} />
      </button>
    );
  };

  return (
    <div>
      <div style={{
        width: "100%",
        border: "1px solid #DCE6F3",
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "#FFFFFF"
      }}>
        <div style={{
          height: "44px",
          backgroundColor: "#F7FAFE",
          borderBottom: "1px solid #E3EBF5",
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: "4px"
        }}>
          <select 
            value={currentBlock}
            onChange={(e) => {
              execCommand("formatBlock", e.target.value);
            }}
            style={{
              height: "32px",
              padding: "0 8px",
              borderRadius: "6px",
              border: "1px solid #DCE6F3",
              backgroundColor: "#FFFFFF",
              color: "#234A7A",
              fontSize: "13px",
              fontWeight: "500",
              outline: "none",
              cursor: "pointer",
              marginRight: "4px"
            }}
          >
            <option value="p">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <div style={{ width: "1px", height: "20px", backgroundColor: "#DCE6F3", margin: "0 4px" }} />
          
          <ToolbarButton icon={Bold} command="bold" />
          <ToolbarButton icon={Italic} command="italic" />
          <ToolbarButton icon={Underline} command="underline" />
          <div style={{ width: "1px", height: "20px", backgroundColor: "#DCE6F3", margin: "0 4px" }} />
          <ToolbarButton icon={List} command="insertUnorderedList" />
          <ToolbarButton icon={ListOrdered} command="insertOrderedList" />
          <div style={{ width: "1px", height: "20px", backgroundColor: "#DCE6F3", margin: "0 4px" }} />
          <ToolbarButton icon={LinkIcon} onClick={handleLink} />
        </div>

        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          onKeyUp={checkFormats}
          onMouseUp={checkFormats}
          style={{
            minHeight: "200px",
            padding: "14px 16px",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "#0B1F3A",
            outline: "none",
            overflowY: "auto"
          }}
          data-placeholder={placeholder}
        />
        <style dangerouslySetInnerHTML={{__html: `
          div[contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #7A90AE;
            cursor: text;
          }
        `}} />
      </div>
      <div style={{
        textAlign: "right",
        fontSize: "12px",
        color: "#6F86A5",
        marginTop: "6px"
      }}>
        {plainTextLength} / {maxLength} characters
      </div>
    </div>
  );
};

export default RichTextEditor;

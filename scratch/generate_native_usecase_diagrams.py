import os
import xml.etree.ElementTree as ET
from xml.dom import minidom
import asyncio
from playwright.async_api import async_playwright

DIAGRAMS_DIR = r"C:\Users\dewmi\.gemini\antigravity-ide\brain\bb9be7a0-7c01-48ee-8627-1d1b4435b3d9\diagrams"
PREVIEWS_DIR = r"C:\Users\dewmi\.gemini\antigravity-ide\brain\bb9be7a0-7c01-48ee-8627-1d1b4435b3d9\diagrams\previews"
HTML_RENDER_DIR = r"C:\Users\dewmi\.gemini\antigravity-ide\brain\bb9be7a0-7c01-48ee-8627-1d1b4435b3d9\diagrams\html_render"

os.makedirs(DIAGRAMS_DIR, exist_ok=True)
os.makedirs(PREVIEWS_DIR, exist_ok=True)
os.makedirs(HTML_RENDER_DIR, exist_ok=True)

class DrawIoBuilder:
    def __init__(self, name, width=1200, height=850):
        self.name = name
        self.width = width
        self.height = height
        self.mxfile = ET.Element("mxfile", {
            "host": "Electron",
            "modified": "2026-10-03T20:58:00.000Z",
            "agent": "Mozilla/5.0",
            "version": "21.6.8",
            "type": "device"
        })
        self.diagram = ET.SubElement(self.mxfile, "diagram", {"id": "diagram_1", "name": name})
        self.model = ET.SubElement(self.diagram, "mxGraphModel", {
            "dx": "1200", "dy": "800", "grid": "1", "gridSize": "10",
            "guides": "1", "tooltips": "1", "connect": "1", "arrows": "1",
            "fold": "1", "page": "1", "pageScale": "1",
            "pageWidth": str(width), "pageHeight": str(height),
            "background": "#ffffff", "math": "0", "shadow": "0"
        })
        self.root = ET.SubElement(self.model, "root")
        
        ET.SubElement(self.root, "mxCell", {"id": "0"})
        ET.SubElement(self.root, "mxCell", {"id": "1", "parent": "0"})
        
        self.id_counter = 2
        self.nodes = {}
        self.edges = []
        self.title = ""
        self.boundary_info = None

    def next_id(self):
        cid = str(self.id_counter)
        self.id_counter += 1
        return cid

    def add_title(self, title_text, x=30, y=20, w=1140, h=40):
        self.title = title_text
        cell_id = self.next_id()
        style = "text;html=1;align=center;verticalAlign=middle;resizable=0;points=[];autosize=0;strokeColor=none;fillColor=none;fontSize=18;fontStyle=1;fontColor=#0f172a;fontFamily=Helvetica;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": f"<b>{title_text}</b>",
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x), "y": str(y), "width": str(w), "height": str(h), "as": "geometry"
        })
        return cell_id

    def add_boundary(self, label, x, y, w, h):
        self.boundary_info = {"label": label, "x": x, "y": y, "w": w, "h": h}
        cell_id = self.next_id()
        style = "shape=rect;html=1;whiteSpace=wrap;fillColor=#f8fafc;strokeColor=#1e3a8a;strokeWidth=2;align=center;verticalAlign=top;fontStyle=1;fontSize=14;fontColor=#1e3a8a;spacingTop=10;fontFamily=Helvetica;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": label,
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x), "y": str(y), "width": str(w), "height": str(h), "as": "geometry"
        })
        return cell_id

    def add_actor(self, label, x, y, w=60, h=90):
        cell_id = self.next_id()
        style = "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#e0f2fe;strokeColor=#0369a1;strokeWidth=1.5;fontColor=#0f172a;fontSize=12;fontStyle=1;fontFamily=Helvetica;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": label,
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x), "y": str(y), "width": str(w), "height": str(h), "as": "geometry"
        })
        self.nodes[cell_id] = {"type": "actor", "label": label, "x": x, "y": y, "w": w, "h": h}
        return cell_id

    def add_usecase(self, label, x, y, w=170, h=50, is_supporting=False):
        cell_id = self.next_id()
        if is_supporting:
            style = "ellipse;whiteSpace=wrap;html=1;fillColor=#f1f5f9;strokeColor=#475569;strokeWidth=1.5;fontColor=#334155;fontSize=11;align=center;verticalAlign=middle;fontFamily=Helvetica;"
        else:
            style = "ellipse;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#1d4ed8;strokeWidth=1.5;fontColor=#1e293b;fontSize=11;fontStyle=1;align=center;verticalAlign=middle;fontFamily=Helvetica;"
        
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": label,
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x), "y": str(y), "width": str(w), "height": str(h), "as": "geometry"
        })
        self.nodes[cell_id] = {"type": "usecase", "label": label, "x": x, "y": y, "w": w, "h": h, "is_supporting": is_supporting}
        return cell_id

    def add_note(self, label, x, y, w=220, h=70):
        cell_id = self.next_id()
        style = "shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#fffde7;strokeColor=#eab308;strokeWidth=1.5;fontColor=#713f12;fontSize=10;align=left;verticalAlign=top;spacingLeft=8;spacingRight=8;spacingTop=8;fontFamily=Helvetica;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": label.replace("\n", "<br/>"),
            "style": style,
            "vertex": "1",
            "parent": "1"
        })
        ET.SubElement(cell, "mxGeometry", {
            "x": str(x), "y": str(y), "width": str(w), "height": str(h), "as": "geometry"
        })
        self.nodes[cell_id] = {"type": "note", "label": label, "x": x, "y": y, "w": w, "h": h}
        return cell_id

    def add_association(self, source_id, target_id):
        cell_id = self.next_id()
        style = "endArrow=none;html=1;rounded=0;strokeColor=#334155;strokeWidth=1.5;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": "",
            "style": style,
            "edge": "1",
            "parent": "1",
            "source": source_id,
            "target": target_id
        })
        ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
        self.edges.append({"type": "assoc", "src": source_id, "tgt": target_id, "label": ""})
        return cell_id

    def add_include(self, base_id, included_id):
        cell_id = self.next_id()
        style = "endArrow=open;endSize=8;dashed=1;html=1;rounded=0;strokeColor=#2563eb;strokeWidth=1.5;fontColor=#1d4ed8;fontSize=10;fontStyle=1;fontFamily=Helvetica;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": "&lt;&lt;include&gt;&gt;",
            "style": style,
            "edge": "1",
            "parent": "1",
            "source": base_id,
            "target": included_id
        })
        ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
        self.edges.append({"type": "include", "src": base_id, "tgt": included_id, "label": "<<include>>"})
        return cell_id

    def add_extend(self, extension_id, base_id):
        cell_id = self.next_id()
        style = "endArrow=open;endSize=8;dashed=1;html=1;rounded=0;strokeColor=#0284c7;strokeWidth=1.5;fontColor=#0369a1;fontSize=10;fontStyle=1;fontFamily=Helvetica;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": "&lt;&lt;extend&gt;&gt;",
            "style": style,
            "edge": "1",
            "parent": "1",
            "source": extension_id,
            "target": base_id
        })
        ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
        self.edges.append({"type": "extend", "src": extension_id, "tgt": base_id, "label": "<<extend>>"})
        return cell_id

    def add_note_connector(self, note_id, target_id):
        cell_id = self.next_id()
        style = "endArrow=none;dashed=1;html=1;rounded=0;strokeColor=#ca8a04;strokeWidth=1;"
        cell = ET.SubElement(self.root, "mxCell", {
            "id": cell_id,
            "value": "",
            "style": style,
            "edge": "1",
            "parent": "1",
            "source": note_id,
            "target": target_id
        })
        ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
        self.edges.append({"type": "note_conn", "src": note_id, "tgt": target_id, "label": ""})
        return cell_id

    def save_xml(self, filepath):
        rough_string = ET.tostring(self.mxfile, 'utf-8')
        reparsed = minidom.parseString(rough_string)
        pretty_xml = reparsed.toprettyxml(indent="  ")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(pretty_xml)
        print(f"Saved Draw.io file: {filepath}")

    def generate_html_preview(self, html_path):
        svg_elements = []
        
        if self.boundary_info:
            b = self.boundary_info
            svg_elements.append(f'''
            <rect x="{b['x']}" y="{b['y']}" width="{b['w']}" height="{b['h']}" rx="8" ry="8" fill="#f8fafc" stroke="#1e3a8a" stroke-width="2.5"/>
            <text x="{b['x'] + b['w']/2}" y="{b['y'] + 26}" text-anchor="middle" fill="#1e3a8a" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="bold">{b['label']}</text>
            ''')
            
        if self.title:
            svg_elements.append(f'''
            <text x="{self.width/2}" y="36" text-anchor="middle" fill="#0f172a" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="bold">{self.title}</text>
            ''')

        centers = {}
        for nid, n in self.nodes.items():
            cx = n['x'] + n['w']/2
            cy = n['y'] + n['h']/2
            centers[nid] = (cx, cy)

        for e in self.edges:
            s_id = e['src']
            t_id = e['tgt']
            if s_id in centers and t_id in centers:
                x1, y1 = centers[s_id]
                x2, y2 = centers[t_id]
                etype = e['type']
                label = e['label']
                
                if etype == 'assoc':
                    svg_elements.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#334155" stroke-width="1.5" />')
                elif etype in ('include', 'extend'):
                    stroke_color = "#2563eb" if etype == 'include' else "#0284c7"
                    marker_id = f"arrow-{etype}"
                    svg_elements.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke_color}" stroke-width="1.5" stroke-dasharray="5,4" marker-end="url(#{marker_id})" />')
                    mx = (x1 + x2) / 2
                    my = (y1 + y2) / 2 - 6
                    svg_elements.append(f'<rect x="{mx-35}" y="{my-10}" width="70" height="16" fill="#ffffff" opacity="0.9" rx="3"/>')
                    svg_elements.append(f'<text x="{mx}" y="{my}" text-anchor="middle" fill="{stroke_color}" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold">{label}</text>')
                elif etype == 'note_conn':
                    svg_elements.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#ca8a04" stroke-width="1.2" stroke-dasharray="4,3" />')

        for nid, n in self.nodes.items():
            ntype = n['type']
            x, y, w, h = n['x'], n['y'], n['w'], n['h']
            label = n['label']

            if ntype == 'actor':
                head_r = 14
                head_cx = x + w/2
                head_cy = y + head_r + 4
                body_top = head_cy + head_r
                body_bot = y + h - 25
                leg_y = y + h - 5
                
                svg_elements.append(f'''
                <g class="actor">
                    <circle cx="{head_cx}" cy="{head_cy}" r="{head_r}" fill="#e0f2fe" stroke="#0369a1" stroke-width="1.8"/>
                    <line x1="{head_cx}" y1="{body_top}" x2="{head_cx}" y2="{body_bot}" stroke="#0369a1" stroke-width="1.8"/>
                    <line x1="{x+5}" y1="{body_top+12}" x2="{x+w-5}" y2="{body_top+12}" stroke="#0369a1" stroke-width="1.8"/>
                    <line x1="{head_cx}" y1="{body_bot}" x2="{x+10}" y2="{leg_y}" stroke="#0369a1" stroke-width="1.8"/>
                    <line x1="{head_cx}" y1="{body_bot}" x2="{x+w-10}" y2="{leg_y}" stroke="#0369a1" stroke-width="1.8"/>
                    <text x="{head_cx}" y="{leg_y + 16}" text-anchor="middle" fill="#0f172a" font-family="Helvetica, Arial, sans-serif" font-size="12" font-weight="bold">{label}</text>
                </g>
                ''')
            elif ntype == 'usecase':
                fill_col = "#f1f5f9" if n.get('is_supporting') else "#eff6ff"
                stroke_col = "#475569" if n.get('is_supporting') else "#1d4ed8"
                font_weight = "normal" if n.get('is_supporting') else "bold"
                
                lines = label.split('\n')
                if len(lines) == 1 and len(label) > 22:
                    words = label.split(' ')
                    half = len(words) // 2
                    lines = [' '.join(words[:half]), ' '.join(words[half:])]
                
                if len(lines) == 1:
                    text_tspans = f'<tspan x="{x + w/2}" y="{y + h/2 + 4}">{lines[0]}</tspan>'
                elif len(lines) == 2:
                    text_tspans = f'<tspan x="{x + w/2}" y="{y + h/2 - 3}">{lines[0]}</tspan><tspan x="{x + w/2}" y="{y + h/2 + 12}">{lines[1]}</tspan>'
                else:
                    text_tspans = f'<tspan x="{x + w/2}" y="{y + h/2 - 10}">{lines[0]}</tspan><tspan x="{x + w/2}" y="{y + h/2 + 4}">{lines[1]}</tspan><tspan x="{x + w/2}" y="{y + h/2 + 18}">{lines[2]}</tspan>'

                svg_elements.append(f'''
                <g class="usecase">
                    <ellipse cx="{x + w/2}" cy="{y + h/2}" rx="{w/2}" ry="{h/2}" fill="{fill_col}" stroke="{stroke_col}" stroke-width="1.6"/>
                    <text text-anchor="middle" fill="#1e293b" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="{font_weight}">
                        {text_tspans}
                    </text>
                </g>
                ''')
            elif ntype == 'note':
                lines = label.split('\n')
                tspans = []
                start_y = y + 18
                for idx, line in enumerate(lines):
                    tspans.append(f'<tspan x="{x + 10}" y="{start_y + idx*14}">{line}</tspan>')
                
                svg_elements.append(f'''
                <g class="note">
                    <polygon points="{x},{y} {x+w-12},{y} {x+w},{y+12} {x+w},{y+h} {x},{y+h}" fill="#fffde7" stroke="#eab308" stroke-width="1.5"/>
                    <polygon points="{x+w-12},{y} {x+w-12},{y+12} {x+w},{y+12}" fill="#fef08a" stroke="#eab308" stroke-width="1"/>
                    <text font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#713f12">
                        {"".join(tspans)}
                    </text>
                </g>
                ''')

        svg_content = f'''
        <svg xmlns="http://www.w3.org/2000/svg" width="{self.width}" height="{self.height}" viewBox="0 0 {self.width} {self.height}">
            <defs>
                <marker id="arrow-include" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9" fill="none" stroke="#2563eb" stroke-width="1.5"/>
                </marker>
                <marker id="arrow-extend" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9" fill="none" stroke="#0284c7" stroke-width="1.5"/>
                </marker>
            </defs>
            <rect width="100%" height="100%" fill="#ffffff"/>
            {"".join(svg_elements)}
        </svg>
        '''

        html_doc = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <style>
        body {{ margin: 0; padding: 0; background: #ffffff; display: flex; justify-content: center; align-items: center; }}
    </style>
</head>
<body>
    {svg_content}
</body>
</html>
'''
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_doc)
        print(f"Generated HTML preview file: {html_path}")

# ==========================================
# DIAGRAM 1: Overall Use Case Diagram
# ==========================================
def build_diagram_01():
    b = DrawIoBuilder("Overall Use Case Diagram", width=1220, height=1150)
    b.add_title("EduInsight Overall Use Case Diagram")
    b.add_boundary("EduInsight Platform Boundary", 230, 70, 720, 1040)

    # Actors
    admin = b.add_actor("System\nAdministrator", 50, 260)
    teacher = b.add_actor("Teacher", 50, 680)
    student = b.add_actor("Student", 990, 480)

    # Column 1 (Admin & Teacher Use Cases)
    uc_a1 = b.add_usecase("Authenticate / Log In", 260, 110, 175, 45)
    uc_a2 = b.add_usecase("Manage System Users", 260, 170, 175, 45)
    uc_a3 = b.add_usecase("Manage Schools & Classes", 260, 230, 175, 45)
    uc_a4 = b.add_usecase("Manage Academic Terms", 260, 290, 175, 45)
    uc_a5 = b.add_usecase("Manage Lessons & Skills", 260, 350, 175, 45)
    uc_a6 = b.add_usecase("Manage Account Status", 260, 410, 175, 45)
    uc_a7 = b.add_usecase("View System Dashboard", 260, 470, 175, 45)
    
    uc_t1 = b.add_usecase("Manage Assigned Students", 260, 540, 175, 45)
    uc_t2 = b.add_usecase("Create & Configure Quizzes", 260, 600, 175, 45)
    uc_t3 = b.add_usecase("Manage Question Bank", 260, 660, 175, 45)
    uc_t4 = b.add_usecase("Map Questions to Skills", 260, 720, 175, 45)
    uc_t5 = b.add_usecase("Manage & Map Materials", 260, 780, 175, 45)
    uc_t6 = b.add_usecase("View Student Performance", 260, 840, 175, 45)
    uc_t7 = b.add_usecase("View Risk Alerts", 260, 900, 175, 45)
    uc_t10 = b.add_usecase("View Reports / Analytics", 260, 960, 175, 45)

    # Column 2 (Student Use Cases & Remediation)
    uc_s1 = b.add_usecase("Select Academic Term", 490, 110, 175, 45)
    uc_s2 = b.add_usecase("View Lessons", 490, 170, 175, 45)
    uc_s3 = b.add_usecase("Study Learning Materials", 490, 230, 175, 45)
    uc_s4 = b.add_usecase("Attempt Ordinary Quiz", 490, 310, 185, 50)
    uc_s5 = b.add_usecase("Retake Quiz", 490, 390, 175, 45)
    uc_s6 = b.add_usecase("View Quiz Results & Guidance", 490, 450, 185, 48)
    uc_s7 = b.add_usecase("Complete Mandatory\nRemedial Materials", 490, 540, 195, 52)
    uc_s8 = b.add_usecase("Start Reassessment Quiz", 490, 640, 185, 50)
    uc_s9 = b.add_usecase("View Progress", 490, 730, 175, 45)
    
    uc_t8 = b.add_usecase("Review Student\nDiagnostic Evidence", 490, 810, 185, 50)
    uc_t9 = b.add_usecase("Record Teacher Intervention", 490, 890, 185, 50)

    # Column 3 (Supporting System Use Cases)
    uc_sup3 = b.add_usecase("Generate ML Risk Prediction", 730, 210, 185, 50, is_supporting=True)
    uc_sup1 = b.add_usecase("Record Interaction Metrics", 730, 310, 180, 50, is_supporting=True)
    uc_sup2 = b.add_usecase("Evaluate Attempt & Score", 730, 410, 180, 50, is_supporting=True)
    uc_sup4 = b.add_usecase("Identify Weak Skills &\nInitiate Remediation", 730, 510, 190, 55, is_supporting=True)
    uc_sup5 = b.add_usecase("Verify Material Completion", 730, 620, 180, 50, is_supporting=True)
    uc_sup6 = b.add_usecase("Escalate Failed Reassessment\nto Teacher", 730, 720, 190, 55, is_supporting=True)

    # Notes
    n1 = b.add_note("Condition:\nRequires at least 10 valid\nhistorical same-skill interactions.", 730, 130, 200, 60)
    n2 = b.add_note("Condition:\nFinal ordinary attempt failed and\nordinary attempts exhausted.", 730, 450, 200, 55)
    n3 = b.add_note("Condition:\nReassessment failed\n(score < Quiz.pass_mark).", 730, 790, 200, 55)
    n4 = b.add_note("Rule: All required remedial materials must\nbe completed before reassessment can begin.", 490, 970, 230, 55)

    # Associations
    # Admin
    b.add_association(admin, uc_a1)
    b.add_association(admin, uc_a2)
    b.add_association(admin, uc_a3)
    b.add_association(admin, uc_a4)
    b.add_association(admin, uc_a5)
    b.add_association(admin, uc_a6)
    b.add_association(admin, uc_a7)
    
    # Teacher
    b.add_association(teacher, uc_a1)
    b.add_association(teacher, uc_t1)
    b.add_association(teacher, uc_t2)
    b.add_association(teacher, uc_t3)
    b.add_association(teacher, uc_t4)
    b.add_association(teacher, uc_t5)
    b.add_association(teacher, uc_t6)
    b.add_association(teacher, uc_t7)
    b.add_association(teacher, uc_t8)
    b.add_association(teacher, uc_t9)
    b.add_association(teacher, uc_t10)

    # Student
    b.add_association(student, uc_a1)
    b.add_association(student, uc_s1)
    b.add_association(student, uc_s2)
    b.add_association(student, uc_s3)
    b.add_association(student, uc_s4)
    b.add_association(student, uc_s5)
    b.add_association(student, uc_s6)
    b.add_association(student, uc_s7)
    b.add_association(student, uc_s8)
    b.add_association(student, uc_s9)

    # Includes (Base -> Included)
    b.add_include(uc_s4, uc_sup1)
    b.add_include(uc_s4, uc_sup2)
    b.add_include(uc_s7, uc_sup5)
    b.add_include(uc_s8, uc_sup2)
    b.add_include(uc_t9, uc_t8)

    # Extends (Extension -> Base)
    e1 = b.add_extend(uc_sup3, uc_s4)
    e2 = b.add_extend(uc_sup4, uc_sup2)
    e3 = b.add_extend(uc_sup6, uc_sup2)

    # Note connectors
    b.add_note_connector(n1, e1)
    b.add_note_connector(n2, e2)
    b.add_note_connector(n3, e3)
    b.add_note_connector(n4, uc_s8)

    b.save_xml(os.path.join(DIAGRAMS_DIR, "01_overall_use_case.drawio"))
    b.generate_html_preview(os.path.join(HTML_RENDER_DIR, "01_overall_use_case.html"))

# ==========================================
# DIAGRAM 2: Admin & Academic Administration
# ==========================================
def build_diagram_02():
    b = DrawIoBuilder("User and Academic Administration Use Case Diagram", width=950, height=720)
    b.add_title("EduInsight – User and Academic Administration Use Case Diagram")
    b.add_boundary("User & Academic Administration Module", 200, 70, 680, 610)

    admin = b.add_actor("System\nAdministrator", 50, 310)

    uc_a1 = b.add_usecase("Authenticate / Log In", 240, 110, 180, 50)
    uc_a2 = b.add_usecase("Manage System Users", 240, 190, 180, 50)
    uc_a3 = b.add_usecase("Manage Teachers", 480, 160, 160, 48)
    uc_a4 = b.add_usecase("Manage Students", 480, 220, 160, 48)
    
    uc_a5 = b.add_usecase("Manage Schools & Classes", 240, 280, 185, 50)
    uc_a6 = b.add_usecase("Manage Academic Terms", 240, 360, 185, 50)
    uc_a7 = b.add_usecase("Manage Lessons", 240, 440, 180, 50)
    uc_a8 = b.add_usecase("Manage Skills", 480, 440, 160, 48)
    uc_a9 = b.add_usecase("Manage Account Status", 240, 520, 180, 50)
    uc_a10 = b.add_usecase("View Admin Dashboard", 240, 600, 180, 50)

    # Associations
    b.add_association(admin, uc_a1)
    b.add_association(admin, uc_a2)
    b.add_association(admin, uc_a5)
    b.add_association(admin, uc_a6)
    b.add_association(admin, uc_a7)
    b.add_association(admin, uc_a9)
    b.add_association(admin, uc_a10)

    # Includes
    b.add_include(uc_a2, uc_a3)
    b.add_include(uc_a2, uc_a4)
    b.add_include(uc_a7, uc_a8)

    b.save_xml(os.path.join(DIAGRAMS_DIR, "02_uc_admin_academic.drawio"))
    b.generate_html_preview(os.path.join(HTML_RENDER_DIR, "02_uc_admin_academic.html"))

# ==========================================
# DIAGRAM 3: Quiz & Assessment Management
# ==========================================
def build_diagram_03():
    b = DrawIoBuilder("Quiz and Assessment Management Use Case Diagram", width=980, height=720)
    b.add_title("EduInsight – Quiz and Assessment Management Use Case Diagram")
    b.add_boundary("Quiz & Assessment Management Module", 190, 70, 680, 610)

    teacher = b.add_actor("Teacher", 50, 230)
    student = b.add_actor("Student", 890, 480)

    # Teacher Use Cases
    uc_t1 = b.add_usecase("Authenticate", 230, 110, 170, 48)
    uc_t2 = b.add_usecase("Create Quiz", 230, 190, 170, 48)
    uc_t3 = b.add_usecase("Configure Pass Mark\n(Quiz.pass_mark)", 460, 160, 165, 48)
    uc_t4 = b.add_usecase("Configure Maximum\nAttempts (Quiz.max_attempts)", 460, 220, 185, 50)
    
    uc_t5 = b.add_usecase("Manage Question Bank", 230, 290, 170, 48)
    uc_t6 = b.add_usecase("Map Questions to Skills", 460, 290, 170, 48)
    uc_t7 = b.add_usecase("Publish / Make Quiz Available", 230, 370, 185, 50)

    # Student Use Cases
    uc_s1 = b.add_usecase("Start Ordinary Quiz", 230, 470, 170, 48)
    uc_s2 = b.add_usecase("Submit Quiz", 460, 470, 160, 48)
    uc_s3 = b.add_usecase("Retake Quiz", 230, 560, 160, 48)
    uc_s4 = b.add_usecase("View Quiz Result", 460, 560, 160, 48)

    # Supporting Use Cases
    uc_sup1 = b.add_usecase("Record Interaction Metrics", 670, 415, 175, 48, is_supporting=True)
    uc_sup2 = b.add_usecase("Evaluate Attempt & Score", 670, 515, 175, 48, is_supporting=True)

    # Note
    n1 = b.add_note("Rule:\nRetake Quiz is available only while\nordinary attempts remain\n(attempt_count < Quiz.max_attempts).", 230, 620, 230, 55)

    # Associations
    b.add_association(teacher, uc_t1)
    b.add_association(teacher, uc_t2)
    b.add_association(teacher, uc_t5)
    b.add_association(teacher, uc_t7)

    b.add_association(student, uc_s1)
    b.add_association(student, uc_s2)
    b.add_association(student, uc_s3)
    b.add_association(student, uc_s4)

    # Includes
    b.add_include(uc_t2, uc_t3)
    b.add_include(uc_t2, uc_t4)
    b.add_include(uc_t5, uc_t6)
    b.add_include(uc_s1, uc_sup1)
    b.add_include(uc_s2, uc_sup2)

    # Note connector
    b.add_note_connector(n1, uc_s3)

    b.save_xml(os.path.join(DIAGRAMS_DIR, "03_uc_quiz_assessment.drawio"))
    b.generate_html_preview(os.path.join(HTML_RENDER_DIR, "03_uc_quiz_assessment.html"))

# ==========================================
# DIAGRAM 4: Learning Material Management
# ==========================================
def build_diagram_04():
    b = DrawIoBuilder("Learning Material Management Use Case Diagram", width=950, height=680)
    b.add_title("EduInsight – Learning Material Management Use Case Diagram")
    b.add_boundary("Learning Material Management Module", 190, 70, 650, 570)

    teacher = b.add_actor("Teacher", 50, 270)
    student = b.add_actor("Student", 860, 420)

    # Teacher Use Cases
    uc_t1 = b.add_usecase("Authenticate", 230, 110, 170, 48)
    uc_t2 = b.add_usecase("Add Video Material", 230, 190, 170, 48)
    uc_t3 = b.add_usecase("Add Note / Document\nMaterial", 230, 260, 180, 50)
    uc_t4 = b.add_usecase("Map Material to Lesson", 470, 190, 170, 48)
    uc_t5 = b.add_usecase("Map Material to Skill", 470, 260, 170, 48)
    uc_t6 = b.add_usecase("Order Learning Materials", 230, 340, 180, 48)
    uc_t7 = b.add_usecase("Edit Learning Material", 230, 410, 180, 48)
    uc_t8 = b.add_usecase("Delete Learning Material", 230, 480, 180, 48)

    # Student Use Cases
    uc_s1 = b.add_usecase("View Learning Material", 470, 390, 175, 48)
    uc_s2 = b.add_usecase("Complete Learning Material", 470, 470, 185, 50)

    # Supporting
    uc_sup1 = b.add_usecase("Record Material Completion", 470, 550, 185, 50, is_supporting=True)

    # Associations
    b.add_association(teacher, uc_t1)
    b.add_association(teacher, uc_t2)
    b.add_association(teacher, uc_t3)
    b.add_association(teacher, uc_t6)
    b.add_association(teacher, uc_t7)
    b.add_association(teacher, uc_t8)

    b.add_association(student, uc_s1)
    b.add_association(student, uc_s2)

    # Includes
    b.add_include(uc_t2, uc_t4)
    b.add_include(uc_t2, uc_t5)
    b.add_include(uc_t3, uc_t4)
    b.add_include(uc_t3, uc_t5)
    b.add_include(uc_s2, uc_sup1)

    b.save_xml(os.path.join(DIAGRAMS_DIR, "04_uc_learning_materials.drawio"))
    b.generate_html_preview(os.path.join(HTML_RENDER_DIR, "04_uc_learning_materials.html"))

# ==========================================
# DIAGRAM 5: Risk Prediction & XAI
# ==========================================
def build_diagram_05():
    b = DrawIoBuilder("Risk Prediction and Explainability Use Case Diagram", width=1000, height=720)
    b.add_title("EduInsight – Risk Prediction and Explainability Use Case Diagram")
    b.add_boundary("Risk Prediction & Explainability Module", 210, 70, 680, 620)

    student = b.add_actor("Student", 50, 350)
    teacher = b.add_actor("Teacher", 50, 480)
    admin = b.add_actor("System\nAdministrator", 50, 590)

    # System / Automated Use Cases
    uc_sys3 = b.add_usecase("Generate ML Risk Prediction", 240, 200, 195, 52, is_supporting=True)
    uc_sys1 = b.add_usecase("Check Prediction Eligibility", 480, 120, 185, 48, is_supporting=True)
    uc_sys2 = b.add_usecase("Construct 15-Feature Vector", 480, 190, 185, 48, is_supporting=True)
    uc_sys4 = b.add_usecase("Generate SHAP Explanation", 480, 260, 185, 48, is_supporting=True)
    uc_sys5 = b.add_usecase("Store Risk Prediction", 480, 330, 175, 48, is_supporting=True)

    # Human Use Cases
    uc_s1 = b.add_usecase("View Supportive Learning\nGuidance", 240, 370, 195, 52)
    uc_ta1 = b.add_usecase("Review Risk Probability &\nSHAP Explanation", 240, 520, 210, 55)

    # Note
    n1 = b.add_note("Prediction Safeguard Rules:\n• Eligibility requires >= 10 valid historical same-skill interactions.\n• If < 10 interactions: return 'insufficient_history', no prediction created.\n• When eligible: extract 10 interactions, 15 features, Gradient Boosting,\n  threshold = 0.50, generate SHAP local explanation.\n• Note: Hint usage is not an ML predictor.", 480, 430, 360, 110)

    # Associations
    b.add_association(student, uc_s1)
    b.add_association(teacher, uc_ta1)
    b.add_association(admin, uc_ta1)

    # Includes
    b.add_include(uc_sys3, uc_sys1)
    b.add_include(uc_sys3, uc_sys2)
    b.add_include(uc_sys3, uc_sys4)
    b.add_include(uc_sys3, uc_sys5)

    # Note Connector
    b.add_note_connector(n1, uc_sys1)

    b.save_xml(os.path.join(DIAGRAMS_DIR, "05_uc_risk_xai.drawio"))
    b.generate_html_preview(os.path.join(HTML_RENDER_DIR, "05_uc_risk_xai.html"))

# ==========================================
# DIAGRAM 6: Adaptive Remediation & Reassessment
# ==========================================
def build_diagram_06():
    b = DrawIoBuilder("Adaptive Remediation and Reassessment Use Case Diagram", width=1020, height=720)
    b.add_title("EduInsight – Adaptive Remediation and Reassessment Use Case Diagram")
    b.add_boundary("Adaptive Remediation & Reassessment Module", 190, 70, 730, 620)

    student = b.add_actor("Student", 50, 320)
    teacher = b.add_actor("Teacher", 940, 510)

    uc1 = b.add_usecase("Exhaust Ordinary Attempts", 230, 120, 185, 48)
    uc2 = b.add_usecase("Identify Weak Skills", 460, 120, 175, 48)
    uc3 = b.add_usecase("Assign Mandatory\nRemedial Materials", 460, 200, 195, 52)
    
    uc4 = b.add_usecase("Complete Required\nMaterials", 230, 290, 185, 50)
    uc5 = b.add_usecase("Verify Material Completion", 460, 290, 180, 48, is_supporting=True)
    
    uc6 = b.add_usecase("Unlock Reassessment", 230, 380, 175, 48)
    uc7 = b.add_usecase("Attempt Reassessment", 230, 470, 175, 48)
    uc8 = b.add_usecase("Evaluate Reassessment", 460, 470, 175, 48, is_supporting=True)
    uc9 = b.add_usecase("Escalate Failed Reassessment\nto Teacher", 460, 560, 195, 52, is_supporting=True)
    
    uc10 = b.add_usecase("Review Diagnostic Evidence", 690, 560, 180, 48)
    uc11 = b.add_usecase("Record Teacher Intervention", 690, 470, 185, 52)

    # Notes
    n1 = b.add_note("Condition:\nStudent fails final allowed\nordinary attempt.", 460, 50, 190, 50)
    n2 = b.add_note("Condition:\nReassessment score < Quiz.pass_mark.", 690, 620, 210, 45)
    n3 = b.add_note("Rule: All required remedial materials must be completed\nbefore Start Reassessment is enabled.\nReassessment does not consume ordinary max_attempts.", 230, 560, 210, 70)

    # Associations
    b.add_association(student, uc4)
    b.add_association(student, uc7)
    b.add_association(teacher, uc10)
    b.add_association(teacher, uc11)

    # Includes
    b.add_include(uc3, uc2)
    b.add_include(uc4, uc5)
    b.add_include(uc6, uc5)
    b.add_include(uc7, uc8)
    b.add_include(uc11, uc10)

    # Extends
    e1 = b.add_extend(uc2, uc1)
    e2 = b.add_extend(uc9, uc8)

    # Note Connectors
    b.add_note_connector(n1, e1)
    b.add_note_connector(n2, e2)
    b.add_note_connector(n3, uc6)

    b.save_xml(os.path.join(DIAGRAMS_DIR, "06_uc_remediation_reassessment.drawio"))
    b.generate_html_preview(os.path.join(HTML_RENDER_DIR, "06_uc_remediation_reassessment.html"))

# ==========================================
# DIAGRAM 7: Analytics & Reporting
# ==========================================
def build_diagram_07():
    b = DrawIoBuilder("Analytics and Reporting Use Case Diagram", width=950, height=680)
    b.add_title("EduInsight – Analytics and Reporting Use Case Diagram")
    b.add_boundary("Analytics & Reporting Module", 190, 70, 650, 570)

    admin = b.add_actor("System\nAdministrator", 50, 170)
    teacher = b.add_actor("Teacher", 50, 430)
    student = b.add_actor("Student", 860, 310)

    # Admin
    uc_a1 = b.add_usecase("View System Dashboard", 230, 110, 175, 48)
    uc_a2 = b.add_usecase("View User / Access Overview", 230, 180, 185, 48)
    uc_a3 = b.add_usecase("View Admin Reports", 230, 250, 175, 48)

    # Teacher
    uc_t1 = b.add_usecase("View Class Performance", 230, 330, 175, 48)
    uc_t2 = b.add_usecase("View Student Performance", 230, 400, 175, 48)
    uc_t3 = b.add_usecase("View Risk Alerts", 230, 470, 175, 48)
    uc_t4 = b.add_usecase("View Weak Skills", 460, 400, 165, 48)
    uc_t5 = b.add_usecase("Review Diagnostic Evidence", 460, 470, 185, 48)
    uc_t6 = b.add_usecase("View Teacher Reports", 230, 540, 175, 48)

    # Student
    uc_s1 = b.add_usecase("View Progress", 460, 210, 165, 48)
    uc_s2 = b.add_usecase("View Quiz History", 460, 280, 165, 48)
    uc_s3 = b.add_usecase("View Learning Guidance", 460, 340, 175, 48)

    # Associations
    b.add_association(admin, uc_a1)
    b.add_association(admin, uc_a2)
    b.add_association(admin, uc_a3)

    b.add_association(teacher, uc_t1)
    b.add_association(teacher, uc_t2)
    b.add_association(teacher, uc_t3)
    b.add_association(teacher, uc_t4)
    b.add_association(teacher, uc_t5)
    b.add_association(teacher, uc_t6)

    b.add_association(student, uc_s1)
    b.add_association(student, uc_s2)
    b.add_association(student, uc_s3)

    b.save_xml(os.path.join(DIAGRAMS_DIR, "07_uc_analytics_reporting.drawio"))
    b.generate_html_preview(os.path.join(HTML_RENDER_DIR, "07_uc_analytics_reporting.html"))

# ==========================================
# PLAYWRIGHT PNG RENDERER
# ==========================================
async def render_previews():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1400, "height": 1300}, device_scale_factor=2)
        
        diagram_files = [
            ("01_overall_use_case.html", "01_overall_use_case.png"),
            ("02_uc_admin_academic.html", "02_uc_admin_academic.png"),
            ("03_uc_quiz_assessment.html", "03_uc_quiz_assessment.png"),
            ("04_uc_learning_materials.html", "04_uc_learning_materials.png"),
            ("05_uc_risk_xai.html", "05_uc_risk_xai.png"),
            ("06_uc_remediation_reassessment.html", "06_uc_remediation_reassessment.png"),
            ("07_uc_analytics_reporting.html", "07_uc_analytics_reporting.png")
        ]

        for html_name, png_name in diagram_files:
            html_path = os.path.join(HTML_RENDER_DIR, html_name)
            png_path = os.path.join(PREVIEWS_DIR, png_name)
            
            await page.goto(f"file:///{html_path}")
            await page.wait_for_timeout(300)
            
            svg_element = page.locator("svg")
            await svg_element.screenshot(path=png_path)
            print(f"Captured high-resolution preview: {png_path}")

        await browser.close()

if __name__ == "__main__":
    print("Building Draw.io XML files and HTML preview models...")
    build_diagram_01()
    build_diagram_02()
    build_diagram_03()
    build_diagram_04()
    build_diagram_05()
    build_diagram_06()
    build_diagram_07()

    print("\nRendering high-resolution PNG previews via Playwright...")
    asyncio.run(render_previews())
    print("\nAll 7 use case diagrams generated successfully!")

# 📊 BigQuery Release Pulse

A sleek, modern developer dashboard for monitoring, searching, filtering, and sharing Google BigQuery release notes. It features a responsive dark-themed glassmorphism UI and a smart Twitter (X) composition engine.

---

## ✨ Features

* **📡 Dynamic Atom Feed Parsing**: Automatically fetches, parses, and categories raw release note XML from the Google Cloud feed.
* **⚡ In-Memory Backend Caching**: Limits external network hits by caching feed data for 1 hour. Supports forced refreshing via the client UI.
* **🔍 Instant Local Search**: Runs instant full-text filtering over notes, bodies, and categories as you type.
* **🏷️ Category-Specific badges**: Beautifully highlights and isolates updates by types: **Features**, **Changes**, **Security**, and **Deprecations**.
* **🐦 Smart Tweet Composer Drawer**:
  * Strips complex HTML markup into plain text.
  * Translates relative paths to absolute Google Cloud URLs.
  * Formats inline `<code>` snippets into markdown backticks (\`code\`) for better readability on X.
  * Automatically calculates space constraints and truncates descriptions to guarantee the final post stays within X's **280-character** limit.
  * Provides an editable preview textarea to fine-tune drafts.
* **🎨 Premium Aesthetic**: Designed with a high-end dark slate glassmorphism theme, smooth micro-interactions, responsive sizing, and interactive selections.

---

## 🛠️ Tech Stack

* **Backend**: Python 3 (Flask)
* **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom Properties & Keyframe Animations)
* **Feed Parser**: XML ElementTree & RegEx (Standard Python Libraries)

---

## 📁 Project Structure

* [app.py](file:///Users/allie/agy-cli-projects/app.py) — Flask server, RSS feed parsing logic, caching layer, and data APIs.
* [templates/index.html](file:///Users/allie/agy-cli-projects/templates/index.html) — HTML layout containing structural templates and the composer drawer.
* [static/css/style.css](file:///Users/allie/agy-cli-projects/static/css/style.css) — Custom stylesheet defining visual components, layout tokens, and slide animations.
* [static/js/app.js](file:///Users/allie/agy-cli-projects/static/js/app.js) — Client state controller, keyword filters, and X intent formatting.
* [.gitignore](file:///Users/allie/agy-cli-projects/.gitignore) — Tells git to ignore temporary system files, pycache, and virtual environments.

---

## 🚀 Setup & Installation

### Prerequisites
* Python 3.3+
* Git (optional)

### 1. Clone or Open Project
Ensure your shell directory is positioned in the project root:
```bash
cd /Users/allie/agy-cli-projects
```

### 2. Set Up Virtual Environment & Install Flask
Initialize a local virtual environment to isolate project packages and run pip install:
```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install Flask dependency
pip install flask
```

### 3. Run the Development Server
```bash
python3 app.py
```

*Note: The app defaults to port **5001** to prevent conflicts with macOS AirPlay services which often occupy port 5000.*

### 4. Access the App
Open your browser and navigate to:
👉 **[http://localhost:5001](http://localhost:5001)**

---

## 💡 How the Tweet Intent Works

To prevent Twitter's Web Intent API from rejecting drafts due to length or invalid links, the client JavaScript formats raw HTML update templates:

1. **HTML Code Blocks**: Elements like `<code>BigQuery ML</code>` are formatted with markdown backticks to render on X as: \`BigQuery ML\`.
2. **Relative Links**: Swaps references like `<a href="/bigquery/docs...">Link</a>` into absolute paths like: `Link (https://cloud.google.com/bigquery/docs...)`.
3. **Character Truncation Calculation**:
   $$\text{Maximum Description Space} = 280 - \text{Prefix Length} - \text{Hashtag Length}$$
   If the description body exceeds this remaining space, the app slices it and appends `...` to ensure it is accepted by X's validator.

---

## 📄 License
This project is open-source and available under the MIT License.

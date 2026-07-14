import os
import re
import ssl
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Constants
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION_SECS = 3600  # 1 hour cache

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}

def parse_release_notes():
    """Fetches and parses the BigQuery release notes Atom feed."""
    context = ssl._create_unverified_context()
    
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, context=context, timeout=10) as response:
            xml_data = response.read()
    except Exception as e:
        print(f"Error fetching feed: {e}")
        raise RuntimeError(f"Failed to fetch BigQuery release notes feed: {e}")

    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        print(f"Error parsing XML: {e}")
        raise RuntimeError("Failed to parse the release notes feed XML")

    # Namespace dictionary for Atom feed
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    # Loop over all <entry> tags in the feed
    for entry_idx, entry in enumerate(root.findall('atom:entry', ns)):
        date_str = ""
        title_el = entry.find('atom:title', ns)
        if title_el is not None and title_el.text:
            date_str = title_el.text.strip()
            
        updated_str = ""
        updated_el = entry.find('atom:updated', ns)
        if updated_el is not None and updated_el.text:
            updated_str = updated_el.text.strip()
            
        id_str = ""
        id_el = entry.find('atom:id', ns)
        if id_el is not None and id_el.text:
            id_str = id_el.text.strip()
            
        content_el = entry.find('atom:content', ns)
        content_html = content_el.text.strip() if content_el is not None and content_el.text else ""
        
        # Split the HTML content into individual update blocks by <h3> elements
        # Google BQ release notes generally use:
        # <h3>Feature</h3>
        # <p>Description...</p>
        # <h3>Change</h3>
        # <p>Description...</p>
        parts = re.split(r'<h3>(.*?)</h3>', content_html)
        
        items = []
        if len(parts) == 1:
            # No <h3> tags found, treat the entire body as a single general update
            body = parts[0].strip()
            if body:
                items.append({
                    "id": f"item-{entry_idx}-0",
                    "category": "Update",
                    "body": body
                })
        else:
            # If there's text before the first <h3>
            if parts[0].strip():
                items.append({
                    "id": f"item-{entry_idx}-prefix",
                    "category": "Update",
                    "body": parts[0].strip()
                })
            
            # parts will contain:
            # parts[1] = Category (e.g. Feature)
            # parts[2] = Body text/HTML
            # parts[3] = Category...
            item_counter = 0
            for i in range(1, len(parts), 2):
                category = parts[i].strip()
                body = parts[i+1].strip() if i+1 < len(parts) else ""
                if category or body:
                    items.append({
                        "id": f"item-{entry_idx}-{item_counter}",
                        "category": category if category else "Update",
                        "body": body
                    })
                    item_counter += 1
                    
        entries.append({
            "id": f"entry-{entry_idx}",
            "date": date_str,
            "updated": updated_str,
            "raw_id": id_str,
            "items": items
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check if cache is valid
    if (force_refresh or 
        cache["data"] is None or 
        (current_time - cache["last_fetched"]) > CACHE_DURATION_SECS):
        
        try:
            print("Fetching fresh data from BigQuery feed...")
            parsed_data = parse_release_notes()
            cache["data"] = parsed_data
            cache["last_fetched"] = current_time
            cache_status = "miss"
        except Exception as e:
            # If fetch fails but we have cached data, fall back to it
            if cache["data"] is not None:
                print(f"Fetch failed: {e}. Falling back to cached data.")
                return jsonify({
                    "success": True,
                    "source": "cache_fallback",
                    "error": str(e),
                    "data": cache["data"],
                    "last_fetched": cache["last_fetched"]
                })
            else:
                return jsonify({
                    "success": False,
                    "error": str(e)
                }), 500
    else:
        cache_status = "hit"
        
    return jsonify({
        "success": True,
        "source": "cache" if cache_status == "hit" else "live",
        "data": cache["data"],
        "last_fetched": cache["last_fetched"]
    })

if __name__ == '__main__':
    # Get port from environment or default to 5001 to avoid default mac OS AirPlay port conflict (5000)
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=True)

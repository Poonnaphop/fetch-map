import folium
import webbrowser
import os

def create_google_maps(latitude, longitude, zoom_start=15):
    """
    Create Google Maps with multiple tile layers for the given coordinates.
    
    Args:
        latitude (float): Latitude coordinate
        longitude (float): Longitude coordinate
        zoom_start (int): Initial zoom level (default: 15)
    """
    
    print(f"Creating Google Maps for coordinates: {latitude}, {longitude}")
    
    # Create Google Maps with multiple tile layers
    google_map = folium.Map(
        location=[latitude, longitude], 
        zoom_start=zoom_start,
        tiles='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        attr='Google Maps'
    )
    
    # Add a marker at the specified location
    folium.Marker(
        [latitude, longitude],
        popup=f"Location: {latitude}, {longitude}",
        tooltip="Click for coordinates",
        icon=folium.Icon(color='red', icon='info-sign')
    ).add_to(google_map)
    
    # Add satellite view option
    folium.TileLayer(
        tiles='https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        attr='Google Satellite',
        name='🛰️ Satellite'
    ).add_to(google_map)
    
    # Add terrain view option
    folium.TileLayer(
        tiles='https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        attr='Google Terrain',
        name='🗺️ Terrain'
    ).add_to(google_map)
    
    # Add hybrid view option (satellite with labels)
    folium.TileLayer(
        tiles='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attr='Google Hybrid',
        name='🛰️ Hybrid (Satellite + Labels)'
    ).add_to(google_map)
    
    # Rename the default layer for clarity
    google_map.get_root().html.add_child(folium.Element(
        """
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Find the layer control and update the default layer name
            setTimeout(function() {
                var layerControl = document.querySelector('.leaflet-control-layers');
                if (layerControl) {
                    var labels = layerControl.querySelectorAll('label');
                    if (labels.length > 0) {
                        labels[0].textContent = '🗺️ Street View';
                    }
                }
            }, 1000);
        });
        </script>
        """
    ))
    
    # Add layer control with custom styling
    layer_control = folium.LayerControl(position='topright')
    layer_control.add_to(google_map)
    
    # Add custom CSS to make the layer control more prominent
    google_map.get_root().html.add_child(folium.Element(
        """
        <style>
        .leaflet-control-layers {
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            font-weight: bold;
        }
        .leaflet-control-layers label {
            font-size: 14px;
            margin: 5px 0;
            cursor: pointer;
        }
        .leaflet-control-layers label:hover {
            background-color: #f0f0f0;
            border-radius: 4px;
            padding: 2px 4px;
        }
        </style>
        """
    ))
    
    return google_map

def create_satellite_map(latitude, longitude, zoom_start=15):
    """
    Create a satellite-only map for the given coordinates.
    
    Args:
        latitude (float): Latitude coordinate
        longitude (float): Longitude coordinate
        zoom_start (int): Initial zoom level (default: 15)
    """
    
    print(f"Creating satellite map for coordinates: {latitude}, {longitude}")
    
    # Create a satellite-only map
    satellite_map = folium.Map(
        location=[latitude, longitude], 
        zoom_start=zoom_start,
        tiles='https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        attr='Google Satellite'
    )
    
    # Add a marker at the specified location
    folium.Marker(
        [latitude, longitude],
        popup=f"Location: {latitude}, {longitude}",
        tooltip="Click for coordinates",
        icon=folium.Icon(color='red', icon='info-sign')
    ).add_to(satellite_map)
    
    return satellite_map

def save_and_open_map(map_obj, filename):
    """
    Save the map as HTML and optionally open it in a browser.
    
    Args:
        map_obj: Folium map object
        filename (str): Name of the HTML file to save
    """
    map_obj.save(filename)
    print(f"Map saved as '{filename}'")
    
    # Try to open the file in the default browser
    try:
        webbrowser.open(f'file://{os.path.abspath(filename)}')
        print(f"Opened '{filename}' in your default browser")
    except Exception as e:
        print(f"Could not open browser automatically. Please open '{filename}' manually.")
        print(f"Error: {e}")

# def main():
#     """Main function to create and display maps."""
    
#     # Coordinates from user input
#     # user target location
#     latitude = 14.4428927
#     longitude = 101.3728028
    
#     print("=" * 50)
#     print("GOOGLE MAPS GENERATOR")
#     print("=" * 50)
#     print(f"Coordinates: {latitude}, {longitude}")
#     print(f"Latitude: {latitude}°")
#     print(f"Longitude: {longitude}°")
#     print("\nThis location appears to be in Thailand based on the coordinates.")
#     print("The coordinates are in decimal degrees format.")
#     print("=" * 50)
    
#     # Create Google Maps with multiple layers
#     google_map = create_google_maps(latitude, longitude,13)
#     save_and_open_map(google_map, 'google_map.html')
    
#     # Create satellite-only map
#     satellite_map = create_satellite_map(latitude, longitude)
#     # save_and_open_map(satellite_map, 'satellite_map.html')
    
#     print("\n" + "=" * 50)
#     print("MAPS CREATED SUCCESSFULLY!")
#     print("=" * 50)
#     print("Files created:")
#     print("- google_map.html (interactive with multiple layers)")
#     print("- satellite_map.html (satellite view only)")
#     print("\n" + "=" * 50)
#     print("HOW TO SWITCH MAP MODES:")
#     print("=" * 50)
#     print("In the google_map.html file, look for the layer control")
#     print("in the top-right corner of the map. You can switch between:")
#     print("🗺️ Street View - Standard map with roads and labels")
#     print("🛰️ Satellite - Aerial satellite imagery")
#     print("🗺️ Terrain - Topographic map with elevation")
#     print("🛰️ Hybrid - Satellite imagery with road labels")
#     print("\nBoth files should have opened in your browser automatically.")
#     print("If not, you can open them manually by double-clicking the HTML files.")

# if __name__ == "__main__":
#     main() 
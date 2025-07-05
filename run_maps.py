import folium
import webbrowser
import os
from fetch_data import call_api

def create_sellers_map_with_target(sellers_info, target_lat, target_lon, zoom_start=10):
    """
    Create Google Maps with markers for all sellers and target location.
    
    Args:
        sellers_info (list): List of seller information dictionaries
        target_lat (float): Target latitude
        target_lon (float): Target longitude
        zoom_start (int): Initial zoom level (default: 10)
    """
    
    if not sellers_info:
        print("No sellers data available")
        return None
    
    # Calculate center point (average of all coordinates including target)
    total_lat = target_lat
    total_lon = target_lon
    valid_coords = 1  # Start with target location
    
    for seller in sellers_info:
        if seller['location']['latitude'] and seller['location']['longitude']:
            total_lat += seller['location']['latitude']
            total_lon += seller['location']['longitude']
            valid_coords += 1
    
    center_lat = total_lat / valid_coords
    center_lon = total_lon / valid_coords
    
    print(f"Creating Google Maps with {len(sellers_info)} sellers + target location")
    print(f"Center coordinates: {center_lat}, {center_lon}")
    
    # Create Google Maps with multiple tile layers
    google_map = folium.Map(
        location=[center_lat, center_lon], 
        zoom_start=zoom_start,
        tiles='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        attr='Google Maps'
    )
    
    # Add target location marker (BLUE)
    folium.Marker(
        [target_lat, target_lon],
        popup=folium.Popup(f"""
        <div style="width: 400px; max-width: 100%;">
            <h4 style="margin: 0 0 10px 0; color: #0066cc;">🎯 TARGET LOCATION</h4>
            <p style="margin: 5px 0; font-size: 12px;"><strong>Coordinates:</strong></p>
            <p style="margin: 5px 0; font-size: 12px;">Latitude: {target_lat}</p>
            <p style="margin: 5px 0; font-size: 12px;">Longitude: {target_lon}</p>
        </div>
        """, max_width=300),
        tooltip="🎯 Your Target Location",
        icon=folium.Icon(color='blue', icon='flag')
    ).add_to(google_map)
    
    # Add markers for each seller with different colors
    accommodation_count = 0
    restaurant_count = 0
    
    for i, seller in enumerate(sellers_info, 1):
        lat = seller['location']['latitude']
        lon = seller['location']['longitude']
        
        if lat and lon:
            # Create seller images HTML
            seller_images_html = ""
            if seller['images']:
                seller_images_html = f"""
                <h6 style="margin: 10px 0 5px 0; color: #333;">📸 Seller Images:</h6>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
                """
                for img_url in seller['images'][:3]:  # Show first 3 images
                    seller_images_html += f"""
                    <img src="{img_url}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; cursor: pointer;" 
                         onerror="this.style.display='none';" 
                         onclick="showBigImage(this, '{img_url}')" 
                         onmouseout="hideBigImage()" 
                         alt="Seller image">
                    """
                seller_images_html += "</div>"
            
            # Determine if this is accommodation or restaurant based on business category
            is_restaurant = seller.get('business_category') == 'restaurant'
            
            # Create room details HTML (only for accommodations)
            room_details = ""
            if not is_restaurant:
                for room in seller['rooms']:
                    # Create room images HTML
                    room_images_html = ""
                    if room.get('images'):
                        room_images_html = f"""
                        <div style="display: flex; flex-wrap: wrap; gap: 3px; margin-top: 5px;">
                        """
                        for img_url in room['images'][:2]:  # Show first 2 images per room
                            room_images_html += f"""
                            <img src="{img_url}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 3px; border: 1px solid #ccc; cursor: pointer;" 
                                 onerror="this.style.display='none';" 
                                 onclick="showBigImage(this, '{img_url}')" 
                                 onmouseout="hideBigImage()" 
                                 alt="Room image">
                            """
                        room_images_html += "</div>"
                    
                    room_details += f"""
                    <div style="border: 1px solid #ddd;width: 250px; margin: 8px 0; padding: 10px; border-radius: 6px; background: #f9f9f9;">
                        <p style="margin: 2px 0; font-size: 11px;"><strong>🏠 {room.get('name', 'N/A')}</strong></p>
                        <p style="margin: 2px 0; font-size: 11px;">💰 Price: {room.get('price', 'N/A')} บาท</p>
                        <p style="margin: 2px 0; font-size: 11px;">🛏️ Rooms: {room.get('numberOfRoom', 'N/A')}</p>
                        {room_images_html}
                    </div>
                    """
            
            # Create popup content
            if is_restaurant:
                restaurant_count += 1
                icon_color = 'green'
                icon_symbol = '🍽️'
                title_color = '#00aa00'
                # Format address safely to avoid octal escape sequence issues
                address_no = str(seller['address']['no']).replace('\\', '/') if seller['address']['no'] else ''
                address_moo = str(seller['address']['moo']) if seller['address']['moo'] else ''
                
                popup_content = f"""
                <div style="width: 300px; max-height: 800px; overflow-y: auto;">
                    <h4 style="margin: 0 0 10px 0; color: {title_color};">🍽️ {seller['name_th']}</h4>
                    <p style="margin: 5px 0; font-size: 12px;"><strong>English:</strong> {seller['name_en']}</p>
                    <p style="margin: 5px 0; font-size: 12px;"><strong>Address:</strong> {address_no} หมู่ {address_moo}</p>
                    <p style="margin: 5px 0; font-size: 12px;"><strong>District:</strong> {seller['address']['district']}, {seller['address']['province']}</p>
                    <p style="margin: 5px 0; font-size: 12px;"><strong>📱 Mobile:</strong> {seller['contact']['mobile']}</p>
                    
                    <!-- Contact Links -->
                    <div style="margin: 10px 0;">
                        <h6 style="margin: 5px 0; color: #333;">📞 Contact Links:</h6>
                """
                    
                # Use pre-calculated contact URLs from fetch_data.py
                contact_urls = seller.get('contact_urls', {})
                
                # Add contact links to popup content
                if contact_urls.get('website'):
                    popup_content += f"""
                    <p style="margin: 3px 0; font-size: 11px;">
                        <a href="{contact_urls['website']}" target="_blank" style="color: #0066cc; text-decoration: none;">
                            🌐 Website : {contact_urls['website']}
                        </a>
                    </p>
                    """
                
                if contact_urls.get('facebook'):
                    popup_content += f"""
                    <p style="margin: 3px 0; font-size: 11px;">
                        <a href="{contact_urls['facebook']}" target="_blank" style="color: #1877f2; text-decoration: none;">
                            📘 Facebook : {contact_urls['facebook']}
                        </a>
                    </p>
                    """
                
                if contact_urls.get('instagram'):
                    popup_content += f"""
                    <p style="margin: 3px 0; font-size: 11px;">
                        <a href="{contact_urls['instagram']}" target="_blank" style="color: #e4405f; text-decoration: none;">
                            📷 Instagram : {contact_urls['instagram']}
                        </a>
                    </p>
                    """
                
                if contact_urls.get('line'):
                    popup_content += f"""
                    <p style="margin: 3px 0; font-size: 11px;">
                        <a href="{contact_urls['line']}" target="_blank" style="color: #00b900; text-decoration: none;">
                            💬 Line : {contact_urls['line']}
                        </a>
                    </p>
                    """
                
                popup_content += f"""
                </div>
                
                <p style="margin: 5px 0; font-size: 12px;"><strong>Images:</strong> {len(seller['images'])}</p>
                {seller_images_html}
            </div>
            """
            else:
                accommodation_count += 1
                icon_color = 'red'
                icon_symbol = '🏨'
                title_color = '#cc0000'
                # Format address safely to avoid octal escape sequence issues
                address_no = str(seller['address']['no']).replace('\\', '/') if seller['address']['no'] else ''
                address_moo = str(seller['address']['moo']) if seller['address']['moo'] else ''
                
                popup_content = f"""
                <div style="width: 300px; max-height: 800px; overflow-y: auto;">
                    <h4 style="margin: 0 0 10px 0; color: {title_color};">{icon_symbol} {seller['name_th']}</h4>
                    <p style="margin: 5px 0; font-size: 12px;"><strong>English:</strong> {seller['name_en']}</p>
                    <p style="margin: 5px 0; font-size: 12px;"><strong>Address:</strong> {address_no} หมู่ {address_moo}</p>
                    <p style="margin: 5px 0; font-size: 12px;"><strong>District:</strong> {seller['address']['district']}, {seller['address']['province']}</p>
                    <p style="margin: 5px 0; font-size: 12px;"><strong>📱 Mobile:</strong> {seller['contact']['mobile']}</p>
                    
                    <!-- Contact Links -->
                    <div style="margin: 10px 0;">
                        <h6 style="margin: 5px 0; color: #333;">📞 Contact Links:</h6>
                    """
                    
                # Use pre-calculated contact URLs from fetch_data.py
                contact_urls = seller.get('contact_urls', {})
                
                # Add contact links to popup content
                if contact_urls.get('website'):
                    popup_content += f"""
                    <p style="margin: 3px 0; font-size: 11px;">
                        <a href="{contact_urls['website']}" target="_blank" style="color: #0066cc; text-decoration: none;">
                            🌐 Website : {contact_urls['website']}
                        </a>
                    </p>
                    """
                
                if contact_urls.get('facebook'):
                    popup_content += f"""
                    <p style="margin: 3px 0; font-size: 11px;">
                        <a href="{contact_urls['facebook']}" target="_blank" style="color: #1877f2; text-decoration: none;">
                            📘 Facebook : {contact_urls['facebook']}
                        </a>
                    </p>
                    """
                
                if contact_urls.get('instagram'):
                    popup_content += f"""
                    <p style="margin: 3px 0; font-size: 11px;">
                        <a href="{contact_urls['instagram']}" target="_blank" style="color: #e4405f; text-decoration: none;">
                            📷 Instagram : {contact_urls['instagram']}
                        </a>
                    </p>
                    """
                
                if contact_urls.get('line'):
                    popup_content += f"""
                    <p style="margin: 3px 0; font-size: 11px;">
                        <a href="{contact_urls['line']}" target="_blank" style="color: #00b900; text-decoration: none;">
                            💬 Line : {contact_urls['line']}
                        </a>
                    </p>
                    """
                
                popup_content += f"""
                </div>
                
                <p style="margin: 5px 0; font-size: 12px;"><strong>Images:</strong> {len(seller['images'])}</p>
                {seller_images_html}
                <hr style="margin: 10px 0; border: 1px solid #ddd;">
                <h5 style="margin: 10px 0 5px 0; color: #333;">🏠 Available Rooms ({len(seller['rooms'])}):</h5>
                {room_details}
            </div>
            """
            
            # Add marker with popup
            folium.Marker(
                [lat, lon],
                popup=folium.Popup(popup_content, max_width=300),
                tooltip=f"{icon_symbol} #{i}: {seller['name_th']}",
                icon=folium.Icon(color=icon_color, icon='cutlery' if is_restaurant else 'home')
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
    
    # Add layer control
    layer_control = folium.LayerControl(position='topright')
    layer_control.add_to(google_map)
    
    # Add custom CSS and JavaScript for image hover functionality
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
        
        /* Big image overlay styles */
        .big-image-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            z-index: 10000;
            justify-content: center;
            align-items: center;
        }
        
        .big-image-container {
            position: relative;
            max-width: 800px;
            max-height: 600px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            overflow: hidden;
        }
        
        .big-image {
            width: 800px;
            height: 600px;
            object-fit: cover;
            display: block;
        }
        
        .close-button {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .close-button:hover {
            background: rgba(0, 0, 0, 0.9);
        }
        </style>
        
        <div id="bigImageOverlay" class="big-image-overlay" onclick="hideBigImage()">
            <div class="big-image-container" onclick="event.stopPropagation()">
                <button class="close-button" onclick="hideBigImage()">&times;</button>
                <img id="bigImage" class="big-image" src="" alt="Big image">
            </div>
        </div>
        
        <script>
        function showBigImage(element, imageUrl) {
            const overlay = document.getElementById('bigImageOverlay');
            const bigImage = document.getElementById('bigImage');
            
            bigImage.src = imageUrl;
            overlay.style.display = 'flex';
            
            // Add loading state
            bigImage.onload = function() {
                overlay.style.display = 'flex';
            };
            
            bigImage.onerror = function() {
                hideBigImage();
            };
        }
        
        function hideBigImage() {
            const overlay = document.getElementById('bigImageOverlay');
            overlay.style.display = 'none';
        }
        
        // Close overlay when pressing Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                hideBigImage();
            }
        });
        </script>
        """
    ))
    
    return google_map

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
#     """Main function to fetch data and create map with seller markers and target location."""
    
#     print("=" * 60)
#     print("SELLERS MAP WITH TARGET LOCATION")
#     print("=" * 60)
    
#     # User target location (from google_maps.py)
#     target_latitude = 14.4428927
#     target_longitude = 101.3728028
    
#     print(f"🎯 Target Location: {target_latitude}, {target_longitude}")
    
#     # Step 1: Fetch data from API
#     print("\nStep 1: Fetching seller data from API...")
    
#     # Define search parameters
#     search_provinces = [
#         "นครราชสีมา",
#         "นครนายก",
#         "ปราจีนบุรี"
#     ]
    
#     search_business_types = [
#         "500040001", #โรงแรม
#         "500040002", #โฮมเสตย์
#         "500040003", #รีสอร์ท
#         "500040004", #ที่พักรายวัน
#         # "500040005", #โฮสเทล
#         # "500040007" #หอพัก แมนชั่น
#     ]

#     search_restaurants = [
#         "50001", #ร้านอาหาร
#     ]
    
#     print(f"Searching provinces: {search_provinces}")
#     print(f"Business types: {len(search_business_types)} types")
#     print(f"Restaurant types: {len(search_restaurants)} types")
    
#     # Step 1a: Fetch accommodation data
#     print("\n--- Fetching Accommodation Data ---")
#     accommodation_response, accommodation_pagination, accommodation_sellers = call_api(
#         provinces=search_provinces,
#         business_types=search_business_types,
#         limit=20
#     )
    
#     # Step 1b: Fetch restaurant data
#     print("\n--- Fetching Restaurant Data ---")
#     restaurant_response, restaurant_pagination, restaurant_sellers = call_api(
#         provinces=search_provinces,
#         business_types=search_restaurants,
#         limit=20
#     )
    
#     # Combine all sellers
#     sellers_info = []
#     if accommodation_sellers:
#         sellers_info.extend(accommodation_sellers)
#     if restaurant_sellers:
#         sellers_info.extend(restaurant_sellers)
    
#     # Create combined pagination info
#     pagination = {
#         'accommodation': accommodation_pagination,
#         'restaurant': restaurant_pagination,
#         'totalSellers': len(sellers_info)
#     }
    
#     if not sellers_info:
#         print("❌ No seller data available. Please check your API connection.")
#         return
    
#     print(f"✅ Found {len(sellers_info)} sellers")
    
#     # Step 2: Create map with markers and target
#     print("\nStep 2: Creating interactive map with sellers and target location...")
#     google_map = create_sellers_map_with_target(sellers_info, target_latitude, target_longitude, zoom_start=10)
    
#     if google_map:
#         # Step 3: Save and open map
#         print("\nStep 3: Saving and opening map...")
#         save_and_open_map(google_map, 'sellers_with_target_map.html')
        
#         print("\n" + "=" * 60)
#         print("🎉 MAP CREATED SUCCESSFULLY!")
#         print("=" * 60)
#         print("📁 File created: sellers_with_target_map.html")
#         print(f"📍 Total sellers marked: {len(sellers_info)}")
#         print(f"🎯 Target location marked: {target_latitude}, {target_longitude}")
#         print("\n🗺️ Map Features:")
#         print("   • 🎯 BLUE marker: Your target location")
#         print("   • 🏨 RED markers: Accommodations (hotels, resorts, etc.)")
#         print("   • 🍽️ GREEN markers: Restaurants")
#         print("   • Click markers to see detailed information")
#         print("   • Multiple map layers (Street, Satellite, Terrain, Hybrid)")
#         print("   • Auto-centered on all locations")
#         print("\n💡 How to use:")
#         print("   • 🎯 Blue flag: Your target location")
#         print("   • 🏨 Red markers: Available accommodations")
#         print("   • 🍽️ Green markers: Restaurants")
#         print("   • Click any marker to see details")
#         print("   • Use layer control (top-right) to switch map views")
#         print("=" * 60)
#     else:
#         print("❌ Failed to create map")

# if __name__ == "__main__":
#     main() 
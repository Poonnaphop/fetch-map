#!/usr/bin/env python3
"""
Main configuration file for the Sellers Map application.
Edit the variables below to customize your search and target location.
"""

# =============================================================================
# USER CONFIGURATION VARIABLES
# EDIT THIS TO YOUR OWN API TOKEN AND API URL
# =============================================================================

# 🔑 API CONFIGURATION
API_URL = 'http://backend-api.tat.or.th/mobile/buyer/booking/sellers'
API_TOKEN = 'eyJraWQiOiIwU3p2OTIzQmV5WG04bms3Y1RZWnNwTGRMSE1sekR4WlBLNUhyRTRvcEJrPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxOTRhYzVlYy05MGYxLTcwMDYtYjZjNC02YzE2ZThlZjE2YzYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGhlYXN0LTEuYW1hem9uYXdzLmNvbVwvYXAtc291dGhlYXN0LTFfTHVUN2lVZGVEIiwiY2xpZW50X2lkIjoiNWNscjZlM3Jvcmw2YmJpMDR0bHZybmg1dWYiLCJvcmlnaW5fanRpIjoiZDU5NTUwYjctZWQxMS00MjBmLTgxYTItYTc1MDRkOTIyZWU1IiwiZXZlbnRfaWQiOiI1ODdlMDBmYS1kNDg5LTQzMWItYmNiYy0wNzQwZThhODZhZmMiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIiwiYXV0aF90aW1lIjoxNzUxNjkzOTk2LCJleHAiOjE3NTE3ODc0MzMsImlhdCI6MTc1MTcwMTAzMywianRpIjoiZmM4YmY5NDMtYWUzMC00NDNiLTgxMmYtNjU2NDMxZjU1ZmU4IiwidXNlcm5hbWUiOiIxNzMwMjAxMzgyNzE5In0.rxqJ60Er_ePfHtRVb4rGEkoe54WU2tAuIjTW2MW1MwYv6YLbM6exvcKYpdX686xR2AgGCkJIG5tNPbJOpfEH58zjdSeS-nEN_qZJ4DYOszlIF8Dv6gFr6fn67mcIMh7zm3Pi8KFK7Ifs1i2iNJideNOVBxADKVjdFrGNKKzGy74kYRtJ2CQRCo4-0xpy2tOWi0QHCBJp_TuWtHTA1ltTFIcVrziQNvxKGlCC1vWc8bR6DOglpyBsHfLNoiufXCixFu4Xt0p5Gmtc_lpmodNho7rC6F1s7wh_DZESpaD37wpYVPF4gvc6tf5AaOpGCgsY-zTCvqCIQwW3_HHyxc0Ajw'

# 🎯 TARGET LOCATION (Your desired location)
TARGET_LATITUDE = 14.4428927
TARGET_LONGITUDE = 101.3728028

# 🏨 ACCOMMODATION BUSINESS TYPES
ACCOMMODATION_TYPES = [
    "500040001",  # โรงแรม 
    "500040002",  # โฮมเสตย์ 
    "500040003",  # รีสอร์ท 
    "500040004",  # ที่พักรายวัน 
    # "500040005",  # โฮสเทล  UNCOMMENT THIS IF YOU WANT TO INCLUDE 
    # "500040007"   # หอพัก แมนชั่น  UNCOMMENT THIS IF YOU WANT TO INCLUDE 
]

# 📍 SEARCH PROVINCES (Thai province names)
SEARCH_PROVINCES = [
    "นครราชสีมา",
    "นครนายก", 
    "ปราจีนบุรี"
]

# 🍽️ RESTAURANT BUSINESS TYPES
RESTAURANT_TYPES = [
    # "50001",  # ร้านอาหาร 
]


# 🗺️ MAP SETTINGS
MAP_ZOOM_START = 10       # Initial zoom level (1-18)
OUTPUT_FILENAME = "sellers_with_target_map.html"  # Output HTML file name

# =============================================================================
# MAIN EXECUTION
# DO NOT EDIT THIS SECTION AND DO NOT CHANGE THE CODE BELOW
# =============================================================================

# 📊 SEARCH LIMITS
ACCOMMODATION_LIMIT = 20  # Number of accommodation results to fetch
RESTAURANT_LIMIT = 20     # Number of restaurant results to fetch

if __name__ == "__main__":
    # Import the main functionality from run_maps.py
    from run_maps import create_sellers_map_with_target, save_and_open_map
    from fetch_data import call_api
    
    print("=" * 60)
    print("🗺️ SELLERS MAP GENERATOR")
    print("=" * 60)
    print(f"🔑 API URL: {API_URL}")
    print(f"🎯 Target Location: {TARGET_LATITUDE}, {TARGET_LONGITUDE}")
    print(f"📍 Search Provinces: {', '.join(SEARCH_PROVINCES)}")
    print(f"🏨 Accommodation Types: {len(ACCOMMODATION_TYPES)} types")
    print(f"🍽️ Restaurant Types: {len(RESTAURANT_TYPES)} types")
    print("=" * 60)
    
    # Fetch accommodation data
    if ACCOMMODATION_TYPES:
        print("🏨 Fetching accommodation data...")
        accommodation_response, accommodation_pagination, accommodation_sellers = call_api(
            provinces=SEARCH_PROVINCES,
            business_types=ACCOMMODATION_TYPES,
            limit=ACCOMMODATION_LIMIT,
            api_url=API_URL,
            api_token=API_TOKEN,
            business_category='accommodation'
        )
    
    # Initialize variables for restaurant data
    restaurant_response = None
    restaurant_pagination = None
    restaurant_sellers = None
    
    # Fetch restaurant data only if restaurant types are defined
    if RESTAURANT_TYPES:
        print("📥 Fetching restaurant data...")
        restaurant_response, restaurant_pagination, restaurant_sellers = call_api(
            provinces=SEARCH_PROVINCES,
            business_types=RESTAURANT_TYPES,
            limit=RESTAURANT_LIMIT,
            api_url=API_URL,
            api_token=API_TOKEN,
            business_category='restaurant'
        )
    else:
        print("🍽️ Skipping restaurant data (no restaurant types defined)")
    
    # Combine all sellers
    sellers_info = []
    if accommodation_sellers:
        sellers_info.extend(accommodation_sellers)
    if restaurant_sellers:
        sellers_info.extend(restaurant_sellers)
    
    if not sellers_info:
        print("❌ No seller data available. Please check your configuration.")
        exit(1)
    
    print(f"✅ Found {len(sellers_info)} total sellers")
    
    # Create and save the map
    print("\n🗺️ Creating interactive map...")
    google_map = create_sellers_map_with_target(
        sellers_info, 
        TARGET_LATITUDE, 
        TARGET_LONGITUDE, 
        zoom_start=MAP_ZOOM_START
    )
    
    if google_map:
        save_and_open_map(google_map, OUTPUT_FILENAME)
        print(f"\n🎉 Map created successfully: {OUTPUT_FILENAME}")
    else:
        print("❌ Failed to create map") 